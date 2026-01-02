<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'POST':
            // Update user's last_seen (heartbeat)
            $stmt = $pdo->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            sendResponse(true, 'Presence updated', [
                'last_seen' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'GET':
            // Get online status of users
            $userIds = $_GET['user_ids'] ?? null;
            
            if (!$userIds) {
                sendResponse(false, 'User IDs are required', null, 400);
            }
            
            // Parse comma-separated user IDs
            $ids = array_map('intval', explode(',', $userIds));
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            
            $stmt = $pdo->prepare("
                SELECT id, name, last_seen,
                       CASE 
                           WHEN last_seen IS NULL THEN 0
                           WHEN TIMESTAMPDIFF(SECOND, last_seen, NOW()) <= 300 THEN 1
                           ELSE 0
                       END as is_online
                FROM users
                WHERE id IN ($placeholders)
            ");
            $stmt->execute($ids);
            $users = $stmt->fetchAll();
            
            $result = [];
            foreach ($users as $u) {
                $result[$u['id']] = [
                    'id' => (int)$u['id'],
                    'name' => $u['name'],
                    'last_seen' => $u['last_seen'],
                    'is_online' => (bool)$u['is_online']
                ];
            }
            
            sendResponse(true, 'Presence retrieved', $result);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'presence');
}

