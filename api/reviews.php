<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Require CSRF token for state-changing requests
if ($method !== 'GET') {
    requireAuth();
    requireCSRFToken();
}

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get reviews for a specific user (public access - no authentication required)
            $userId = $_GET['user_id'] ?? null;
            
            if (!$userId) {
                sendResponse(false, 'User ID is required', null, 400);
            }
            
            // Get reviews with reviewer information
            $stmt = $pdo->prepare("
                SELECT r.*,
                       reviewer.name as reviewer_name,
                       reviewer.avatar as reviewer_avatar
                FROM user_reviews r
                INNER JOIN users reviewer ON r.reviewer_user_id = reviewer.id
                WHERE r.reviewed_user_id = ?
                ORDER BY r.created_at DESC
            ");
            $stmt->execute([$userId]);
            $reviews = $stmt->fetchAll();
            
            // Calculate average rating
            $stmt = $pdo->prepare("
                SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
                FROM user_reviews
                WHERE reviewed_user_id = ?
            ");
            $stmt->execute([$userId]);
            $ratingData = $stmt->fetch();
            
            // Format reviews for frontend
            $formattedReviews = array_map(function($review) {
                return [
                    'id' => (int)$review['id'],
                    'reviewer' => $review['reviewer_name'],
                    'reviewerId' => (int)$review['reviewer_user_id'],
                    'reviewerAvatar' => $review['reviewer_avatar'] ?? null,
                    'conversationId' => isset($review['conversation_id']) ? (int)$review['conversation_id'] : null,
                    'rating' => (int)$review['rating'],
                    'text' => $review['review_text'] ?? '',
                    'date' => getTimeAgo($review['created_at'])
                ];
            }, $reviews);
            
            sendResponse(true, 'Reviews retrieved', [
                'reviews' => $formattedReviews,
                'rating' => [
                    'average' => round($ratingData['avg_rating'] ?? 0, 1),
                    'count' => (int)($ratingData['review_count'] ?? 0)
                ]
            ]);
            break;
            
        case 'POST':
            // Create a new review (requires authentication)
            $user = requireAuth();
            // Create a new review
            $data = getRequestData();
            $reviewedUserId = $data['reviewed_user_id'] ?? null;
            $conversationId = $data['conversation_id'] ?? null;
            $rating = $data['rating'] ?? null;
            $reviewText = $data['review_text'] ?? '';
            $feedbackType = $data['feedback_type'] ?? 'positive';
            $wouldRecommend = isset($data['would_recommend']) ? (bool)$data['would_recommend'] : null;
            
            if (!$reviewedUserId) {
                sendResponse(false, 'Reviewed user ID is required', null, 400);
            }
            
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            if (!$rating || $rating < 1 || $rating > 5) {
                sendResponse(false, 'Rating must be between 1 and 5', null, 400);
            }
            
            // Check if user is trying to review themselves
            if ($reviewedUserId == $user['id']) {
                sendResponse(false, 'You cannot review yourself', null, 400);
            }
            
            // Verify the conversation exists and is completed
            $stmt = $pdo->prepare("
                SELECT id, owner_id, requester_id, status FROM conversations
                WHERE id = ? AND status = 'completed'
            ");
            $stmt->execute([$conversationId]);
            $conversation = $stmt->fetch();
            
            if (!$conversation) {
                sendResponse(false, 'Conversation not found or not completed', null, 404);
            }
            
            // Verify the user is part of this conversation
            $isOwner = $conversation['owner_id'] == $user['id'];
            $isRequester = $conversation['requester_id'] == $user['id'];
            
            if (!$isOwner && !$isRequester) {
                sendResponse(false, 'You are not part of this conversation', null, 403);
            }
            
            // Verify the reviewed user is the other party in the conversation
            $actualReviewedUserId = $isOwner ? $conversation['requester_id'] : $conversation['owner_id'];
            if ($actualReviewedUserId != $reviewedUserId) {
                sendResponse(false, 'Reviewed user ID does not match conversation', null, 400);
            }
            
            // Check if user has already reviewed this specific conversation
            $stmt = $pdo->prepare("
                SELECT id FROM user_reviews 
                WHERE reviewer_user_id = ? AND conversation_id = ?
            ");
            $stmt->execute([$user['id'], $conversationId]);
            if ($stmt->fetch()) {
                sendResponse(false, 'You have already reviewed this exchange', null, 409);
            }
            
            // Get conversation item title for notification
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
            
            // Get reviewer name for notification
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $reviewerData = $stmt->fetch();
            $reviewerName = $reviewerData ? $reviewerData['name'] : 'Someone';
            
            // Create review
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO user_reviews (reviewed_user_id, reviewer_user_id, conversation_id, rating, review_text, feedback_type, would_recommend)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$reviewedUserId, $user['id'], $conversationId, $rating, trim($reviewText), $feedbackType, $wouldRecommend]);
                
                $reviewId = (int)$pdo->lastInsertId();
                
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
                    // Don't fail the review creation if notification fails
                }
                
                sendResponse(true, 'Review created successfully', [
                    'id' => $reviewId
                ], 201);
            } catch (PDOException $e) {
                // Check if error is due to missing conversation_id column
                if (strpos($e->getMessage(), 'conversation_id') !== false || 
                    strpos($e->getMessage(), 'Unknown column') !== false) {
                    sendResponse(false, 'Database migration required: conversation_id column is missing. Please run the migration script.', null, 500);
                } else {
                    throw $e; // Re-throw other database errors
                }
            }
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'reviews');
} catch (Exception $e) {
    handleError($e, 'reviews');
}

/**
 * Get time ago string
 */
function getTimeAgo($datetime) {
    $timestamp = strtotime($datetime);
    $diff = time() - $timestamp;
    
    if ($diff < 60) return 'just now';
    if ($diff < 3600) return floor($diff / 60) . 'm ago';
    if ($diff < 86400) return floor($diff / 3600) . 'h ago';
    if ($diff < 604800) return floor($diff / 86400) . 'd ago';
    if ($diff < 2592000) return floor($diff / 604800) . 'w ago';
    if ($diff < 31536000) return floor($diff / 2592000) . 'mo ago';
    
    return floor($diff / 31536000) . 'y ago';
}

