<?php
require_once '../config.php';

$user = requireAuth();

// Require CSRF token for POST request
requireCSRFToken();

$data = getRequestData();
$userId = $data['userId'] ?? $user['id'];

try {
    $pdo = getDBConnection();
    
    // Check if table exists first
    $checkTable = $pdo->query("SHOW TABLES LIKE 'push_subscriptions'");
    if ($checkTable->rowCount() > 0) {
        $stmt = $pdo->prepare("DELETE FROM push_subscriptions WHERE user_id = ?");
        $stmt->execute([(int)$userId]);
        error_log('Push subscription removed for user ' . $userId);
    }
    
    sendResponse(true, 'Push subscription removed');
} catch (PDOException $e) {
    handleDatabaseError($e, 'push_unsubscribe');
} catch (Exception $e) {
    handleError($e, 'push_unsubscribe');
}

