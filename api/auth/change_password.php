<?php
/**
 * Change Password - Authenticated password change
 * Validates current password and updates to new one
 */

require_once __DIR__ . '/../config.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed', null, 405);
}

// Require authentication
$user = requireAuth();

// Require CSRF token
requireCSRFToken();

$data = getRequestData();
$currentPassword = $data['current_password'] ?? '';
$newPassword = $data['new_password'] ?? '';

if (empty($currentPassword) || empty($newPassword)) {
    sendResponse(false, 'Current password and new password are required', null, 400);
}

// Validate new password strength (minimum 6 characters)
if (strlen($newPassword) < 6) {
    sendResponse(false, 'New password must be at least 6 characters long', null, 400);
}

try {
    $pdo = getDBConnection();
    
    // Get user's current password hash
    $stmt = $pdo->prepare("SELECT id, password, auth_provider FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $userData = $stmt->fetch();
    
    if (!$userData) {
        sendResponse(false, 'User not found', null, 404);
    }
    
    // Check if user uses Google auth (no password set)
    if ($userData['auth_provider'] === 'google' && empty($userData['password'])) {
        sendResponse(false, 'Password change is not available for Google-authenticated accounts', null, 400);
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $userData['password'])) {
        sendResponse(false, 'Current password is incorrect', null, 401);
    }
    
    // Hash new password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$hashedPassword, $user['id']]);
    
    sendResponse(true, 'Password changed successfully');
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'change_password');
} catch (\Throwable $e) {
    sendResponse(false, 'An error occurred while changing password', null, 500);
}
