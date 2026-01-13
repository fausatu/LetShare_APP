<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    $conversationId = $_GET['id'] ?? null;
    
    switch ($method) {
        case 'GET':
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            // Handle conversation ID format: either numeric DB ID or 'conv_itemId_userId' format
            $dbConversationId = null;
            if (is_numeric($conversationId)) {
                $dbConversationId = (int)$conversationId;
            } else if (strpos($conversationId, 'conv_') === 0) {
                // Parse format: conv_itemId_userId
                $parts = explode('_', $conversationId);
                if (count($parts) === 3) {
                    $itemId = (int)$parts[1];
                    $otherUserId = (int)$parts[2];
                    
                    // Find conversation by item_id and user IDs
                    $stmt = $pdo->prepare("
                        SELECT c.*
                        FROM conversations c
                        WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                        AND (c.owner_id = ? OR c.requester_id = ?)
                        LIMIT 1
                    ");
                    $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                    $conv = $stmt->fetch();
                    if ($conv) {
                        $dbConversationId = $conv['id'];
                    }
                }
            }
            
            if (!$dbConversationId) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // Get conversation details (include deleted items for history)
            $stmt = $pdo->prepare("
                SELECT c.*,
                       i.title as item_title,
                       i.type as item_type,
                       i.status as item_status,
                       owner.name as owner_name,
                       owner.last_seen as owner_last_seen,
                       requester.name as requester_name,
                       requester.last_seen as requester_last_seen
                FROM conversations c
                INNER JOIN items i ON c.item_id = i.id
                INNER JOIN users owner ON c.owner_id = owner.id
                INNER JOIN users requester ON c.requester_id = requester.id
                WHERE c.id = ? AND (c.owner_id = ? OR c.requester_id = ?)
            ");
            $stmt->execute([$dbConversationId, $user['id'], $user['id']]);
            $conversation = $stmt->fetch();
            
            if (!$conversation) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // If item is deleted, show appropriate message
            if ($conversation['item_status'] === 'deleted') {
                $conversation['item_title'] = 'Item No Longer Available';
            }
            
            // Get all messages in conversation
            $stmt = $pdo->prepare("
                SELECT m.*,
                       from_user.name as from_name,
                       to_user.name as to_name
                FROM messages m
                INNER JOIN users from_user ON m.from_user_id = from_user.id
                INNER JOIN users to_user ON m.to_user_id = to_user.id
                WHERE m.conversation_id = ?
                ORDER BY m.created_at ASC
            ");
            $stmt->execute([$dbConversationId]);
            $messages = $stmt->fetchAll();
            
            // Format messages with read receipts
            $formattedMessages = array_map(function($msg) use ($user) {
                return [
                    'id' => (int)$msg['id'],
                    'from' => $msg['from_name'],
                    'from_user_id' => (int)$msg['from_user_id'],
                    'to' => $msg['to_name'],
                    'to_user_id' => (int)$msg['to_user_id'],
                    'text' => $msg['text'],
                    'timestamp' => $msg['created_at'],
                    'read' => (bool)$msg['read_status'],
                    'read_at' => $msg['read_at'] ?? null,
                    'is_sent' => $msg['from_user_id'] == $user['id']
                ];
            }, $messages);
            
            // Mark messages as read if current user is the recipient
            $stmt = $pdo->prepare("
                UPDATE messages 
                SET read_status = 1, read_at = CURRENT_TIMESTAMP
                WHERE conversation_id = ? AND to_user_id = ? AND read_status = 0
            ");
            $stmt->execute([$dbConversationId, $user['id']]);
            
            // Get typing indicators
            $stmt = $pdo->prepare("
                SELECT user_id, is_typing, updated_at
                FROM typing_indicators
                WHERE conversation_id = ? AND user_id != ? AND is_typing = 1
                AND updated_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
            ");
            $stmt->execute([$dbConversationId, $user['id']]);
            $typingUsers = $stmt->fetchAll();
            
            $otherUser = $conversation['owner_id'] == $user['id'] 
                ? $conversation['requester_name'] 
                : $conversation['owner_name'];
            
            // Get other user's last_seen
            $otherUserLastSeen = $conversation['owner_id'] == $user['id'] 
                ? $conversation['requester_last_seen'] 
                : $conversation['owner_last_seen'];
            
            // Determine if other user is online (active within last 5 minutes)
            $isOnline = false;
            if ($otherUserLastSeen) {
                $lastSeenTimestamp = strtotime($otherUserLastSeen);
                $now = time();
                $isOnline = ($now - $lastSeenTimestamp) <= 300; // 5 minutes = 300 seconds
            }
            
            sendResponse(true, 'Conversation retrieved', [
                'conversation' => [
                    'id' => 'conv_' . $conversation['item_id'] . '_' . ($conversation['owner_id'] == $user['id'] ? $conversation['requester_id'] : $conversation['owner_id']),
                    'dbId' => (int)$conversation['id'],
                    'itemId' => (int)$conversation['item_id'],
                    'itemTitle' => $conversation['item_title'],
                    'itemType' => $conversation['item_type'],
                    'owner' => $conversation['owner_name'],
                    'ownerId' => (int)$conversation['owner_id'],
                    'requester' => $conversation['requester_name'],
                    'requesterId' => (int)$conversation['requester_id'],
                    'otherUser' => $otherUser,
                    'otherUserLastSeen' => $otherUserLastSeen,
                    'otherUserIsOnline' => $isOnline,
                    'isOwner' => $conversation['owner_id'] == $user['id'],
                    'status' => $conversation['status'],
                    'ownerConfirmedAt' => $conversation['owner_confirmed_at'] ?? null,
                    'requesterConfirmedAt' => $conversation['requester_confirmed_at'] ?? null
                ],
                'messages' => $formattedMessages,
                'typing_users' => array_map(function($tu) {
                    return (int)$tu['user_id'];
                }, $typingUsers)
            ]);
            break;
            
        case 'POST':
            // Send message in conversation
            $data = getRequestData();
            $conversationIdParam = $data['conversation_id'] ?? null;
            $messageText = trim($data['message'] ?? '');
            
            if (!$conversationIdParam || empty($messageText)) {
                sendResponse(false, 'Conversation ID and message are required', null, 400);
            }
            
            // Handle conversation ID format
            $dbConversationId = null;
            if (is_numeric($conversationIdParam)) {
                $dbConversationId = (int)$conversationIdParam;
            } else if (strpos($conversationIdParam, 'conv_') === 0) {
                $parts = explode('_', $conversationIdParam);
                if (count($parts) === 3) {
                    $itemId = (int)$parts[1];
                    $otherUserId = (int)$parts[2];
                    $stmt = $pdo->prepare("
                        SELECT c.id FROM conversations c
                        WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                        AND (c.owner_id = ? OR c.requester_id = ?)
                        LIMIT 1
                    ");
                    $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                    $conv = $stmt->fetch();
                    if ($conv) {
                        $dbConversationId = $conv['id'];
                    }
                }
            }
            
            if (!$dbConversationId) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // Verify user is part of conversation
            $stmt = $pdo->prepare("
                SELECT owner_id, requester_id FROM conversations WHERE id = ?
            ");
            $stmt->execute([$dbConversationId]);
            $conv = $stmt->fetch();
            
            if (!$conv) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            if ($conv['owner_id'] != $user['id'] && $conv['requester_id'] != $user['id']) {
                sendResponse(false, 'You are not part of this conversation', null, 403);
            }
            
            $toUserId = $conv['owner_id'] == $user['id'] ? $conv['requester_id'] : $conv['owner_id'];
            
            // Create message
            $stmt = $pdo->prepare("
                INSERT INTO messages (conversation_id, from_user_id, to_user_id, text, read_status) 
                VALUES (?, ?, ?, ?, 1)
            ");
            $stmt->execute([$dbConversationId, $user['id'], $toUserId, $messageText]);
            
            // Update conversation
            $stmt = $pdo->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
            $stmt->execute([$dbConversationId]);
            
            // Clear typing indicator when message is sent
            $stmt = $pdo->prepare("
                UPDATE typing_indicators 
                SET is_typing = 0 
                WHERE conversation_id = ? AND user_id = ?
            ");
            $stmt->execute([$dbConversationId, $user['id']]);
            
            // Update user's last_seen
            $stmt = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            // Create notification for recipient
            require_once 'notification_helper.php';
            createNotification($pdo, $toUserId, 'message', 'New message', $messageText, null, $dbConversationId, $user['id']);
            
            sendResponse(true, 'Message sent successfully', [
                'message_id' => $pdo->lastInsertId()
            ], 201);
            break;
            
        case 'PUT':
            // Update conversation status (accept, reject, complete)
            $data = getRequestData();
            $conversationIdParam = $data['conversation_id'] ?? null;
            $status = $data['status'] ?? '';
            
            if (!$conversationIdParam || !in_array($status, ['accepted', 'rejected', 'completed'])) {
                sendResponse(false, 'Valid conversation ID and status are required', null, 400);
            }
            
            // Handle conversation ID format
            $dbConversationId = null;
            if (is_numeric($conversationIdParam)) {
                $dbConversationId = (int)$conversationIdParam;
            } else if (strpos($conversationIdParam, 'conv_') === 0) {
                $parts = explode('_', $conversationIdParam);
                if (count($parts) === 3) {
                    $itemId = (int)$parts[1];
                    $otherUserId = (int)$parts[2];
                    $stmt = $pdo->prepare("
                        SELECT c.id FROM conversations c
                        WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                        AND (c.owner_id = ? OR c.requester_id = ?)
                        LIMIT 1
                    ");
                    $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                    $conv = $stmt->fetch();
                    if ($conv) {
                        $dbConversationId = $conv['id'];
                    }
                }
            }
            
            if (!$dbConversationId) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // Verify user is owner and get conversation details
            $stmt = $pdo->prepare("
                SELECT c.owner_id, c.requester_id, c.item_id, i.title as item_title, i.type as item_type
                FROM conversations c
                INNER JOIN items i ON c.item_id = i.id
                WHERE c.id = ?
            ");
            $stmt->execute([$dbConversationId]);
            $conv = $stmt->fetch();
            
            if (!$conv) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            if ($conv['owner_id'] != $user['id'] && $status != 'completed') {
                sendResponse(false, 'Only the owner can accept or reject requests', null, 403);
            }
            
            // Handle completion logic based on item type
            if ($status === 'completed') {
                $itemType = $conv['item_type'] ?? 'exchange';
                
                if ($itemType === 'donation') {
                    // Donation: Only requester can confirm completion (existing logic)
                    if ($conv['requester_id'] != $user['id']) {
                        sendResponse(false, 'Only the requester can confirm completion for donations', null, 403);
                    }
                    
                    // Direct completion for donations
                    $stmt = $pdo->prepare("UPDATE conversations SET status = 'completed', updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$dbConversationId]);
                    
                } else {
                    // Exchange: Both parties must confirm (new logic)
                    $isOwner = $conv['owner_id'] == $user['id'];
                    $isRequester = $conv['requester_id'] == $user['id'];
                    
                    if (!$isOwner && !$isRequester) {
                        sendResponse(false, 'You are not part of this conversation', null, 403);
                    }
                    
                    // Get current confirmation status
                    $stmt = $pdo->prepare("
                        SELECT status, owner_confirmed_at, requester_confirmed_at 
                        FROM conversations WHERE id = ?
                    ");
                    $stmt->execute([$dbConversationId]);
                    $currentConv = $stmt->fetch();
                    
                    if ($isOwner) {
                        // Owner confirming
                        if ($currentConv['requester_confirmed_at']) {
                            // Requester already confirmed, now both confirmed → completed
                            $stmt = $pdo->prepare("
                                UPDATE conversations 
                                SET status = 'completed', owner_confirmed_at = NOW(), updated_at = NOW() 
                                WHERE id = ?
                            ");
                            $stmt->execute([$dbConversationId]);
                            $finalStatus = 'completed';
                        } else {
                            // Owner is first to confirm → partial_confirmed
                            $stmt = $pdo->prepare("
                                UPDATE conversations 
                                SET status = 'partial_confirmed', owner_confirmed_at = NOW(), updated_at = NOW() 
                                WHERE id = ?
                            ");
                            $stmt->execute([$dbConversationId]);
                            $finalStatus = 'partial_confirmed';
                            
                            // Send reminder notification to requester
                            require_once 'notification_helper.php';
                            createNotification(
                                $pdo, 
                                $conv['requester_id'], 
                                'system', 
                                'Exchange confirmation needed',
                                'Your exchange partner has confirmed completion. Please confirm on your side too.',
                                $conv['item_id'], 
                                $dbConversationId, 
                                $user['id']
                            );
                        }
                    } else {
                        // Requester confirming  
                        if ($currentConv['owner_confirmed_at']) {
                            // Owner already confirmed, now both confirmed → completed
                            $stmt = $pdo->prepare("
                                UPDATE conversations 
                                SET status = 'completed', requester_confirmed_at = NOW(), updated_at = NOW() 
                                WHERE id = ?
                            ");
                            $stmt->execute([$dbConversationId]);
                            $finalStatus = 'completed';
                        } else {
                            // Requester is first to confirm → partial_confirmed
                            $stmt = $pdo->prepare("
                                UPDATE conversations 
                                SET status = 'partial_confirmed', requester_confirmed_at = NOW(), updated_at = NOW() 
                                WHERE id = ?
                            ");
                            $stmt->execute([$dbConversationId]);
                            $finalStatus = 'partial_confirmed';
                            
                            // Send reminder notification to owner
                            require_once 'notification_helper.php';
                            createNotification(
                                $pdo, 
                                $conv['owner_id'], 
                                'system', 
                                'Exchange confirmation needed',
                                'Your exchange partner has confirmed completion. Please confirm on your side too.',
                                $conv['item_id'], 
                                $dbConversationId, 
                                $user['id']
                            );
                        }
                    }
                    
                    // If fully completed, update item status
                    if (isset($finalStatus) && $finalStatus === 'completed') {
                        $stmt = $pdo->prepare("UPDATE items SET status = 'completed' WHERE id = ?");
                        $stmt->execute([$conv['item_id']]);
                    }
                }
            } else {
                // For accept/reject, use existing logic
                $stmt = $pdo->prepare("UPDATE conversations SET status = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$status, $dbConversationId]);
            }
            
            // If accepted, update item status and auto-reject other pending conversations
            if ($status === 'accepted') {
                $stmt = $pdo->prepare("UPDATE items SET status = 'accepted' WHERE id = ?");
                $stmt->execute([$conv['item_id']]);
                
                // Auto-reject all other pending conversations for this item
                $stmt = $pdo->prepare("
                    SELECT id, requester_id FROM conversations 
                    WHERE item_id = ? AND status = 'pending' AND id != ?
                ");
                $stmt->execute([$conv['item_id'], $dbConversationId]);
                $otherConversations = $stmt->fetchAll();
                
                if (!empty($otherConversations)) {
                    // Update status to rejected for all other pending conversations
                    $otherConvIds = array_column($otherConversations, 'id');
                    $placeholders = implode(',', array_fill(0, count($otherConvIds), '?'));
                    $stmt = $pdo->prepare("UPDATE conversations SET status = 'rejected', updated_at = NOW() WHERE id IN ($placeholders)");
                    $stmt->execute($otherConvIds);
                    
                    // Send rejection notifications and optionally auto-delete based on user preferences
                    $itemTitle = $conv['item_title'];
                    $itemType = $conv['item_type'] ?? 'exchange';
                    $itemTypeText = ($itemType === 'donation') ? 'donation' : 'exchange';
                    
                    foreach ($otherConversations as $otherConv) {
                        try {
                            // Get user's conversation preferences
                            $stmt = $pdo->prepare("SELECT auto_delete_rejected_conversations FROM users WHERE id = ?");
                            $stmt->execute([$otherConv['requester_id']]);
                            $userPrefs = $stmt->fetch();
                            $autoDeleteRejected = $userPrefs['auto_delete_rejected_conversations'] ?? true;
                            
                            // Send notification
                            createNotification(
                                $pdo, 
                                $otherConv['requester_id'], 
                                'rejection', 
                                'Request no longer available', 
                                'The ' . $itemTypeText . ' "' . $itemTitle . '" is no longer available as another request has been accepted.', 
                                $conv['item_id'], 
                                $otherConv['id'], 
                                $user['id']
                            );
                            
                            // Auto-delete the conversation if user has this preference enabled
                            if ($autoDeleteRejected) {
                                $stmt = $pdo->prepare("UPDATE conversations SET hidden_by_user_id = ?, updated_at = NOW() WHERE id = ?");
                                $stmt->execute([$otherConv['requester_id'], $otherConv['id']]);
                                error_log('Auto-deleted rejected conversation ' . $otherConv['id'] . ' for user ' . $otherConv['requester_id']);
                            }
                        } catch (Exception $e) {
                            error_log('Error creating auto-rejection notification: ' . $e->getMessage());
                        }
                    }
                }
            }
            
            // Create notification for requester (acceptance or rejection)
            require_once 'notification_helper.php';
            $requesterId = $conv['requester_id'];
            $itemTitle = $conv['item_title'];
            $itemType = $conv['item_type'] ?? 'exchange'; // Get item type from conversation data
            
            $itemTypeText = ($itemType === 'donation') ? 'donation' : 'exchange';
            
            if ($status === 'accepted') {
                $notificationTitle = 'Request accepted';
                $notificationMessage = 'Your request for the ' . $itemTypeText . ' "' . $itemTitle . '" has been accepted!';
                $notificationType = 'acceptance';
            } else if ($status === 'rejected') {
                $notificationTitle = 'Request rejected';
                $notificationMessage = 'Your request for the ' . $itemTypeText . ' "' . $itemTitle . '" has been rejected.';
                $notificationType = 'rejection';
            }
            
            if (isset($notificationType)) {
                try {
                    createNotification($pdo, $requesterId, $notificationType, $notificationTitle, $notificationMessage, $conv['item_id'], $dbConversationId, $user['id']);
                } catch (Exception $e) {
                    error_log('Error creating notification: ' . $e->getMessage());
                    // Don't fail the request if notification creation fails
                }
            }
            
            sendResponse(true, 'Conversation status updated');
            break;
            
        case 'PATCH':
            // Update typing indicator
            $data = getRequestData();
            $conversationIdParam = $data['conversation_id'] ?? null;
            $isTyping = isset($data['is_typing']) && $data['is_typing'] === true;
            
            if (!$conversationIdParam) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            // Handle conversation ID format
            $dbConversationId = null;
            if (is_numeric($conversationIdParam)) {
                $dbConversationId = (int)$conversationIdParam;
            } else if (strpos($conversationIdParam, 'conv_') === 0) {
                $parts = explode('_', $conversationIdParam);
                if (count($parts) === 3) {
                    $itemId = (int)$parts[1];
                    $otherUserId = (int)$parts[2];
                    $stmt = $pdo->prepare("
                        SELECT c.id FROM conversations c
                        WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                        AND (c.owner_id = ? OR c.requester_id = ?)
                        LIMIT 1
                    ");
                    $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                    $conv = $stmt->fetch();
                    if ($conv) {
                        $dbConversationId = $conv['id'];
                    }
                }
            }
            
            if (!$dbConversationId) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // Update or insert typing indicator
            $stmt = $pdo->prepare("
                INSERT INTO typing_indicators (conversation_id, user_id, is_typing)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE is_typing = ?, updated_at = NOW()
            ");
            $stmt->execute([$dbConversationId, $user['id'], $isTyping ? 1 : 0, $isTyping ? 1 : 0]);
            
            sendResponse(true, 'Typing indicator updated');
            break;

        case 'DELETE':
            // Soft delete / cancel conversation for both users
            $conversationIdParam = $conversationId ?? null;
            if (!$conversationIdParam) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            // Handle conversation ID format
            $dbConversationId = null;
            if (is_numeric($conversationIdParam)) {
                $dbConversationId = (int)$conversationIdParam;
            } else if (strpos($conversationIdParam, 'conv_') === 0) {
                $parts = explode('_', $conversationIdParam);
                if (count($parts) === 3) {
                    $itemId = (int)$parts[1];
                    $otherUserId = (int)$parts[2];
                    $stmt = $pdo->prepare("
                        SELECT c.id FROM conversations c
                        WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                        AND (c.owner_id = ? OR c.requester_id = ?)
                        LIMIT 1
                    ");
                    $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                    $conv = $stmt->fetch();
                    if ($conv) {
                        $dbConversationId = $conv['id'];
                    }
                }
            }
            
            if (!$dbConversationId) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            // Verify user is part of conversation
            $stmt = $pdo->prepare("
                SELECT owner_id, requester_id FROM conversations WHERE id = ?
            ");
            $stmt->execute([$dbConversationId]);
            $conv = $stmt->fetch();
            
            if (!$conv) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            if ($conv['owner_id'] != $user['id'] && $conv['requester_id'] != $user['id']) {
                sendResponse(false, 'You are not part of this conversation', null, 403);
            }
            
            // Hide conversation for this user only (soft delete per user)
            $stmt = $pdo->prepare("UPDATE conversations SET hidden_by_user_id = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$user['id'], $dbConversationId]);
            
            sendResponse(true, 'Conversation deleted for you');
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'conversations');
}

