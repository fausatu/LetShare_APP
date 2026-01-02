<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'POST':
            // Create a moderation report
            $data = getRequestData();
            $reportedItemId = $data['reported_item_id'] ?? null;
            $reportedUserId = $data['reported_user_id'] ?? null;
            $reportType = $data['report_type'] ?? '';
            $description = trim($data['description'] ?? '');
            
            if (!$reportedItemId && !$reportedUserId) {
                sendResponse(false, 'Either reported_item_id or reported_user_id is required', null, 400);
            }
            
            if (empty($reportType) || !in_array($reportType, ['inappropriate_content', 'spam', 'fraud', 'harassment', 'other'])) {
                sendResponse(false, 'Valid report_type is required', null, 400);
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO moderation_reports (reporter_user_id, reported_item_id, reported_user_id, report_type, description)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$user['id'], $reportedItemId, $reportedUserId, $reportType, $description]);
            
            sendResponse(true, 'Report submitted successfully', ['id' => $pdo->lastInsertId()]);
            break;
            
        case 'GET':
            // Get reports (admin only - for now, return user's own reports)
            $stmt = $pdo->prepare("
                SELECT * FROM moderation_reports 
                WHERE reporter_user_id = ?
                ORDER BY created_at DESC
            ");
            $stmt->execute([$user['id']]);
            $reports = $stmt->fetchAll();
            
            sendResponse(true, 'Reports retrieved', $reports);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'moderation');
}

