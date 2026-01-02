<?php
/**
 * Email Verification Endpoint
 * This endpoint verifies the email when user clicks the link in the verification email
 */

require_once '../config.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    // Redirect to error page
    header('Location: ../../email_verification.php?status=error&message=' . urlencode('Verification token is missing'));
    exit();
}

try {
    $pdo = getDBConnection();
    
    // Decode token (in case it was double-encoded)
    $token = urldecode($token);
    
    // Find user with this token
    $stmt = $pdo->prepare("
        SELECT id, email, name, email_verified, email_verification_token_expires_at 
        FROM users 
        WHERE email_verification_token = ? 
        AND email_verified = 0
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Token not found or already verified
        header('Location: ../../email_verification.php?status=error&message=' . urlencode('Invalid or expired verification token'));
        exit();
    }
    
    // Check if token has expired
    if (strtotime($user['email_verification_token_expires_at']) < time()) {
        // Token expired - generate new one
        $newToken = bin2hex(random_bytes(32));
        $newExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));
        
        $stmt = $pdo->prepare("
            UPDATE users 
            SET email_verification_token = ?, 
                email_verification_token_expires_at = ? 
            WHERE id = ?
        ");
        $stmt->execute([$newToken, $newExpires, $user['id']]);
        
        // Resend verification email
        require_once 'send_verification_email.php';
        sendVerificationEmail($user['email'], $user['name'], $newToken);
        
        header('Location: ../../email_verification.php?status=expired&message=' . urlencode('Your verification link has expired. A new verification email has been sent to your inbox.'));
        exit();
    }
    
    // Verify the email
    $stmt = $pdo->prepare("
        UPDATE users 
        SET email_verified = 1, 
            email_verification_token = NULL, 
            email_verification_token_expires_at = NULL 
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    
    // Create session for the user
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['token'] = bin2hex(random_bytes(32));
    
    // Redirect to success page
    header('Location: ../../email_verification.php?status=success&message=' . urlencode('Your email has been verified successfully!'));
    exit();
    
} catch (PDOException $e) {
    error_log('Email verification error: ' . $e->getMessage());
    header('Location: ../../email_verification.php?status=error&message=' . urlencode('An error occurred during verification. Please try again.'));
    exit();
}

