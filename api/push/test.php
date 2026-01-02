<?php
/**
 * Test endpoint for sending push notifications
 * This allows testing push notifications from the settings page
 */
require_once '../config.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    sendResponse(false, 'Method not allowed', null, 405);
}

try {
    $pdo = getDBConnection();
    
    // Check if table exists
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'push_subscriptions'");
        if ($checkTable->rowCount() == 0) {
            sendResponse(false, 'Push subscriptions table does not exist. Please enable push notifications first.', null, 400);
        }
    } catch (PDOException $e) {
        error_log('Error checking table: ' . $e->getMessage());
    }
    
    // Get user's push subscriptions
    $stmt = $pdo->prepare("
        SELECT endpoint, p256dh, auth 
        FROM push_subscriptions 
        WHERE user_id = ?
    ");
    $stmt->execute([$user['id']]);
    $subscriptions = $stmt->fetchAll();
    
    if (empty($subscriptions)) {
        sendResponse(false, 'No push subscriptions found. Please enable push notifications first.', null, 400);
    }
    
    // Include push sender helper
    require_once __DIR__ . '/push_sender.php';
    
    // Build test notification
    $title = 'Test Notification';
    $message = 'This is a test push notification from LetShare!';
    $notificationData = [
        'url' => '/Test.html',
        'itemId' => null,
        'conversationId' => null
    ];
    
    // Send to each subscription
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    $expiredEndpoints = [];
    
    foreach ($subscriptions as $subscription) {
        try {
            $result = sendPushToSubscription($subscription, $title, $message, $notificationData);
            
            if ($result['success']) {
                $successCount++;
            } else {
                $failCount++;
                $errorMsg = $result['message'] ?? 'Unknown error';
                $errors[] = $errorMsg;
                
                // If subscription is expired, mark it for deletion
                if (isset($result['expired']) && $result['expired'] && isset($result['endpoint'])) {
                    $expiredEndpoints[] = $result['endpoint'];
                }
            }
        } catch (Exception $e) {
            $failCount++;
            $errorMessage = $e->getMessage();
            $errors[] = $errorMessage;
            
            // Check if error indicates expired subscription
            if (strpos($errorMessage, '410') !== false || 
                strpos($errorMessage, 'Gone') !== false ||
                strpos($errorMessage, '404') !== false ||
                strpos($errorMessage, 'Not Found') !== false) {
                $expiredEndpoints[] = $subscription['endpoint'];
            }
        }
    }
    
    // Remove expired subscriptions from database
    if (!empty($expiredEndpoints)) {
        try {
            $placeholders = implode(',', array_fill(0, count($expiredEndpoints), '?'));
            $deleteStmt = $pdo->prepare("
                DELETE FROM push_subscriptions 
                WHERE user_id = ? AND endpoint IN ($placeholders)
            ");
            $deleteParams = array_merge([$user['id']], $expiredEndpoints);
            $deleteStmt->execute($deleteParams);
        } catch (PDOException $e) {
            error_log('Error removing expired subscriptions: ' . $e->getMessage());
        }
    }
    
    if ($successCount > 0) {
        sendResponse(true, "Test notification sent to {$successCount} device(s)", [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors
        ]);
    } else {
        sendResponse(false, 'Failed to send test notification: ' . implode(', ', $errors), [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors
        ], 500);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'push_test');
} catch (Exception $e) {
    handleError($e, 'push_test');
}

