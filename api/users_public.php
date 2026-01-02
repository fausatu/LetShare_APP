<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get total user count
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM users");
            $stmt->execute();
            $totalResult = $stmt->fetch();
            $totalUsers = (int)$totalResult['total'];
            
            // Get up to 4 users with avatars (or all if less than 4)
            $limit = min(4, $totalUsers);
            $stmt = $pdo->prepare("
                SELECT id, name, avatar 
                FROM users 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $users = $stmt->fetchAll();
            
            // Format users data
            $formattedUsers = array_map(function($user) {
                return [
                    'id' => (int)$user['id'],
                    'name' => $user['name'],
                    'avatar' => $user['avatar'],
                    'initials' => strtoupper(substr($user['name'], 0, 2))
                ];
            }, $users);
            
            sendResponse(true, 'Users retrieved', [
                'users' => $formattedUsers,
                'total' => $totalUsers,
                'displayed' => count($formattedUsers)
            ]);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'users_public');
}

