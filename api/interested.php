<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get all items the user is interested in
            $userId = $user['id'];
            
            $stmt = $pdo->prepare("
                SELECT i.*, 
                       u.name as user_name, 
                       u.department as user_department,
                       u.avatar as user_avatar,
                       ii.created_at as interested_at
                FROM interested_items ii
                INNER JOIN items i ON ii.item_id = i.id
                INNER JOIN users u ON i.user_id = u.id
                WHERE ii.user_id = ? AND i.status != 'deleted'
                ORDER BY ii.created_at DESC
            ");
            $stmt->execute([$userId]);
            $items = $stmt->fetchAll();
            
            // Format items for frontend
            $formattedItems = array_map(function($item) {
                return [
                    'id' => (int)$item['id'],
                    'title' => $item['title'],
                    'type' => $item['type'],
                    'user' => $item['user_name'],
                    'department' => $item['department'] ?? $item['user_department'],
                    'image' => $item['image'] ?? '',
                    'time' => getTimeAgo($item['interested_at']),
                    'interested_at' => $item['interested_at'], // Add for client-side formatting
                    'description' => $item['description'],
                    'color' => $item['color'] ?? ($item['type'] === 'donation' 
                        ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)'),
                    'unavailable' => $item['status'] !== 'active'
                ];
            }, $items);
            
            sendResponse(true, 'Interested items retrieved', $formattedItems);
            break;
            
        case 'POST':
            // Add item to interested list
            $data = getRequestData();
            $itemId = $data['item_id'] ?? null;
            
            if (!$itemId) {
                sendResponse(false, 'Item ID is required', null, 400);
            }
            
            // Check if item exists and is active
            $stmt = $pdo->prepare("SELECT id, user_id, status FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            if (!$item) {
                sendResponse(false, 'Item not found', null, 404);
            }
            
            if ($item['user_id'] == $user['id']) {
                sendResponse(false, 'You cannot mark your own item as interested', null, 400);
            }
            
            if ($item['status'] !== 'active') {
                sendResponse(false, 'Item is no longer available', null, 400);
            }
            
            // Check if already interested
            $stmt = $pdo->prepare("SELECT id FROM interested_items WHERE user_id = ? AND item_id = ?");
            $stmt->execute([$user['id'], $itemId]);
            if ($stmt->fetch()) {
                sendResponse(false, 'Item already in interested list', null, 409);
            }
            
            // Add to interested list
            $stmt = $pdo->prepare("INSERT INTO interested_items (user_id, item_id) VALUES (?, ?)");
            $stmt->execute([$user['id'], $itemId]);
            
            sendResponse(true, 'Item added to interested list', null, 201);
            break;
            
        case 'DELETE':
            // Remove item from interested list
            $itemId = $_GET['item_id'] ?? null;
            
            if (!$itemId) {
                sendResponse(false, 'Item ID is required', null, 400);
            }
            
            $stmt = $pdo->prepare("DELETE FROM interested_items WHERE user_id = ? AND item_id = ?");
            $stmt->execute([$user['id'], $itemId]);
            
            if ($stmt->rowCount() > 0) {
                sendResponse(true, 'Item removed from interested list');
            } else {
                sendResponse(false, 'Item not found in interested list', null, 404);
            }
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'interested');
}

/**
 * Get time ago string
 */
function getTimeAgo($datetime) {
    $timestamp = strtotime($datetime);
    $diff = time() - $timestamp;
    
    if ($diff < 60) return 'just now';
    if ($diff < 3600) return floor($diff / 60) . 'm';
    if ($diff < 86400) return floor($diff / 3600) . 'h';
    if ($diff < 604800) return floor($diff / 86400) . 'd';
    
    return date('M d', $timestamp);
}

