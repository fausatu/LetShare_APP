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
    $conversationId = $_GET['id'] ?? null;
    
    switch ($method) {
        case 'GET':
            // Fetch single message image by ID
            $messageId = $_GET['message_id'] ?? null;
            if ($messageId && is_numeric($messageId)) {
                $stmt = $pdo->prepare("
                    SELECT m.image, m.conversation_id, c.owner_id, c.requester_id
                    FROM messages m
                    INNER JOIN conversations c ON m.conversation_id = c.id
                    WHERE m.id = ? AND (c.owner_id = ? OR c.requester_id = ?)
                ");
                $stmt->execute([(int)$messageId, $user['id'], $user['id']]);
                $msg = $stmt->fetch();
                if ($msg) {
                    sendResponse(true, 'Message image retrieved', ['image' => $msg['image']]);
                } else {
                    sendResponse(false, 'Message not found', null, 404);
                }
                break;
            }
            
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
            
            // Check if current user has already left a review for this conversation
            $stmtReview = $pdo->prepare("SELECT id FROM user_reviews WHERE conversation_id = ? AND reviewer_user_id = ? LIMIT 1");
            $stmtReview->execute([$dbConversationId, $user['id']]);
            $hasReviewed = (bool)$stmtReview->fetch();
            
            // If item is deleted, show appropriate message
            if ($conversation['item_status'] === 'deleted') {
                $conversation['item_title'] = 'Item No Longer Available';
            }
            
            // Determine hidden_at for current user (messages before this date are hidden)
            $isOwner = ($conversation['owner_id'] == $user['id']);
            $hiddenAt = $isOwner ? $conversation['hidden_at_owner'] : $conversation['hidden_at_requester'];
            
            // Mark messages as read FIRST (before fetching) so response reflects actual status
            // Only mark messages visible to this user (after hidden_at)
            if ($hiddenAt) {
                $stmtMarkRead = $pdo->prepare("
                    UPDATE messages 
                    SET read_status = 1, read_at = CURRENT_TIMESTAMP
                    WHERE conversation_id = ? AND to_user_id = ? AND read_status = 0 AND created_at > ?
                ");
                $stmtMarkRead->execute([$dbConversationId, $user['id'], $hiddenAt]);
            } else {
                $stmtMarkRead = $pdo->prepare("
                    UPDATE messages 
                    SET read_status = 1, read_at = CURRENT_TIMESTAMP
                    WHERE conversation_id = ? AND to_user_id = ? AND read_status = 0
                ");
                $stmtMarkRead->execute([$dbConversationId, $user['id']]);
            }
            $markedCount = $stmtMarkRead->rowCount();
            
            // Notify sender via Pusher that their messages were read
            if ($markedCount > 0) {
                triggerMessagesRead($dbConversationId, $user['id']);
            }
            
            // Get all messages in conversation (now with updated read status)
            // Filter out messages sent before the user's hidden_at timestamp
            if ($hiddenAt) {
                $stmt = $pdo->prepare("
                    SELECT m.*,
                           from_user.name as from_name,
                           to_user.name as to_name
                    FROM messages m
                    INNER JOIN users from_user ON m.from_user_id = from_user.id
                    INNER JOIN users to_user ON m.to_user_id = to_user.id
                    WHERE m.conversation_id = ? AND m.created_at > ?
                    ORDER BY m.created_at ASC
                ");
                $stmt->execute([$dbConversationId, $hiddenAt]);
            } else {
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
            }
            $messages = $stmt->fetchAll();
            
            // Fetch all reactions for messages in this conversation
            $messageIds = array_column($messages, 'id');
            $reactionsMap = [];
            if (!empty($messageIds)) {
                $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
                $stmt = $pdo->prepare("
                    SELECT message_id, emoji, GROUP_CONCAT(user_id) as user_ids, COUNT(*) as count
                    FROM message_reactions 
                    WHERE message_id IN ($placeholders) 
                    GROUP BY message_id, emoji
                ");
                $stmt->execute($messageIds);
                foreach ($stmt->fetchAll() as $r) {
                    $reactionsMap[(int)$r['message_id']][] = [
                        'emoji' => $r['emoji'],
                        'count' => (int)$r['count'],
                        'user_ids' => array_map('intval', explode(',', $r['user_ids']))
                    ];
                }
            }
            
            // Format messages with read receipts
            $formattedMessages = array_map(function($msg) use ($user, $reactionsMap) {
                return [
                    'id' => (int)$msg['id'],
                    'from' => $msg['from_name'],
                    'from_user_id' => (int)$msg['from_user_id'],
                    'to' => $msg['to_name'],
                    'to_user_id' => (int)$msg['to_user_id'],
                    'text' => $msg['text'],
                    'image' => $msg['image'] ?? null,
                    'timestamp' => $msg['created_at'],
                    'read' => (bool)$msg['read_status'],
                    'read_at' => $msg['read_at'] ?? null,
                    'is_sent' => $msg['from_user_id'] == $user['id'],
                    'reactions' => $reactionsMap[(int)$msg['id']] ?? []
                ];
            }, $messages);
            
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
                $isOnline = ($now - $lastSeenTimestamp) <= ONLINE_THRESHOLD_SECONDS;
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
                    'requesterConfirmedAt' => $conversation['requester_confirmed_at'] ?? null,
                    'hasReviewed' => $hasReviewed,
                    'itemStatus' => $conversation['item_status'] ?? 'available'
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
            $messageImage = $data['image'] ?? null;
            
            if (!$conversationIdParam || (empty($messageText) && empty($messageImage))) {
                sendResponse(false, 'Conversation ID and message or image are required', null, 400);
            }
            
            // Validate image if provided
            if ($messageImage) {
                // Must be a valid base64 data URI for an image
                if (!preg_match('/^data:image\/(jpeg|jpg|png|gif|webp);base64,/', $messageImage)) {
                    sendResponse(false, 'Invalid image format. Only JPEG, PNG, GIF, WebP are allowed.', null, 400);
                }
                // Max 5MB
                $imageSize = strlen($messageImage) * 3 / 4;
                if ($imageSize > 5 * 1024 * 1024) {
                    sendResponse(false, 'Image too large. Maximum size is 5MB.', null, 400);
                }
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
            
            // Check if either user has blocked the other
            $stmtBlock = $pdo->prepare("
                SELECT id FROM blocked_users 
                WHERE (blocking_user_id = ? AND blocked_user_id = ?) 
                   OR (blocking_user_id = ? AND blocked_user_id = ?)
            ");
            $stmtBlock->execute([$user['id'], $toUserId, $toUserId, $user['id']]);
            if ($stmtBlock->fetch()) {
                sendResponse(false, 'You cannot send messages to this user', null, 403);
            }
            
            // Create message - read_status = 0 means UNREAD for the recipient
            $stmt = $pdo->prepare("
                INSERT INTO messages (conversation_id, from_user_id, to_user_id, text, image, read_status) 
                VALUES (?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([$dbConversationId, $user['id'], $toUserId, $messageText ?: null, $messageImage]);
            $messageId = $pdo->lastInsertId();
            
            // Trigger Pusher event for real-time message
            // Note: Don't send full base64 image via Pusher (10KB limit), send flag instead
            triggerNewMessage($dbConversationId, [
                'id' => (int)$messageId,
                'conversationId' => (int)$dbConversationId,
                'from_user_id' => (int)$user['id'],
                'to_user_id' => (int)$toUserId,
                'text' => $messageText ?: null,
                'has_image' => !empty($messageImage),
                'timestamp' => date('Y-m-d H:i:s'),
                'read' => false
            ]);
            
            // Update conversation and unhide for recipient so they see the new message
            $hiddenCol = ($conv['owner_id'] == $toUserId) ? 'hidden_by_owner' : 'hidden_by_requester';
            $stmt = $pdo->prepare("UPDATE conversations SET updated_at = NOW(), $hiddenCol = 0 WHERE id = ?");
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
            try {
                require_once 'notification_helper.php';
                $recipientLang = getUserLanguage($pdo, $toUserId);
                $msgNotifTitle = getNotifText('new_message', $recipientLang);
                createNotification($pdo, $toUserId, 'message', $msgNotifTitle, $messageText ?: '📷 Photo', null, $dbConversationId, $user['id']);
            } catch (Exception $e) {
            }
            
            sendResponse(true, 'Message sent successfully', [
                'message_id' => $pdo->lastInsertId()
            ], 201);
            break;
            
        case 'PUT':
            try {
                // Load notification helper early so functions are available
                require_once 'notification_helper.php';
                
                // Update conversation status (accept, reject, complete)
                $data = getRequestData();
                $conversationIdParam = $data['conversation_id'] ?? null;
                $status = $data['status'] ?? '';
                
                if (!$conversationIdParam || !in_array($status, ['accepted', 'rejected', 'completed', 'cancel_accepted'])) {
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
                
                // Handle cancel_accepted: owner cancels a previously accepted conversation
                if ($status === 'cancel_accepted') {
                    // Verify the conversation is currently accepted or partial_confirmed
                    $stmt = $pdo->prepare("SELECT status FROM conversations WHERE id = ?");
                    $stmt->execute([$dbConversationId]);
                    $currentConv = $stmt->fetch();
                    
                    if (!$currentConv || !in_array($currentConv['status'], ['accepted', 'partial_confirmed'])) {
                        sendResponse(false, 'Can only cancel an accepted conversation', null, 400);
                    }
                    
                    // Only owner can cancel acceptance
                    if ($conv['owner_id'] != $user['id']) {
                        sendResponse(false, 'Only the owner can cancel acceptance', null, 403);
                    }
                    
                    // 1. Set conversation to cancelled
                    $stmt = $pdo->prepare("UPDATE conversations SET status = 'cancelled', updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$dbConversationId]);
                    
                    // 2. Re-list the item (back to active)
                    $stmt = $pdo->prepare("UPDATE items SET status = 'active' WHERE id = ?");
                    $stmt->execute([$conv['item_id']]);
                    
                    // 3. Send notification to requester
                    try {
                        require_once 'notification_helper.php';
                        $requesterId = $conv['requester_id'];
                        $itemTitle = $conv['item_title'];
                        $requesterLang = getUserLanguage($pdo, $requesterId);
                        
                        $notifTitle = getNotifText('acceptance_cancelled', $requesterLang);
                        $notifMessage = getNotifText('acceptance_cancelled_msg', $requesterLang, ['item' => $itemTitle]);
                        
                        createNotification(
                            $pdo,
                            $requesterId,
                            'system',
                            $notifTitle,
                            $notifMessage,
                            $conv['item_id'],
                            $dbConversationId,
                            $user['id']
                        );
                        
                        // 4. Send email to requester
                        sendCancelAcceptanceEmail($pdo, $requesterId, $itemTitle, $conv['item_id']);
                    } catch (\Throwable $e) {
                    }
                    
                    // 5. Reactivate all other rejected conversations for this item (auto-rejected when accepted)
                    try {
                        $stmt = $pdo->prepare("
                            SELECT id, requester_id FROM conversations 
                            WHERE item_id = ? AND status = 'rejected' AND id != ?
                        ");
                        $stmt->execute([$conv['item_id'], $dbConversationId]);
                        $rejectedConversations = $stmt->fetchAll();
                        
                        if (!empty($rejectedConversations)) {
                            $itemTitle = $conv['item_title'];
                            
                            // Reset all rejected conversations to pending
                            $rejectedIds = array_column($rejectedConversations, 'id');
                            $placeholders = implode(',', array_fill(0, count($rejectedIds), '?'));
                            $stmt = $pdo->prepare("
                                UPDATE conversations 
                                SET status = 'pending', hidden_by_owner = 0, hidden_by_requester = 0, hidden_at_owner = NULL, hidden_at_requester = NULL, updated_at = NOW() 
                                WHERE id IN ($placeholders)
                            ");
                            $stmt->execute($rejectedIds);
                            
                            // Notify each requester that their request is reactivated
                            foreach ($rejectedConversations as $rejConv) {
                                try {
                                    $rejUserLang = getUserLanguage($pdo, $rejConv['requester_id']);
                                    $reactivatedTitle = getNotifText('request_reactivated', $rejUserLang);
                                    $reactivatedMsg = getNotifText('request_reactivated_msg', $rejUserLang, ['item' => $itemTitle]);
                                    
                                    createNotification(
                                        $pdo,
                                        $rejConv['requester_id'],
                                        'system',
                                        $reactivatedTitle,
                                        $reactivatedMsg,
                                        $conv['item_id'],
                                        $rejConv['id'],
                                        $user['id']
                                    );
                                    
                                    // Send reactivation email
                                    sendReactivationEmail($pdo, $rejConv['requester_id'], $itemTitle, $conv['item_id']);
                                } catch (\Throwable $e) {
                                }
                            }
                            
                        }
                    } catch (\Throwable $e) {
                    }
                    
                    sendResponse(true, 'Acceptance cancelled, item re-listed');
                }
                
                // Handle completion logic based on item type
                if ($status === 'completed') {
                    $itemType = $conv['item_type'] ?? 'exchange';
                    
                    if ($itemType === 'donation') {
                        // Donation: Only requester can confirm completion (existing logic)
                        if ($conv['requester_id'] != $user['id']) {
                            sendResponse(false, 'Only the requester can confirm completion for donations', null, 403);
                        }
                        
                        // Direct completion for donations - set requester_confirmed_at timestamp
                        $stmt = $pdo->prepare("UPDATE conversations SET status = 'completed', requester_confirmed_at = NOW(), updated_at = NOW() WHERE id = ?");
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
                                try {
                                    $requesterLang = getUserLanguage($pdo, $conv['requester_id']);
                                    createNotification(
                                        $pdo, 
                                        $conv['requester_id'], 
                                        'system', 
                                        getNotifText('confirmation_needed', $requesterLang),
                                        getNotifText('confirmation_needed_msg', $requesterLang),
                                        $conv['item_id'], 
                                        $dbConversationId, 
                                        $user['id']
                                    );
                                } catch (Exception $e) {
                                }
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
                                try {
                                    $ownerLang = getUserLanguage($pdo, $conv['owner_id']);
                                    createNotification(
                                        $pdo, 
                                        $conv['owner_id'], 
                                        'system', 
                                        getNotifText('confirmation_needed', $ownerLang),
                                        getNotifText('confirmation_needed_msg', $ownerLang),
                                        $conv['item_id'], 
                                        $dbConversationId, 
                                        $user['id']
                                    );
                                } catch (Exception $e) {
                                }
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
                    if ($status === 'accepted') {
                        $stmt = $pdo->prepare("UPDATE conversations SET status = ?, accepted_at = NOW(), updated_at = NOW() WHERE id = ?");
                    } else {
                        $stmt = $pdo->prepare("UPDATE conversations SET status = ?, updated_at = NOW() WHERE id = ?");
                    }
                    $result = $stmt->execute([$status, $dbConversationId]);
                }
                
                // If accepted, update item status and auto-reject other pending conversations
                if ($status === 'accepted') {
                    $stmt = $pdo->prepare("UPDATE items SET status = 'accepted' WHERE id = ?");
                    $result = $stmt->execute([$conv['item_id']]);
                    if (!$result) {
                    }
                    
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
                                // Get user's conversation preferences and language
                                $stmt = $pdo->prepare("SELECT auto_delete_rejected_conversations, language FROM users WHERE id = ?");
                                $stmt->execute([$otherConv['requester_id']]);
                                $userPrefs = $stmt->fetch();
                                $autoDeleteRejected = $userPrefs['auto_delete_rejected_conversations'] ?? true;
                                $userLang = $userPrefs['language'] ?? 'fr';
                                
                                // Send notification in user's language
                                $notifTitle = getNotifText('request_no_longer_available', $userLang);
                                $notifMessage = getNotifText('request_no_longer_available_msg', $userLang, ['item' => $itemTitle]);
                                
                                createNotification(
                                    $pdo, 
                                    $otherConv['requester_id'], 
                                    'system', 
                                    $notifTitle, 
                                    $notifMessage, 
                                    $conv['item_id'], 
                                    $otherConv['id'], 
                                    $user['id']
                                );
                                
                                // Auto-delete the conversation if user has this preference enabled
                                if ($autoDeleteRejected) {
                                    $stmt = $pdo->prepare("UPDATE conversations SET hidden_by_requester = 1, updated_at = NOW() WHERE id = ? AND requester_id = ?");
                                    $stmt->execute([$otherConv['id'], $otherConv['requester_id']]);
                                }
                            } catch (Exception $e) {
                            }
                        }
                    }
                }
                
                // Create notification for requester (acceptance or rejection)
                // Create notification for requester (acceptance or rejection)
                try {
                    $requesterId = $conv['requester_id'];
                    $itemTitle = $conv['item_title'];
                    $itemType = $conv['item_type'] ?? 'exchange';
                    
                    // Get requester's language for notification
                    $requesterLang = getUserLanguage($pdo, $requesterId);
                    
                    if ($status === 'accepted') {
                        $notificationTitle = getNotifText('request_accepted', $requesterLang);
                        $notificationMessage = getNotifText('request_accepted_msg', $requesterLang, ['item' => $itemTitle]);
                        $notificationType = 'acceptance';
                    } else if ($status === 'rejected') {
                        $notificationTitle = getNotifText('request_rejected', $requesterLang);
                        $notificationMessage = getNotifText('request_rejected_msg', $requesterLang, ['item' => $itemTitle]);
                        $notificationType = 'system';
                    }
                    
                    if (isset($notificationType)) {
                        createNotification($pdo, $requesterId, $notificationType, $notificationTitle, $notificationMessage, $conv['item_id'], $dbConversationId, $user['id']);
                    }
                } catch (Exception $e) {
                }
                
                sendResponse(true, 'Conversation status updated');
            } catch (\Throwable $e) {
                sendResponse(false, 'Error updating conversation: ' . $e->getMessage(), null, 500);
            }
            break;
            
        case 'PATCH':
            $data = getRequestData();
            $conversationIdParam = $data['conversation_id'] ?? null;
            $action = $data['action'] ?? 'typing';
            
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
            
            if ($action === 'mark_read') {
                // Mark all messages as read for current user in this conversation
                $stmt = $pdo->prepare("
                    UPDATE messages 
                    SET read_status = 1, read_at = CURRENT_TIMESTAMP
                    WHERE conversation_id = ? AND to_user_id = ? AND read_status = 0
                ");
                $stmt->execute([$dbConversationId, $user['id']]);
                $markedCount = $stmt->rowCount();
                
                // Notify sender via Pusher
                if ($markedCount > 0) {
                    triggerMessagesRead($dbConversationId, $user['id']);
                }
                
                sendResponse(true, 'Messages marked as read', ['marked' => $markedCount]);
            } else if ($action === 'react') {
                // Add or remove emoji reaction on a message
                $messageId = isset($data['message_id']) ? (int)$data['message_id'] : null;
                $emoji = $data['emoji'] ?? null;
                
                if (!$messageId || !$emoji) {
                    sendResponse(false, 'message_id and emoji are required', null, 400);
                }
                
                // Validate emoji (allow common emojis, max 10 chars)
                if (mb_strlen($emoji) > 10) {
                    sendResponse(false, 'Invalid emoji', null, 400);
                }
                
                // Verify message belongs to this conversation
                $stmt = $pdo->prepare("SELECT id FROM messages WHERE id = ? AND conversation_id = ?");
                $stmt->execute([$messageId, $dbConversationId]);
                if (!$stmt->fetch()) {
                    sendResponse(false, 'Message not found in this conversation', null, 404);
                }
                
                // Toggle: if reaction exists, remove it; otherwise add it
                $stmt = $pdo->prepare("SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?");
                $stmt->execute([$messageId, $user['id'], $emoji]);
                $existing = $stmt->fetch();
                
                if ($existing) {
                    $stmt = $pdo->prepare("DELETE FROM message_reactions WHERE id = ?");
                    $stmt->execute([$existing['id']]);
                    $actionType = 'removed';
                } else {
                    $stmt = $pdo->prepare("INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)");
                    $stmt->execute([$messageId, $user['id'], $emoji]);
                    $actionType = 'added';
                }
                
                // Get updated reactions for this message
                $stmt = $pdo->prepare("
                    SELECT emoji, GROUP_CONCAT(user_id) as user_ids, COUNT(*) as count
                    FROM message_reactions WHERE message_id = ? GROUP BY emoji
                ");
                $stmt->execute([$messageId]);
                $reactions = $stmt->fetchAll();
                
                $formattedReactions = [];
                foreach ($reactions as $r) {
                    $formattedReactions[] = [
                        'emoji' => $r['emoji'],
                        'count' => (int)$r['count'],
                        'user_ids' => array_map('intval', explode(',', $r['user_ids']))
                    ];
                }
                
                // Notify via Pusher
                triggerReactionUpdate($dbConversationId, [
                    'message_id' => $messageId,
                    'reactions' => $formattedReactions
                ]);
                
                sendResponse(true, 'Reaction ' . $actionType, [
                    'action' => $actionType,
                    'message_id' => $messageId,
                    'reactions' => $formattedReactions
                ]);
            } else {
                // Typing indicator (default)
                $isTyping = isset($data['is_typing']) && $data['is_typing'] === true;
                $stmt = $pdo->prepare("
                    INSERT INTO typing_indicators (conversation_id, user_id, is_typing)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE is_typing = ?, updated_at = NOW()
                ");
                $stmt->execute([$dbConversationId, $user['id'], $isTyping ? 1 : 0, $isTyping ? 1 : 0]);
                
                sendResponse(true, 'Typing indicator updated');
            }
            break;

        case 'DELETE':
            // Soft delete (hide) conversation for current user
            $conversationIdParam = $conversationId ?? null;
            if (!$conversationIdParam) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            if (is_numeric($conversationIdParam)) {
                // Numeric ID: hide a specific conversation row
                $dbConversationId = (int)$conversationIdParam;
                
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
                
                // Set the correct hidden flag and timestamp based on which user is deleting
                $hiddenCol = ($conv['owner_id'] == $user['id']) ? 'hidden_by_owner' : 'hidden_by_requester';
                $hiddenAtCol = ($conv['owner_id'] == $user['id']) ? 'hidden_at_owner' : 'hidden_at_requester';
                $stmt = $pdo->prepare("UPDATE conversations SET $hiddenCol = 1, $hiddenAtCol = NOW(), updated_at = NOW() WHERE id = ?");
                $stmt->execute([$dbConversationId]);
                
            } else if (strpos($conversationIdParam, 'conv_') === 0) {
                // conv_itemId_otherUserId format: hide ALL matching conversations
                $parts = explode('_', $conversationIdParam);
                if (count($parts) !== 3) {
                    sendResponse(false, 'Invalid conversation ID format', null, 400);
                }
                $itemId = (int)$parts[1];
                $otherUserId = (int)$parts[2];
                
                // Find which role the current user has in these conversations
                $stmt = $pdo->prepare("
                    SELECT id, owner_id, requester_id FROM conversations c
                    WHERE c.item_id = ? AND (c.owner_id = ? OR c.requester_id = ?) 
                    AND (c.owner_id = ? OR c.requester_id = ?)
                ");
                $stmt->execute([$itemId, $user['id'], $user['id'], $otherUserId, $otherUserId]);
                $convs = $stmt->fetchAll();
                
                if (count($convs) === 0) {
                    sendResponse(false, 'Conversation not found', null, 404);
                }
                
                // Hide ALL conversations for this item, setting the correct flag per role
                foreach ($convs as $c) {
                    $hiddenCol = ($c['owner_id'] == $user['id']) ? 'hidden_by_owner' : 'hidden_by_requester';
                    $hiddenAtCol = ($c['owner_id'] == $user['id']) ? 'hidden_at_owner' : 'hidden_at_requester';
                    $stmt = $pdo->prepare("UPDATE conversations SET $hiddenCol = 1, $hiddenAtCol = NOW(), updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$c['id']]);
                }
                
            } else {
                sendResponse(false, 'Invalid conversation ID format', null, 400);
            }
            
            sendResponse(true, 'Conversation deleted for you');
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'conversations');
} catch (Exception $e) {
    handleError($e, 'conversations');
} catch (Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(['success' => false, 'message' => 'Server error']);
}

