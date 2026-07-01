<?php
require_once 'config.php';
require_once 'pusher_config.php';

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
            // Get all conversations for current user
            $userId = $user['id'];
            
            $stmt = $pdo->prepare("
                SELECT c.*,
                       i.title as item_title,
                       i.type as item_type,
                       i.image as item_image,
                       i.color as item_color,
                       i.status as item_status,
                       owner.name as owner_name,
                       owner.avatar as owner_avatar,
                       requester.name as requester_name,
                       requester.avatar as requester_avatar,
                       (SELECT COALESCE(text, CASE WHEN image IS NOT NULL THEN '📷 Photo' ELSE NULL END) FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                       (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND to_user_id = ? AND read_status = 0) as unread_count
                FROM conversations c
                INNER JOIN items i ON c.item_id = i.id
                INNER JOIN users owner ON c.owner_id = owner.id
                INNER JOIN users requester ON c.requester_id = requester.id
                WHERE (c.owner_id = ? OR c.requester_id = ?)
                AND (
                    (c.owner_id = ? AND c.hidden_by_owner = 0)
                    OR (c.requester_id = ? AND c.hidden_by_requester = 0)
                    OR c.status IN ('completed', 'rejected', 'cancelled')
                )
                AND NOT EXISTS (
                    SELECT 1 FROM blocked_users bu
                    WHERE (bu.blocking_user_id = ? AND bu.blocked_user_id = IF(c.owner_id = ?, c.requester_id, c.owner_id))
                       OR (bu.blocked_user_id = ? AND bu.blocking_user_id = IF(c.owner_id = ?, c.requester_id, c.owner_id))
                )
                ORDER BY c.updated_at DESC
            ");
            $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId]);
            $conversations = $stmt->fetchAll();
            
            // Format conversations
            $formattedConversations = array_map(function($conv) use ($userId) {
                $otherUser = $conv['owner_id'] == $userId ? $conv['requester_name'] : $conv['owner_name'];
                $isOwner = $conv['owner_id'] == $userId;
                
                // Get the avatar of the other user
                $otherUserAvatar = $isOwner ? $conv['requester_avatar'] : $conv['owner_avatar'];
                // Ensure avatar is not empty or null
                if (empty($otherUserAvatar)) {
                    $otherUserAvatar = null;
                }
                
                $status = $conv['status'] ?? 'pending';
                $itemStatus = $conv['item_status'] ?? 'active';
                $itemTitle = $conv['item_title'];
                
                // If item is deleted, show appropriate message
                if ($itemStatus === 'deleted') {
                    $itemTitle = 'Item No Longer Available';
                }
                
                
                return [
                    'id' => 'conv_' . $conv['item_id'] . '_' . ($isOwner ? $conv['requester_id'] : $conv['owner_id']),
                    'dbId' => (int)$conv['id'], // Add database ID for API calls
                    'itemId' => (int)$conv['item_id'],
                    'itemTitle' => $itemTitle,
                    'itemType' => $conv['item_type'],
                    'itemImage' => $conv['item_image'] ?? '',
                    'itemColor' => $conv['item_color'] ?? '',
                    'itemStatus' => $itemStatus, // Add item status
                    'owner' => $conv['owner_name'],
                    'ownerId' => (int)$conv['owner_id'], // Add ownerId for reviews
                    'requester' => $conv['requester_name'],
                    'requesterId' => (int)$conv['requester_id'], // Add requesterId for reviews
                    'otherUser' => $otherUser,
                    'otherUserAvatar' => $otherUserAvatar, // Add other user's avatar
                    'isOwner' => $isOwner,
                    'lastMessage' => $conv['last_message'] ?? 'No messages yet',
                    'lastUpdate' => $conv['last_message_time'] ?? $conv['updated_at'],
                    'status' => $status,
                    'unreadCount' => (int)$conv['unread_count'],
                    'ownerConfirmedAt' => $conv['owner_confirmed_at'] ?? null,
                    'requesterConfirmedAt' => $conv['requester_confirmed_at'] ?? null,
                    'hidden' => $isOwner ? (bool)($conv['hidden_by_owner'] ?? false) : (bool)($conv['hidden_by_requester'] ?? false)
                ];
            }, $conversations);
            
            foreach ($formattedConversations as $fc) {
            }
            
            sendResponse(true, 'Conversations retrieved', $formattedConversations);
            break;
            
        case 'POST':
            // Create new message or conversation
            $data = getRequestData();
            $itemId = $data['item_id'] ?? null;
            $messageText = trim($data['message'] ?? '');
            
            
            if (!$itemId || empty($messageText)) {
                sendResponse(false, 'Item ID and message are required', null, 400);
            }
            
            // Get item and owner
            $stmt = $pdo->prepare("SELECT user_id FROM items WHERE id = ? AND status = 'active'");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            if (!$item) {
                sendResponse(false, 'Item not found', null, 404);
            }
            
            if ($item['user_id'] == $user['id']) {
                sendResponse(false, 'You cannot request your own item', null, 400);
            }
            
            $ownerId = $item['user_id'];
            $requesterId = $user['id'];
            
            // Check if either user has blocked the other
            $stmt = $pdo->prepare("
                SELECT id FROM blocked_users 
                WHERE (blocking_user_id = ? AND blocked_user_id = ?) 
                   OR (blocking_user_id = ? AND blocked_user_id = ?)
            ");
            $stmt->execute([$requesterId, $ownerId, $ownerId, $requesterId]);
            if ($stmt->fetch()) {
                sendResponse(false, 'You cannot contact this user', null, 403);
            }
            
            
            // Check if conversation already exists (any status)
            $stmt = $pdo->prepare("
                SELECT id, status FROM conversations 
                WHERE item_id = ? AND owner_id = ? AND requester_id = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $stmt->execute([$itemId, $ownerId, $requesterId]);
            $existingConv = $stmt->fetch();
            
            $conversationId = null;
            
            if ($existingConv) {
                $conversationId = $existingConv['id'];
                $existingStatus = $existingConv['status'];
                
                
                // If conversation is rejected or cancelled, update it to pending (reactivate)
                if ($existingStatus === 'rejected' || $existingStatus === 'cancelled') {
                    $stmt = $pdo->prepare("
                        UPDATE conversations 
                        SET status = 'pending', hidden_by_owner = 0, hidden_by_requester = 0, hidden_at_owner = NULL, hidden_at_requester = NULL, updated_at = NOW() 
                        WHERE id = ?
                    ");
                    $stmt->execute([$conversationId]);
                } else if ($existingStatus === 'pending' || $existingStatus === 'accepted') {
                    // If pending or accepted, use existing conversation
                } else {
                    // For completed conversations, create a new one
                    $stmt = $pdo->prepare("
                        INSERT INTO conversations (item_id, owner_id, requester_id, status) 
                        VALUES (?, ?, ?, 'pending')
                    ");
                    $stmt->execute([$itemId, $ownerId, $requesterId]);
                    $conversationId = $pdo->lastInsertId();
                }
            } else {
                // No existing conversation, create new one
                $stmt = $pdo->prepare("
                    INSERT INTO conversations (item_id, owner_id, requester_id, status) 
                    VALUES (?, ?, ?, 'pending')
                ");
                $stmt->execute([$itemId, $ownerId, $requesterId]);
                $conversationId = $pdo->lastInsertId();
            }
            
            // Create message - read_status = 0 means UNREAD for the recipient
            $stmt = $pdo->prepare("
                INSERT INTO messages (conversation_id, from_user_id, to_user_id, text, read_status) 
                VALUES (?, ?, ?, ?, 0)
            ");
            $stmt->execute([$conversationId, $requesterId, $ownerId, $messageText]);
            $messageId = $pdo->lastInsertId();
            
            // Trigger Pusher event for real-time message
            triggerNewMessage($conversationId, [
                'id' => (int)$messageId,
                'conversationId' => (int)$conversationId,
                'from_user_id' => (int)$requesterId,
                'to_user_id' => (int)$ownerId,
                'text' => $messageText,
                'timestamp' => date('Y-m-d H:i:s'),
                'read' => false
            ]);
            
            // Update conversation updated_at
            $stmt = $pdo->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
            $stmt->execute([$conversationId]);
            
            // Create notification for item owner (new request received)
            
            // Load notification helper (separate file to avoid HTTP request handling)
            $notificationHelperPath = __DIR__ . '/notification_helper.php';
            
            if (file_exists($notificationHelperPath)) {
                require_once $notificationHelperPath;
                
                // Check if function exists
                if (function_exists('createNotification')) {
                } else {
                }
            } else {
            }
            
            $itemTitle = '';
            $itemType = '';
            $stmt = $pdo->prepare("SELECT title, type FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            if ($item) {
                $itemTitle = $item['title'];
                $itemType = $item['type']; // 'donation' or 'exchange'
            }
            
            $requesterName = '';
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$requesterId]);
            $requester = $stmt->fetch();
            if ($requester) {
                $requesterName = $requester['name'];
            }
            
            // Get owner's language for notification
            $ownerLang = getUserLanguage($pdo, $ownerId);
            
            $notificationTitle = getNotifText('new_request', $ownerLang);
            if ($itemType === 'donation') {
                $notificationMessage = getNotifText('interested_in_donation', $ownerLang, ['name' => $requesterName, 'item' => $itemTitle]);
            } else {
                $notificationMessage = getNotifText('interested_in_loan', $ownerLang, ['name' => $requesterName, 'item' => $itemTitle]);
            }
            
            
            // Only create notification if this is a new conversation or if we reactivated a rejected one
            $isNewOrReactivated = !$existingConv || ($existingConv && $existingConv['status'] === 'rejected');
            if ($isNewOrReactivated) {
                try {
                    if (!function_exists('createNotification')) {
                    } else {
                        $notificationId = createNotification($pdo, $ownerId, 'request', $notificationTitle, $notificationMessage, $itemId, $conversationId, $requesterId);
                    }
                } catch (Exception $e) {
                } catch (Error $e) {
                }
            } else {
                // For existing conversations, create a message notification
                try {
                    if (!function_exists('createNotification')) {
                    } else {
                        $messageNotificationTitle = getNotifText('new_message', $ownerLang);
                        $notificationId = createNotification($pdo, $ownerId, 'message', $messageNotificationTitle, $messageText, $itemId, $conversationId, $requesterId);
                    }
                } catch (Exception $e) {
                } catch (Error $e) {
                }
            }
            
            
            sendResponse(true, 'Message sent successfully', [
                'conversation_id' => $conversationId,
                'message_id' => $pdo->lastInsertId()
            ], 201);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'messages');
}

