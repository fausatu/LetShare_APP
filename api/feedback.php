<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'POST':
            // Submit post-exchange feedback
            $data = getRequestData();
            $conversationId = $data['conversation_id'] ?? null;
            $feedbackType = $data['feedback_type'] ?? '';
            $rating = $data['rating'] ?? null;
            $feedbackText = trim($data['feedback_text'] ?? '');
            $wouldRecommend = isset($data['would_recommend']) ? (bool)$data['would_recommend'] : null;
            
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            if (empty($feedbackType) || !in_array($feedbackType, ['positive', 'neutral', 'negative'])) {
                sendResponse(false, 'Valid feedback_type is required', null, 400);
            }
            
            // Verify user is part of the conversation
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
            
            // Check if feedback already exists
            $stmt = $pdo->prepare("SELECT id FROM exchange_feedback WHERE conversation_id = ? AND user_id = ?");
            $stmt->execute([$conversationId, $user['id']]);
            if ($stmt->fetch()) {
                sendResponse(false, 'Feedback already submitted for this conversation', null, 409);
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO exchange_feedback (conversation_id, user_id, feedback_type, rating, feedback_text, would_recommend)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$conversationId, $user['id'], $feedbackType, $rating, $feedbackText, $wouldRecommend]);
            
            sendResponse(true, 'Feedback submitted successfully', ['id' => $pdo->lastInsertId()]);
            break;
            
        case 'GET':
            // Get feedback for a conversation
            $conversationId = $_GET['conversation_id'] ?? null;
            
            if (!$conversationId) {
                sendResponse(false, 'Conversation ID is required', null, 400);
            }
            
            $stmt = $pdo->prepare("
                SELECT ef.*, u.name as user_name
                FROM exchange_feedback ef
                INNER JOIN users u ON ef.user_id = u.id
                WHERE ef.conversation_id = ?
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

