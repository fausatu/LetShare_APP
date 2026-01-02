<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get matching/suggested items for user
            $limit = (int)($_GET['limit'] ?? 10);
            
            // Get user's university
            $stmt = $pdo->prepare("SELECT university_id, department FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $userData = $stmt->fetch();
            
            if (!$userData || !$userData['university_id']) {
                sendResponse(false, 'User university not set', null, 400);
            }
            
            // Get user's search preferences
            $stmt = $pdo->prepare("SELECT preferred_departments, preferred_item_types FROM user_search_preferences WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $preferences = $stmt->fetch();
            
            // Build query for matching items
            $sql = "
                SELECT i.*, 
                       u.name as user_name,
                       u.department as user_department,
                       (SELECT COUNT(*) FROM interested_items WHERE item_id = i.id) as interested_count,
                       (SELECT COUNT(*) FROM interested_items WHERE user_id = ? AND item_id = i.id) as is_interested
                FROM items i
                INNER JOIN users u ON i.user_id = u.id
                WHERE i.status = 'active' 
                AND i.user_id != ?
                AND u.university_id = ?
            ";
            
            $params = [$user['id'], $user['id'], $userData['university_id']];
            
            // Add department filter if user has preferences
            if ($preferences && !empty($preferences['preferred_departments'])) {
                $departments = json_decode($preferences['preferred_departments'], true);
                if (is_array($departments) && !empty($departments)) {
                    $placeholders = implode(',', array_fill(0, count($departments), '?'));
                    $sql .= " AND (i.department IN ($placeholders) OR u.department IN ($placeholders))";
                    $params = array_merge($params, $departments, $departments);
                }
            } elseif ($userData['department']) {
                // If no preferences, match user's department
                $sql .= " AND (i.department = ? OR u.department = ?)";
                $params[] = $userData['department'];
                $params[] = $userData['department'];
            }
            
            // Add type filter if user has preferences
            if ($preferences && !empty($preferences['preferred_item_types'])) {
                $types = json_decode($preferences['preferred_item_types'], true);
                if (is_array($types) && !empty($types)) {
                    $placeholders = implode(',', array_fill(0, count($types), '?'));
                    $sql .= " AND i.type IN ($placeholders)";
                    $params = array_merge($params, $types);
                }
            }
            
            // Order by relevance (items with same department first, then by creation date)
            $sql .= " ORDER BY 
                CASE WHEN i.department = ? THEN 0 ELSE 1 END,
                i.created_at DESC
                LIMIT ?
            ";
            $params[] = $userData['department'];
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll();
            
            // Format items
            require_once 'items.php'; // For getTimeAgo function if needed
            $formattedItems = array_map(function($item) {
                return [
                    'id' => (int)$item['id'],
                    'title' => $item['title'],
                    'type' => $item['type'],
                    'user' => $item['user_name'],
                    'userId' => (int)$item['user_id'],
                    'department' => $item['department'] ?? $item['user_department'],
                    'image' => $item['image'] ?? '',
                    'time' => getTimeAgo($item['created_at']),
                    'created_at' => $item['created_at'],
                    'description' => $item['description'],
                    'color' => $item['color'] ?? ($item['type'] === 'donation' 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)'),
                    'isInterested' => isset($item['is_interested']) && $item['is_interested'] > 0,
                    'match_reason' => 'Based on your preferences and department'
                ];
            }, $items);
            
            sendResponse(true, 'Matching items retrieved', $formattedItems);
            break;
            
        case 'POST':
            // Save user search preferences
            $data = getRequestData();
            $preferredDepartments = isset($data['preferred_departments']) ? json_encode($data['preferred_departments']) : null;
            $preferredItemTypes = isset($data['preferred_item_types']) ? json_encode($data['preferred_item_types']) : null;
            $savedSearches = isset($data['saved_searches']) ? json_encode($data['saved_searches']) : null;
            
            $stmt = $pdo->prepare("
                INSERT INTO user_search_preferences (user_id, preferred_departments, preferred_item_types, saved_searches)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    preferred_departments = VALUES(preferred_departments),
                    preferred_item_types = VALUES(preferred_item_types),
                    saved_searches = VALUES(saved_searches),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$user['id'], $preferredDepartments, $preferredItemTypes, $savedSearches]);
            
            sendResponse(true, 'Preferences saved');
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'matching');
}

