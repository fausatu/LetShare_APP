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
            // Get all blocked users for the current user
            $stmt = $pdo->prepare("
                SELECT bu.id, bu.blocked_user_id, bu.created_at,
                       u.name as blocked_user_name, u.avatar as blocked_user_avatar
                FROM blocked_users bu
                INNER JOIN users u ON bu.blocked_user_id = u.id
                WHERE bu.blocking_user_id = ?
                ORDER BY bu.created_at DESC
            ");
            $stmt->execute([$user['id']]);
            $blockedUsers = $stmt->fetchAll();

            $formatted = array_map(function($b) {
                return [
                    'id' => (int)$b['id'],
                    'userId' => (int)$b['blocked_user_id'],
                    'name' => $b['blocked_user_name'],
                    'avatar' => $b['blocked_user_avatar'],
                    'blockedAt' => $b['created_at']
                ];
            }, $blockedUsers);

            sendResponse(true, 'Blocked users retrieved', $formatted);
            break;

        case 'POST':
            // Block a user
            $data = getRequestData();
            $blockedUserId = isset($data['user_id']) ? (int)$data['user_id'] : null;

            if (!$blockedUserId) {
                sendResponse(false, 'User ID is required', null, 400);
            }

            if ($blockedUserId === (int)$user['id']) {
                sendResponse(false, 'You cannot block yourself', null, 400);
            }

            // Verify target user exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$blockedUserId]);
            if (!$stmt->fetch()) {
                sendResponse(false, 'User not found', null, 404);
            }

            // Check if already blocked
            $stmt = $pdo->prepare("SELECT id FROM blocked_users WHERE blocking_user_id = ? AND blocked_user_id = ?");
            $stmt->execute([$user['id'], $blockedUserId]);
            if ($stmt->fetch()) {
                sendResponse(false, 'User is already blocked', null, 409);
            }

            // Block the user
            $stmt = $pdo->prepare("INSERT INTO blocked_users (blocking_user_id, blocked_user_id) VALUES (?, ?)");
            $stmt->execute([$user['id'], $blockedUserId]);

            sendResponse(true, 'User blocked successfully', null, 201);
            break;

        case 'DELETE':
            // Unblock a user
            $blockedUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

            if (!$blockedUserId) {
                sendResponse(false, 'User ID is required', null, 400);
            }

            $stmt = $pdo->prepare("DELETE FROM blocked_users WHERE blocking_user_id = ? AND blocked_user_id = ?");
            $stmt->execute([$user['id'], $blockedUserId]);

            if ($stmt->rowCount() === 0) {
                sendResponse(false, 'Block not found', null, 404);
            }

            sendResponse(true, 'User unblocked successfully');
            break;

        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e);
} catch (Exception $e) {
    sendResponse(false, 'An error occurred', null, 500);
}
