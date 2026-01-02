<?php
/**
 * Resend Email Verification
 * Allows users to request a new verification email if they didn't receive it
 */

require_once '../config.php';
require_once 'send_verification_email.php';

$data = getRequestData();
$email = trim($data['email'] ?? '');

if (empty($email)) {
    sendResponse(false, 'Email is required', null, 400);
}

try {
    $pdo = getDBConnection();
    
    // Find user by email
    $stmt = $pdo->prepare("
        SELECT id, name, email, email_verified, email_verification_token, email_verification_token_expires_at 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Don't reveal if email exists or not (security best practice)
        sendResponse(true, 'If this email is registered and not verified, a verification email has been sent.');
        exit();
    }
    
    // If already verified, don't send email
    if ($user['email_verified']) {
        sendResponse(true, 'This email is already verified.');
        exit();
    }
    
    // Generate new token
    $verificationToken = bin2hex(random_bytes(32));
    $verificationTokenExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Update user with new token
    $stmt = $pdo->prepare("
        UPDATE users 
        SET email_verification_token = ?, 
            email_verification_token_expires_at = ? 
        WHERE id = ?
    ");
    $stmt->execute([$verificationToken, $verificationTokenExpires, $user['id']]);
    
    // Send verification email
    $emailSent = sendVerificationEmail($user['email'], $user['name'], $verificationToken);
    
    if ($emailSent) {
        sendResponse(true, 'Verification email has been sent. Please check your inbox.');
    } else {
        sendResponse(false, 'Failed to send verification email. Please try again later.', null, 500);
    }
    
} catch (PDOException $e) {
    error_log('Resend verification error: ' . $e->getMessage());
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
}

