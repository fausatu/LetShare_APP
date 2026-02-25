<?php
/**
 * Verify Email Code for Login
 * Verifies the 6-digit code and logs the user in or creates a new account
 */

// Start output buffering to prevent any output before JSON
ob_start();

// Disable error display to prevent warnings/notices from corrupting JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/validate_university_email.php';

// Clear any output that might have been generated
ob_clean();

try {
    // Rate limiting: 5 attempts per 15 minutes per IP for code verification
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!applyRateLimit('email_code_verify', 5, 900, $clientIP, 'Too many attempts. Please try again in {minutes} minute(s).')) {
        exit;
    }
    
    $data = getRequestData();
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');

// Clean code: remove all non-digit characters (spaces, dashes, etc.)
$code = preg_replace('/\D/', '', $code);

if (empty($email) || empty($code)) {
    sendResponse(false, 'Email and code are required', null, 400);
}

// Validate code format (must be exactly 6 digits)
if (!preg_match('/^\d{6}$/', $code)) {
    sendResponse(false, 'Invalid code format. Code must contain exactly 6 digits.', null, 400);
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Debug: Log session data
error_log('Verify code - Session ID: ' . session_id());
error_log('Verify code - Session keys: ' . (isset($_SESSION) ? implode(', ', array_keys($_SESSION)) : 'Session not set'));
if (isset($_SESSION['email_code'])) {
    error_log('Verify code - Stored code: ' . $_SESSION['email_code']);
    error_log('Verify code - Stored email: ' . ($_SESSION['email_code_email'] ?? 'not set'));
}
error_log('Verify code - Received code: ' . $code);
error_log('Verify code - Received email: ' . $email);

// Verify code from session
if (!isset($_SESSION['email_code']) || 
    !isset($_SESSION['email_code_email']) || 
    !isset($_SESSION['email_code_expires'])) {
    error_log('Email code verification: Session data missing. Session keys: ' . (isset($_SESSION) ? implode(', ', array_keys($_SESSION)) : 'Session not set'));
    sendResponse(false, 'No code found. Please request a new code.', null, 400);
}

// Check if code has expired
if (time() > $_SESSION['email_code_expires']) {
    unset($_SESSION['email_code']);
    unset($_SESSION['email_code_email']);
    unset($_SESSION['email_code_expires']);
    sendResponse(false, 'Code has expired. Please request a new code.', null, 400);
}

// Verify email matches
if ($_SESSION['email_code_email'] !== $email) {
    sendResponse(false, 'Email does not match', null, 400);
}

// Verify code
if ($_SESSION['email_code'] !== $code) {
    error_log('Email code verification failed. Expected: ' . $_SESSION['email_code'] . ', Received: ' . $code);
    sendResponse(false, 'Invalid code. Please check and try again.', null, 400);
}

try {
    $pdo = getDBConnection();
    
    // Check if user exists
    $stmt = $pdo->prepare("
        SELECT id, name, email, department, avatar, language, university_id, email_verified
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        // User exists - log them in
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $_SESSION['user_id'] = $existingUser['id'];
        $_SESSION['email'] = $existingUser['email'];
        $_SESSION['token'] = bin2hex(random_bytes(32));
        
        // Clear email code from session
        unset($_SESSION['email_code']);
        unset($_SESSION['email_code_email']);
        unset($_SESSION['email_code_expires']);
        
        sendResponse(true, 'Login successful', [
            'user' => $existingUser,
            'token' => $_SESSION['token']
        ]);
    } else {
        // New user - validate university email and get university_id
        $emailValidation = validateUniversityEmail($email);
        if (!$emailValidation['valid']) {
            sendResponse(false, $emailValidation['message'], null, 400);
        }
        
        // Store email validation data in session for later use
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['pending_email_registration'] = [
            'email' => $email,
            'university_id' => $emailValidation['university_id'],
            'university_name' => $emailValidation['university_name'] ?? '',
            'university_code' => $emailValidation['university_code'] ?? ''
        ];
        
        // Clear email code from session (code is verified)
        unset($_SESSION['email_code']);
        unset($_SESSION['email_code_email']);
        unset($_SESSION['email_code_expires']);
        
        // Return indication that user needs to complete registration
        sendResponse(true, 'Code verified. Please complete your registration.', [
            'is_new_user' => true,
            'email' => $email
        ]);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'verify_email_code_inner');
} catch (Exception $e) {
    handleError($e, 'verify_email_code_inner');
}

} catch (PDOException $e) {
    error_log('Verify email code PDO error: ' . $e->getMessage());
    sendResponse(false, 'Database error. Please try again later.', null, 500);
} catch (Exception $e) {
    error_log('Verify email code error: ' . $e->getMessage());
    sendResponse(false, 'Error verifying. Please try again.', null, 500);
}

