<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

// Require CSRF token for state-changing requests
if ($method !== 'GET') {
    requireCSRFToken();
}

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get user's notifications
            $limit = (int)($_GET['limit'] ?? 50);
            $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';
            
            $sql = "SELECT * FROM notifications WHERE user_id = ?";
            $params = [$user['id']];
            
            if ($unreadOnly) {
                $sql .= " AND read_status = FALSE";
            }
            
            $sql .= " ORDER BY created_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format notifications to ensure consistent data types
            $formattedNotifications = array_map(function($notif) {
                return [
                    'id' => (int)$notif['id'],
                    'user_id' => (int)$notif['user_id'],
                    'type' => $notif['type'],
                    'title' => $notif['title'],
                    'message' => $notif['message'] ?? '',
                    'related_item_id' => $notif['related_item_id'] ? (int)$notif['related_item_id'] : null,
                    'related_conversation_id' => $notif['related_conversation_id'] ? (int)$notif['related_conversation_id'] : null,
                    'related_user_id' => $notif['related_user_id'] ? (int)$notif['related_user_id'] : null,
                    'read_status' => (bool)$notif['read_status'],
                    'created_at' => $notif['created_at']
                ];
            }, $notifications);
            
            // Get unread count
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = FALSE");
            $stmt->execute([$user['id']]);
            $unreadCount = $stmt->fetch()['count'];
            
            sendResponse(true, 'Notifications retrieved', [
                'notifications' => $formattedNotifications,
                'unread_count' => (int)$unreadCount
            ]);
            break;
            
        case 'PUT':
            // Mark notifications as read
            $data = getRequestData();
            $notificationIds = $data['notification_ids'] ?? [];
            $markAllAsRead = isset($data['mark_all_as_read']) && $data['mark_all_as_read'] === true;
            
            if ($markAllAsRead) {
                $stmt = $pdo->prepare("UPDATE notifications SET read_status = TRUE WHERE user_id = ?");
                $stmt->execute([$user['id']]);
            } elseif (!empty($notificationIds) && is_array($notificationIds)) {
                $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
                $stmt = $pdo->prepare("UPDATE notifications SET read_status = TRUE WHERE id IN ($placeholders) AND user_id = ?");
                $params = array_merge($notificationIds, [$user['id']]);
                $stmt->execute($params);
            } else {
                sendResponse(false, 'Invalid request', null, 400);
            }
            
            sendResponse(true, 'Notifications marked as read');
            break;
            
        case 'DELETE':
            // Delete notification
            $notificationId = $_GET['id'] ?? null;
            
            if (!$notificationId) {
                sendResponse(false, 'Notification ID required', null, 400);
            }
            
            $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
            $stmt->execute([$notificationId, $user['id']]);
            
            sendResponse(true, 'Notification deleted');
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'notifications');
}

/**
 * Helper function to create a notification
 * This can be called from other API files
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
        return $notificationId;
    } catch (PDOException $e) {
        error_log('PDO Exception in createNotification: ' . $e->getMessage());
        throw $e;
    } catch (Exception $e) {
        error_log('Exception in createNotification: ' . $e->getMessage());
        throw $e;
    }
}

