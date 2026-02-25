<?php
require_once 'config.php';

// Check authentication
requireAuth();

// Require CSRF token
requireCSRFToken();

$userId = $_SESSION['user_id'];

try {
    $pdo = getDBConnection();
    
    // Update terms acceptance
    $termsAcceptedAt = date('Y-m-d H:i:s');
    $termsVersion = TERMS_VERSION;
    
    $stmt = $pdo->prepare("UPDATE users SET terms_accepted_at = ?, terms_version = ? WHERE id = ?");
    $stmt->execute([$termsAcceptedAt, $termsVersion, $userId]);
    
    sendResponse(true, 'Terms accepted successfully', [
        'terms_accepted_at' => $termsAcceptedAt,
        'terms_version' => $termsVersion
    ]);
} catch (PDOException $e) {
    error_log("Database error in accept-terms.php: " . $e->getMessage());
    sendResponse(false, 'Database error', null, 500);
}
