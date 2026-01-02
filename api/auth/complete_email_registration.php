<?php
/**
 * Complete Email Registration
 * Creates a new user account after email code verification
 */

require_once '../config.php';
require_once 'validate_university_email.php';

$data = getRequestData();
$email = trim($data['email'] ?? '');
$name = trim($data['name'] ?? '');
$department = trim($data['department'] ?? '');
$language = $data['language'] ?? 'fr';

// Validation
if (empty($email) || empty($name) || empty($department)) {
    sendResponse(false, 'Name, email, and department are required', null, 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format', null, 400);
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if we have pending registration data from email verification
if (!isset($_SESSION['pending_email_registration']) || $_SESSION['pending_email_registration']['email'] !== $email) {
    sendResponse(false, 'Email verification session expired. Please start over.', null, 400);
}

$pendingData = $_SESSION['pending_email_registration'];
$universityId = $pendingData['university_id'];

try {
    $pdo = getDBConnection();
    
    // Check if email already exists (should not happen, but check anyway)
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Email already registered', null, 409);
    }
    
    // Create new user (email verified automatically since they received the code)
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password, department, university_id, language, auth_provider, email_verified) 
        VALUES (?, ?, NULL, ?, ?, ?, 'email', 1)
    ");
    $stmt->execute([$name, $email, $department, $universityId, $language]);
    
    $userId = $pdo->lastInsertId();
    
    // Create session
    $_SESSION['user_id'] = $userId;
    $_SESSION['email'] = $email;
    $_SESSION['token'] = bin2hex(random_bytes(32));
    
    // Clear pending registration data
    unset($_SESSION['pending_email_registration']);
    
    // Get created user
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.department, u.avatar, u.language, u.university_id, u.email_verified,
               univ.name as university_name, univ.code as university_code, univ.logo as university_logo
        FROM users u
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $newUser = $stmt->fetch();
    
    sendResponse(true, 'Account created and logged in successfully', [
        'user' => $newUser,
        'token' => $_SESSION['token']
    ]);
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'complete_email_registration');
} catch (Exception $e) {
    handleError($e, 'complete_email_registration');
}

