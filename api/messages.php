<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

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
                       requester.name as requester_name,
                       (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                       (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND to_user_id = ? AND read_status = 0) as unread_count
                FROM conversations c
                INNER JOIN items i ON c.item_id = i.id
                INNER JOIN users owner ON c.owner_id = owner.id
                INNER JOIN users requester ON c.requester_id = requester.id
                WHERE (c.owner_id = ? OR c.requester_id = ?)
                AND (c.hidden_by_user_id IS NULL OR c.hidden_by_user_id != ?)
                ORDER BY c.updated_at DESC
            ");
            $stmt->execute([$userId, $userId, $userId, $userId]);
            $conversations = $stmt->fetchAll();
            
            // Format conversations
            $formattedConversations = array_map(function($conv) use ($userId) {
                $otherUser = $conv['owner_id'] == $userId ? $conv['requester_name'] : $conv['owner_name'];
                $isOwner = $conv['owner_id'] == $userId;
                
                $status = $conv['status'] ?? 'pending';
                $itemStatus = $conv['item_status'] ?? 'active';
                $itemTitle = $conv['item_title'];
                
                // If item is deleted, show appropriate message
                if ($itemStatus === 'deleted') {
                    $itemTitle = 'Item No Longer Available';
                }
                
                error_log('Formatting conversation ID: ' . $conv['id'] . ', status from DB: ' . $status . ', item_status: ' . $itemStatus);
                
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
                    'isOwner' => $isOwner,
                    'lastMessage' => $conv['last_message'] ?? 'No messages yet',
                    'lastUpdate' => $conv['last_message_time'] ?? $conv['updated_at'],
                    'status' => $status,
                    'unreadCount' => (int)$conv['unread_count'],
                    'ownerConfirmedAt' => $conv['owner_confirmed_at'] ?? null,
                    'requesterConfirmedAt' => $conv['requester_confirmed_at'] ?? null
                ];
            }, $conversations);
            
            error_log('Total conversations formatted: ' . count($formattedConversations));
            foreach ($formattedConversations as $fc) {
                error_log('Conversation ID: ' . $fc['id'] . ', status: ' . $fc['status']);
            }
            
            sendResponse(true, 'Conversations retrieved', $formattedConversations);
            break;
            
        case 'POST':
            // Create new message or conversation
            error_log('=== MESSAGES.PHP POST REQUEST START ===');
            $data = getRequestData();
            $itemId = $data['item_id'] ?? null;
            $messageText = trim($data['message'] ?? '');
            
            error_log('POST data: itemId=' . $itemId . ', messageText=' . substr($messageText, 0, 50));
            
            if (!$itemId || empty($messageText)) {
                error_log('ERROR: Item ID or message missing');
                sendResponse(false, 'Item ID and message are required', null, 400);
            }
            
            // Get item and owner
            $stmt = $pdo->prepare("SELECT user_id FROM items WHERE id = ? AND status = 'active'");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            if (!$item) {
                error_log('ERROR: Item not found');
                sendResponse(false, 'Item not found', null, 404);
            }
            
            if ($item['user_id'] == $user['id']) {
                error_log('ERROR: User trying to request own item');
                sendResponse(false, 'You cannot request your own item', null, 400);
            }
            
            $ownerId = $item['user_id'];
            $requesterId = $user['id'];
            
            error_log('Owner ID: ' . $ownerId . ', Requester ID: ' . $requesterId);
            
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
                
                error_log('Existing conversation found: ID ' . $conversationId . ', status: ' . $existingStatus);
                
                // If conversation is rejected, update it to pending (replace rejected with new request)
                if ($existingStatus === 'rejected') {
                    error_log('Conversation was rejected, updating to pending...');
                    $stmt = $pdo->prepare("
                        UPDATE conversations 
                        SET status = 'pending', updated_at = NOW() 
                        WHERE id = ?
                    ");
                    $stmt->execute([$conversationId]);
                    error_log('Updated rejected conversation to pending: ' . $conversationId);
                } else if ($existingStatus === 'pending' || $existingStatus === 'accepted') {
                    // If pending or accepted, use existing conversation
                    error_log('Using existing conversation (status: ' . $existingStatus . '): ' . $conversationId);
                } else {
                    // For completed conversations, create a new one
                    error_log('Existing conversation is completed, creating new one...');
                    $stmt = $pdo->prepare("
                        INSERT INTO conversations (item_id, owner_id, requester_id, status) 
                        VALUES (?, ?, ?, 'pending')
                    ");
                    $stmt->execute([$itemId, $ownerId, $requesterId]);
                    $conversationId = $pdo->lastInsertId();
                    error_log('Created new conversation ID: ' . $conversationId);
                }
            } else {
                // No existing conversation, create new one
                $stmt = $pdo->prepare("
                    INSERT INTO conversations (item_id, owner_id, requester_id, status) 
                    VALUES (?, ?, ?, 'pending')
                ");
                $stmt->execute([$itemId, $ownerId, $requesterId]);
                $conversationId = $pdo->lastInsertId();
                error_log('Created new conversation ID: ' . $conversationId);
            }
            
            // Create message
            $stmt = $pdo->prepare("
                INSERT INTO messages (conversation_id, from_user_id, to_user_id, text, read_status) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $readStatus = ($requesterId == $user['id']) ? 1 : 0; // Messages sent by requester are auto-read
            $stmt->execute([$conversationId, $requesterId, $ownerId, $messageText, $readStatus]);
            error_log('Message created successfully');
            
            // Update conversation updated_at
            $stmt = $pdo->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
            $stmt->execute([$conversationId]);
            
            // Create notification for item owner (new request received)
            error_log('=== STARTING NOTIFICATION CREATION ===');
            
            // Load notification helper (separate file to avoid HTTP request handling)
            $notificationHelperPath = __DIR__ . '/notification_helper.php';
            error_log('Notification helper path: ' . $notificationHelperPath);
            error_log('File exists: ' . (file_exists($notificationHelperPath) ? 'YES' : 'NO'));
            
            if (file_exists($notificationHelperPath)) {
                require_once $notificationHelperPath;
                error_log('notification_helper.php loaded successfully');
                
                // Check if function exists
                if (function_exists('createNotification')) {
                    error_log('createNotification function exists');
                } else {
                    error_log('ERROR: createNotification function does NOT exist after require!');
                }
            } else {
                error_log('ERROR: notification_helper.php file not found at: ' . $notificationHelperPath);
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
            error_log('Item title: ' . $itemTitle . ', type: ' . $itemType);
            
            $requesterName = '';
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$requesterId]);
            $requester = $stmt->fetch();
            if ($requester) {
                $requesterName = $requester['name'];
            }
            error_log('Requester name: ' . $requesterName);
            
            $notificationTitle = 'New request received';
            if ($itemType === 'donation') {
                $notificationMessage = $requesterName . ' is interested in your donation: ' . $itemTitle;
            } else {
                $notificationMessage = $requesterName . ' wants to exchange for: ' . $itemTitle;
            }
            
            error_log('Notification title: ' . $notificationTitle);
            error_log('Notification message: ' . $notificationMessage);
            
            // Only create notification if this is a new conversation or if we reactivated a rejected one
            $isNewOrReactivated = !$existingConv || ($existingConv && $existingConv['status'] === 'rejected');
            if ($isNewOrReactivated) {
                error_log('=== CREATING NEW REQUEST NOTIFICATION ===');
                error_log('Params: ownerId=' . $ownerId . ', type=request, itemId=' . $itemId . ', conversationId=' . $conversationId . ', requesterId=' . $requesterId);
                try {
                    if (!function_exists('createNotification')) {
                        error_log('ERROR: createNotification function does not exist!');
                    } else {
                        error_log('createNotification function exists, calling it...');
                        $notificationId = createNotification($pdo, $ownerId, 'request', $notificationTitle, $notificationMessage, $itemId, $conversationId, $requesterId);
                        error_log('SUCCESS: Notification created with ID: ' . $notificationId);
                    }
                } catch (Exception $e) {
                    error_log('EXCEPTION creating notification: ' . $e->getMessage());
                    error_log('Stack trace: ' . $e->getTraceAsString());
                } catch (Error $e) {
                    error_log('ERROR creating notification: ' . $e->getMessage());
                    error_log('Stack trace: ' . $e->getTraceAsString());
                }
            } else {
                // For existing conversations, create a message notification
                error_log('=== CREATING MESSAGE NOTIFICATION FOR EXISTING CONVERSATION ===');
                try {
                    if (!function_exists('createNotification')) {
                        error_log('ERROR: createNotification function does not exist!');
                    } else {
                        $notificationId = createNotification($pdo, $ownerId, 'message', 'New message', $messageText, $itemId, $conversationId, $requesterId);
                        error_log('SUCCESS: Message notification created with ID: ' . $notificationId);
                    }
                } catch (Exception $e) {
                    error_log('EXCEPTION creating message notification: ' . $e->getMessage());
                } catch (Error $e) {
                    error_log('ERROR creating message notification: ' . $e->getMessage());
                }
            }
            
            error_log('=== MESSAGES.PHP POST REQUEST END ===');
            
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

