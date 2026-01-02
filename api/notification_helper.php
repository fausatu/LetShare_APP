<?php
/**
 * Helper functions for notifications
 * This file can be included in other API files without executing HTTP request handling
 */

/**
 * Create a notification in the database
 * @param PDO $pdo Database connection
 * @param int $userId User ID to notify
 * @param string $type Notification type (message, request, acceptance, etc.)
 * @param string $title Notification title
 * @param string $message Notification message
 * @param int|null $relatedItemId Related item ID (optional)
 * @param int|null $relatedConversationId Related conversation ID (optional)
 * @param int|null $relatedUserId Related user ID (optional)
 * @return int Notification ID
 */
function createNotification($pdo, $userId, $type, $title, $message = '', $relatedItemId = null, $relatedConversationId = null, $relatedUserId = null) {
    try {
        error_log('createNotification called with params: userId=' . $userId . ', type=' . $type . ', title=' . $title);
        
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, related_item_id, related_conversation_id, related_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([$userId, $type, $title, $message, $relatedItemId, $relatedConversationId, $relatedUserId]);
        
        if (!$result) {
            $errorInfo = $stmt->errorInfo();
            error_log('Error executing notification insert: ' . print_r($errorInfo, true));
            throw new Exception('Failed to insert notification: ' . $errorInfo[2]);
        }
        
        $notificationId = $pdo->lastInsertId();
        error_log('Notification inserted successfully with ID: ' . $notificationId);
        
        // Send push notification if user has subscribed
        try {
            sendPushNotification($pdo, $userId, $title, $message, $relatedItemId, $relatedConversationId);
        } catch (Exception $e) {
            error_log('Error sending push notification: ' . $e->getMessage());
            // Don't fail the notification creation if push fails
        }
        
        return $notificationId;
    } catch (PDOException $e) {
        error_log('PDO Exception in createNotification: ' . $e->getMessage());
        throw $e;
    } catch (Exception $e) {
        error_log('Exception in createNotification: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Send push notification to user's devices
 * @param PDO $pdo Database connection
 * @param int $userId User ID
 * @param string $title Notification title
 * @param string $message Notification message
 * @param int|null $itemId Related item ID
 * @param int|null $conversationId Related conversation ID
 */
function sendPushNotification($pdo, $userId, $title, $message, $itemId = null, $conversationId = null) {
    try {
        // Get user's push subscriptions
        $stmt = $pdo->prepare("
            SELECT endpoint, p256dh, auth 
            FROM push_subscriptions 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $subscriptions = $stmt->fetchAll();
        
        if (empty($subscriptions)) {
            return; // No subscriptions, nothing to send
        }
        
        // Build notification URL - use relative path (works with both localhost and ngrok)
        $url = '/Test.html';
        if ($itemId) {
            $url .= '?item=' . $itemId;
        } else if ($conversationId) {
            $url .= '?conversation=' . $conversationId;
        }
        
        // Include push sender helper
        require_once __DIR__ . '/push/push_sender.php';
        
        // Build notification data
        // Note: URL is relative, Service Worker will use current origin (works with ngrok)
        $notificationData = [
            'url' => $url,
            'itemId' => $itemId,
            'conversationId' => $conversationId
        ];
        
        // Send to each subscription
        $successCount = 0;
        $failCount = 0;
        
        foreach ($subscriptions as $subscription) {
            try {
                $result = sendPushToSubscription($subscription, $title, $message, $notificationData);
                
                if ($result['success']) {
                    $successCount++;
                    error_log('Push notification sent successfully to: ' . $subscription['endpoint']);
                } else {
                    $failCount++;
                    error_log('Push notification failed for: ' . $subscription['endpoint'] . ' - ' . ($result['message'] ?? 'Unknown error'));
                    
                    // If subscription is invalid (410 Gone), remove it
                    if (strpos($result['message'] ?? '', '410') !== false || 
                        strpos($result['message'] ?? '', 'Gone') !== false) {
                        $deleteStmt = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
                        $deleteStmt->execute([$subscription['endpoint']]);
                        error_log('Removed invalid subscription: ' . $subscription['endpoint']);
                    }
                }
            } catch (Exception $e) {
                $failCount++;
                error_log('Exception sending push to ' . $subscription['endpoint'] . ': ' . $e->getMessage());
            }
        }
        
        error_log("Push notifications sent: {$successCount} success, {$failCount} failed");
        
    } catch (Exception $e) {
        error_log('Error in sendPushNotification: ' . $e->getMessage());
        // Don't throw - we don't want to fail notification creation if push fails
    }
}

