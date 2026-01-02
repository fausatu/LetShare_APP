<?php
/**
 * Reset Password - Reset password with token
 * Validates the reset token and updates the password
 */

require_once '../config.php';

$data = getRequestData();
$token = trim($data['token'] ?? '');
$newPassword = $data['password'] ?? '';

if (empty($token) || empty($newPassword)) {
    sendResponse(false, 'Token and password are required', null, 400);
}

// Validate password strength (minimum 6 characters)
if (strlen($newPassword) < 6) {
    sendResponse(false, 'Password must be at least 6 characters long', null, 400);
}

try {
    $pdo = getDBConnection();
    
    // Find user by reset token
    $stmt = $pdo->prepare("
        SELECT id, email, password_reset_expires_at 
        FROM users 
        WHERE password_reset_token = ? 
        AND password_reset_expires_at > NOW()
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendResponse(false, 'Invalid or expired reset token', null, 400);
    }
    
    // Hash new password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password and clear reset token
    $stmt = $pdo->prepare("
        UPDATE users 
        SET password = ?, 
            password_reset_token = NULL, 
            password_reset_expires_at = NULL,
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$hashedPassword, $user['id']]);
    
    sendResponse(true, 'Password has been reset successfully. You can now login with your new password.');
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'reset_password');
}

