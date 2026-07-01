<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Require CSRF token for state-changing requests
if ($method !== 'GET') {
    requireCSRFToken();
}

try {
    $user = requireAuth();
} catch (Exception $e) {
    throw $e;
}

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'POST':
            // Submit post-exchange feedback/review to user_reviews
            $data = getRequestData();
            
            $conversationId = $data['conversation_id'] ?? null;
            $feedbackType = $data['feedback_type'] ?? 'positive';
            $rating = $data['rating'] ?? null;
            $feedbackText = trim($data['feedback_text'] ?? '');
            $wouldRecommend = isset($data['would_recommend']) ? (bool)$data['would_recommend'] : null;
            
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            if (!$rating || $rating < 1 || $rating > 5) {
                sendResponse(false, 'Rating must be between 1 and 5', null, 400);
            }
            
            if (empty($feedbackType) || !in_array($feedbackType, ['positive', 'neutral', 'negative'])) {
                sendResponse(false, 'Valid feedback_type is required', null, 400);
            }
            
            // Verify conversation exists and is completed
            $stmt = $pdo->prepare("SELECT owner_id, requester_id, status FROM conversations WHERE id = ?");
            $stmt->execute([$conversationId]);
            $conversation = $stmt->fetch();
            
            if (!$conversation) {
                sendResponse(false, 'Conversation not found', null, 404);
            }
            
            if ($conversation['owner_id'] != $user['id'] && $conversation['requester_id'] != $user['id']) {
                sendResponse(false, 'You are not part of this conversation', null, 403);
            }
            
            if ($conversation['status'] != 'completed') {
                sendResponse(false, 'Conversation must be completed to leave feedback', null, 400);
            }
            
            // Determine the reviewed user (the other party)
            $reviewedUserId = ($conversation['owner_id'] == $user['id']) ? $conversation['requester_id'] : $conversation['owner_id'];
            
            // Check if feedback already exists for this conversation
            $stmt = $pdo->prepare("SELECT id FROM user_reviews WHERE conversation_id = ? AND reviewer_user_id = ?");
            $stmt->execute([$conversationId, $user['id']]);
            if ($stmt->fetch()) {
                sendResponse(false, 'Feedback already submitted for this conversation', null, 409);
            }
            
            // Insert into user_reviews
            $stmt = $pdo->prepare("
                INSERT INTO user_reviews (reviewed_user_id, reviewer_user_id, conversation_id, rating, review_text, feedback_type, would_recommend)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$reviewedUserId, $user['id'], $conversationId, $rating, $feedbackText, $feedbackType, $wouldRecommend]);
            
            // Get reviewer name and item title for notification
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $reviewerData = $stmt->fetch();
            $reviewerName = $reviewerData ? $reviewerData['name'] : 'Someone';
            
            $stmt = $pdo->prepare("
                SELECT i.title as item_title, i.id as item_id
                FROM conversations c
                INNER JOIN items i ON c.item_id = i.id
                WHERE c.id = ?
            ");
            $stmt->execute([$conversationId]);
            $itemData = $stmt->fetch();
            $itemTitle = $itemData ? $itemData['item_title'] : 'an item';
            $itemId = $itemData ? $itemData['item_id'] : null;
            
            // Create notification for the reviewed user
            require_once 'notification_helper.php';
            $reviewedUserLang = getUserLanguage($pdo, $reviewedUserId);
            $notificationTitle = getNotifText('new_review', $reviewedUserLang);
            $notificationMessage = getNotifText('review_received', $reviewedUserLang, [
                'name' => $reviewerName,
                'rating' => $rating,
                'item' => $itemTitle
            ]);
            try {
                createNotification($pdo, $reviewedUserId, 'review', $notificationTitle, $notificationMessage, $itemId, $conversationId, $user['id']);
            } catch (Exception $e) {
                // Don't fail if notification fails
            }
            
            sendResponse(true, 'Feedback submitted successfully', ['id' => $pdo->lastInsertId()]);
            break;
            
        case 'GET':
            // Get feedback for a conversation
            $conversationId = $_GET['conversation_id'] ?? null;
            
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            $stmt = $pdo->prepare("
                SELECT ur.*, u.name as reviewer_name, u.avatar as reviewer_avatar
                FROM user_reviews ur
                INNER JOIN users u ON ur.reviewer_user_id = u.id
                WHERE ur.conversation_id = ?
                ORDER BY ur.created_at DESC
            ");
            $stmt->execute([$conversationId]);
            $feedback = $stmt->fetchAll();
            
            sendResponse(true, 'Feedback retrieved', $feedback);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'feedback');
}

