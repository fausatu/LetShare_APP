<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// For GET requests, allow public access (no auth required)
// For other methods (POST, DELETE, etc.), require authentication
$user = null;
if ($method !== 'GET') {
    $user = requireAuth();
} else {
    // Try to get current user, but don't require it
    $user = getCurrentUser();
}

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            $userId = $user ? $user['id'] : null;
            $filter = $_GET['filter'] ?? 'all'; // 'all', 'my', 'others'
            
            // Get user's university (only if user is logged in)
            $userUniversityId = null;
            if ($userId) {
                $stmt = $pdo->prepare("SELECT university_id FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $userData = $stmt->fetch();
                $userUniversityId = $userData['university_id'] ?? null;
            }
            
            // Advanced filters
            $typeFilter = $_GET['type'] ?? null; // 'donation', 'exchange', or null for all
            $departmentFilter = $_GET['department'] ?? null;
            $conditionFilter = $_GET['condition'] ?? null;
            $urgentOnly = isset($_GET['urgent']) && $_GET['urgent'] === 'true';
            $searchQuery = $_GET['search'] ?? null;
            
            if ($filter === 'my') {
                // Get user's own items (requires authentication)
                if (!$userId) {
                    sendResponse(false, 'Authentication required to view your items', null, 401);
                }
                
                $sql = "
                    SELECT i.*, 
                           u.name as user_name, 
                           u.department as user_department,
                           u.show_department as user_show_department,
                           u.avatar as user_avatar,
                           univ.name as university_name,
                           univ.logo as university_logo,
                           (SELECT COUNT(*) FROM interested_items WHERE item_id = i.id) as interested_count
                    FROM items i
                    INNER JOIN users u ON i.user_id = u.id
                    LEFT JOIN universities univ ON u.university_id = univ.id
                    WHERE i.user_id = ? AND i.status != 'deleted'
                ";
                $params = [$userId];
                
                // Apply filters
                if ($typeFilter && in_array($typeFilter, ['donation', 'exchange'])) {
                    $sql .= " AND i.type = ?";
                    $params[] = $typeFilter;
                }
                if ($departmentFilter) {
                    $sql .= " AND (i.department = ? OR u.department = ?)";
                    $params[] = $departmentFilter;
                    $params[] = $departmentFilter;
                }
                if ($conditionFilter && in_array($conditionFilter, ['new', 'excellent', 'good', 'fair', 'poor'])) {
                    $sql .= " AND i.condition_status = ?";
                    $params[] = $conditionFilter;
                }
                if ($urgentOnly) {
                    $sql .= " AND i.is_urgent = TRUE";
                }
                if ($searchQuery) {
                    $sql .= " AND (i.title LIKE ? OR i.description LIKE ?)";
                    $searchTerm = '%' . $searchQuery . '%';
                    $params[] = $searchTerm;
                    $params[] = $searchTerm;
                }
                
                $sql .= " ORDER BY i.created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            } else {
                // Get all active items (public view)
                $sql = "
                    SELECT i.*, 
                           u.name as user_name, 
                           u.department as user_department,
                           u.show_department as user_show_department,
                           u.avatar as user_avatar,
                           univ.name as university_name,
                           univ.logo as university_logo,
                           (SELECT COUNT(*) FROM interested_items WHERE item_id = i.id) as interested_count";
                
                // Only check if user is interested if user is logged in
                if ($userId) {
                    $sql .= ",
                           (SELECT COUNT(*) FROM interested_items WHERE user_id = ? AND item_id = i.id) as is_interested";
                } else {
                    $sql .= ", 0 as is_interested";
                }
                
                $sql .= "
                    FROM items i
                    INNER JOIN users u ON i.user_id = u.id
                    LEFT JOIN universities univ ON u.university_id = univ.id
                    WHERE i.status = 'active'";
                
                $params = [];
                
                // Add user_id to params for is_interested check if user is logged in (must be first)
                if ($userId) {
                    $params[] = $userId;
                }
                
                // Exclude user's own items only if user is logged in
                if ($userId) {
                    $sql .= " AND i.user_id != ?";
                    $params[] = $userId;
                }
                
                // Filter by university only if user is logged in
                if ($userId && $userUniversityId) {
                    $sql .= " AND u.university_id = ?";
                    $params[] = $userUniversityId;
                }
                
                // Apply filters
                if ($typeFilter && in_array($typeFilter, ['donation', 'exchange'])) {
                    $sql .= " AND i.type = ?";
                    $params[] = $typeFilter;
                }
                if ($departmentFilter) {
                    $sql .= " AND (i.department = ? OR u.department = ?)";
                    $params[] = $departmentFilter;
                    $params[] = $departmentFilter;
                }
                if ($conditionFilter && in_array($conditionFilter, ['new', 'excellent', 'good', 'fair', 'poor'])) {
                    $sql .= " AND i.condition_status = ?";
                    $params[] = $conditionFilter;
                }
                if ($urgentOnly) {
                    $sql .= " AND i.is_urgent = TRUE";
                }
                if ($searchQuery) {
                    $sql .= " AND (i.title LIKE ? OR i.description LIKE ?)";
                    $searchTerm = '%' . $searchQuery . '%';
                    $params[] = $searchTerm;
                    $params[] = $searchTerm;
                }
                
                $sql .= " ORDER BY i.is_urgent DESC, i.created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }
            $items = $stmt->fetchAll();
            
            // Format items for frontend and get multiple images
            $formattedItems = array_map(function($item) use ($pdo) {
                // Get all images for this item
                $stmt = $pdo->prepare("SELECT image_url FROM item_images WHERE item_id = ? ORDER BY display_order, id");
                $stmt->execute([$item['id']]);
                $images = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                // Log for debugging
                error_log('Item ' . $item['id'] . ' - Found ' . count($images) . ' images in item_images table');
                
                // If no images in item_images, use the old image field as fallback
                if (empty($images) && !empty($item['image'])) {
                    $images = [$item['image']];
                    error_log('Item ' . $item['id'] . ' - Using fallback single image from items.image field');
                }
                
                // Check if user allows showing their department
                $userShowDepartment = isset($item['user_show_department']) 
                    ? (bool)$item['user_show_department'] 
                    : true; // Default to true if undefined (backward compatibility)
                
                // Only use user_department if show_department is true, otherwise use empty string
                $userDepartment = ($userShowDepartment && !empty($item['user_department'])) 
                    ? $item['user_department'] 
                    : '';
                
                // Department: use item department if available, otherwise user department (only if shown)
                $department = !empty($item['department']) 
                    ? $item['department'] 
                    : $userDepartment;
                
                return [
                    'id' => (int)$item['id'],
                    'title' => $item['title'],
                    'type' => $item['type'],
                    'user' => $item['user_name'],
                    'user_avatar' => $item['user_avatar'] ?? null,
                    'userId' => (int)$item['user_id'],
                    'department' => $department,
                    'user_department' => $userDepartment, // Include separately for fallback in modal (respects privacy)
                    'image' => !empty($images) ? $images[0] : '', // First image for backward compatibility
                    'images' => $images, // All images
                    'time' => getTimeAgo($item['created_at']),
                    'created_at' => $item['created_at'],
                    'description' => $item['description'],
                    'condition_status' => $item['condition_status'] ?? null,
                    'is_urgent' => isset($item['is_urgent']) && $item['is_urgent'] == 1,
                    'color' => $item['color'] ?? ($item['type'] === 'donation' 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)'),
                    'rating' => 0,
                    'reviews' => 0,
                    'reviewsList' => [],
                    'isInterested' => isset($item['is_interested']) && $item['is_interested'] > 0,
                    'university_name' => $item['university_name'] ?? null,
                    'university_logo' => $item['university_logo'] ?? null
                ];
            }, $items);
            
            sendResponse(true, 'Items retrieved', $formattedItems);
            break;
            
        case 'POST':
            // Create new item
            $data = getRequestData();
            $title = trim($data['title'] ?? '');
            $type = $data['type'] ?? '';
            $description = trim($data['description'] ?? '');
            $images = $data['images'] ?? []; // Array of images
            $image = $data['image'] ?? ''; // Single image for backward compatibility
            $conditionStatus = $data['condition_status'] ?? null;
            $isUrgent = isset($data['is_urgent']) && $data['is_urgent'] === true;
            
            // Get user's university and department (for fallback)
            $stmt = $pdo->prepare("SELECT university_id, department FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $userData = $stmt->fetch();
            $userUniversityId = $userData['university_id'] ?? null;
            $userDepartment = $userData['department'] ?? '';
            
            // Get department from request if provided, otherwise use user's department as fallback
            $department = isset($data['department']) && trim($data['department']) !== '' 
                ? trim($data['department']) 
                : $userDepartment;
            
            if (empty($title) || empty($type) || !in_array($type, ['donation', 'exchange'])) {
                sendResponse(false, 'Title and type (donation/exchange) are required', null, 400);
            }
            
            // If images array is empty but single image is provided, use it
            if (empty($images) && !empty($image)) {
                $images = [$image];
            }
            
            $color = $type === 'donation' 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #60a5fa, #3b82f6)';
            
            // Use first image for backward compatibility with old image field
            $firstImage = !empty($images) ? $images[0] : '';
            
            $stmt = $pdo->prepare("
                INSERT INTO items (user_id, university_id, title, type, department, description, image, color, condition_status, is_urgent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $result = $stmt->execute([
                $user['id'], 
                $userUniversityId, 
                $title, 
                $type, 
                $department, 
                $description, 
                $firstImage, 
                $color,
                $conditionStatus,
                $isUrgent ? 1 : 0
            ]);
            
            if (!$result) {
                error_log('Failed to insert item: ' . implode(', ', $stmt->errorInfo()));
                sendResponse(false, 'Failed to create item', null, 500);
            }
            
            $itemId = $pdo->lastInsertId();
            
            // Insert multiple images
            if (!empty($images)) {
                // Ensure images is a numerically indexed array
                if (!is_array($images)) {
                    $images = [$images];
                }
                // Re-index array to ensure numeric keys (0, 1, 2, ...)
                $images = array_values($images);
                
                $stmt = $pdo->prepare("INSERT INTO item_images (item_id, image_url, display_order) VALUES (?, ?, ?)");
                $insertedCount = 0;
                $failedCount = 0;
                
                error_log('Inserting ' . count($images) . ' images for item ' . $itemId);
                
                foreach ($images as $index => $imgUrl) {
                    if (!empty(trim($imgUrl))) {
                        try {
                            // Truncate if too long (safety check, but LONGTEXT should handle it)
                            $imgUrlTrimmed = trim($imgUrl);
                            $stmt->execute([$itemId, $imgUrlTrimmed, $index]);
                            $insertedCount++;
                            error_log('Successfully inserted image ' . $index . ' for item ' . $itemId . ' (length: ' . strlen($imgUrlTrimmed) . ')');
                        } catch (PDOException $e) {
                            $failedCount++;
                            error_log('Error inserting image ' . $index . ' for item ' . $itemId . ': ' . $e->getMessage());
                            error_log('Image length: ' . strlen(trim($imgUrl)));
                            // Continue with other images even if one fails
                        }
                    }
                }
                error_log('Image insertion summary for item ' . $itemId . ': ' . $insertedCount . ' inserted, ' . $failedCount . ' failed out of ' . count($images) . ' total');
                if ($insertedCount === 0 && !empty($images)) {
                    error_log('Warning: No images were inserted for item ' . $itemId);
                }
            }
            
            // Get created item
            $stmt = $pdo->prepare("
                SELECT i.*, u.name as user_name, u.department as user_department
                FROM items i
                INNER JOIN users u ON i.user_id = u.id
                WHERE i.id = ?
            ");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            // Get images for the created item
            $stmt = $pdo->prepare("SELECT image_url FROM item_images WHERE item_id = ? ORDER BY display_order, id");
            $stmt->execute([$itemId]);
            $itemImages = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (empty($itemImages) && !empty($firstImage)) {
                $itemImages = [$firstImage];
            }
            
            $formattedItem = [
                'id' => (int)$item['id'],
                'title' => $item['title'],
                'type' => $item['type'],
                'user' => $item['user_name'],
                'user_avatar' => $item['user_avatar'] ?? null,
                'userId' => (int)$item['user_id'],
                'department' => $item['department'] ?? $item['user_department'] ?? '',
                'user_department' => $item['user_department'] ?? '', // Include separately for fallback in modal
                'image' => !empty($itemImages) ? $itemImages[0] : '',
                'images' => $itemImages,
                'time' => getTimeAgo($item['created_at']),
                'created_at' => $item['created_at'],
                'description' => $item['description'],
                'condition_status' => $conditionStatus,
                'is_urgent' => $isUrgent,
                'color' => $item['color'],
                'rating' => 0,
                'reviews' => 0,
                'reviewsList' => [],
                'isInterested' => false
            ];
            
            sendResponse(true, 'Item created successfully', $formattedItem, 201);
            break;
            
        case 'DELETE':
            // Delete item (soft delete - set status to 'deleted')
            $itemId = $_GET['id'] ?? null;
            
            if (!$itemId) {
                sendResponse(false, 'Item ID is required', null, 400);
            }
            
            // Verify ownership and get item details
            $stmt = $pdo->prepare("SELECT id, user_id, title, type FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            if (!$item) {
                sendResponse(false, 'Item not found', null, 404);
            }
            
            if ($item['user_id'] != $user['id']) {
                sendResponse(false, 'You can only delete your own items', null, 403);
            }
            
            // Get item details for notifications
            $itemTitle = $item['title'];
            $itemType = $item['type'] ?? 'exchange'; // 'donation' or 'exchange'
            $itemTypeText = ($itemType === 'donation') ? 'donation' : 'exchange';
            $ownerName = $user['name'];
            
            // 1. Mark item as deleted (soft delete)
            $stmt = $pdo->prepare("UPDATE items SET status = 'deleted' WHERE id = ?");
            $stmt->execute([$itemId]);
            
            // 2. Get all users with pending/accepted conversations BEFORE marking as cancelled
            $stmt = $pdo->prepare("
                SELECT DISTINCT requester_id as user_id 
                FROM conversations 
                WHERE item_id = ? AND status IN ('pending', 'accepted') AND requester_id != ?
                UNION
                SELECT DISTINCT owner_id as user_id 
                FROM conversations 
                WHERE item_id = ? AND status IN ('pending', 'accepted') AND owner_id != ?
            ");
            $stmt->execute([$itemId, $user['id'], $itemId, $user['id']]);
            $conversationUsers = $stmt->fetchAll();
            
            error_log('Found ' . count($conversationUsers) . ' users with conversations for item ' . $itemId);
            
            // 3. Mark all pending conversations as 'cancelled' (item_deleted)
            // First check what conversations exist
            $stmt = $pdo->prepare("SELECT id, status FROM conversations WHERE item_id = ?");
            $stmt->execute([$itemId]);
            $existingConversations = $stmt->fetchAll();
            error_log('Found ' . count($existingConversations) . ' conversations for item ' . $itemId);
            foreach ($existingConversations as $conv) {
                error_log('Conversation ID: ' . $conv['id'] . ', status: ' . $conv['status']);
            }
            
            // Now update them
            $stmt = $pdo->prepare("
                UPDATE conversations 
                SET status = 'cancelled', updated_at = NOW() 
                WHERE item_id = ? AND status IN ('pending', 'accepted')
            ");
            $stmt->execute([$itemId]);
            $affectedConversations = $stmt->rowCount();
            error_log('UPDATE query executed. Affected rows: ' . $affectedConversations);
            
            // Verify the update
            $stmt = $pdo->prepare("SELECT id, status FROM conversations WHERE item_id = ?");
            $stmt->execute([$itemId]);
            $updatedConversations = $stmt->fetchAll();
            error_log('After update, conversations for item ' . $itemId . ':');
            foreach ($updatedConversations as $conv) {
                error_log('Conversation ID: ' . $conv['id'] . ', status: ' . $conv['status']);
            }
            
            // 4. Get all users who have this item in their interested list
            $stmt = $pdo->prepare("SELECT user_id FROM interested_items WHERE item_id = ?");
            $stmt->execute([$itemId]);
            $interestedUsers = $stmt->fetchAll();
            
            error_log('Found ' . count($interestedUsers) . ' interested users for item ' . $itemId);
            
            // 5. Combine interested users and conversation users, avoiding duplicates
            $allUsersToNotify = [];
            $userIdsProcessed = [];
            
            // Add interested users
            foreach ($interestedUsers as $interestedUser) {
                $userId = $interestedUser['user_id'];
                if (!in_array($userId, $userIdsProcessed)) {
                    $allUsersToNotify[] = ['user_id' => $userId, 'has_interested' => true, 'has_conversation' => false];
                    $userIdsProcessed[] = $userId;
                }
            }
            
            // Add conversation users
            foreach ($conversationUsers as $convUser) {
                $userId = $convUser['user_id'];
                if (!in_array($userId, $userIdsProcessed)) {
                    $allUsersToNotify[] = ['user_id' => $userId, 'has_interested' => false, 'has_conversation' => true];
                    $userIdsProcessed[] = $userId;
                } else {
                    // User already in list (has both interested and conversation), mark as both
                    foreach ($allUsersToNotify as &$user) {
                        if ($user['user_id'] == $userId) {
                            $user['has_conversation'] = true;
                            break;
                        }
                    }
                }
            }
            
            error_log('Total unique users to notify: ' . count($allUsersToNotify));
            
            // 6. Notify all users and remove from interested list
            require_once 'notification_helper.php';
            $notifiedCount = 0;
            $removedCount = 0;
            
            foreach ($allUsersToNotify as $userToNotify) {
                $userId = $userToNotify['user_id'];
                $hasInterested = $userToNotify['has_interested'];
                $hasConversation = $userToNotify['has_conversation'];
                error_log('Processing user: ' . $userId . ' (interested: ' . ($hasInterested ? 'yes' : 'no') . ', conversation: ' . ($hasConversation ? 'yes' : 'no') . ')');
                
                // Create notification (one notification per user, regardless of whether they have both interested and conversation)
                try {
                    error_log('Creating notification for user ' . $userId);
                    $notificationId = createNotification(
                        $pdo, 
                        $userId, 
                        'item_deleted', 
                        'Item No Longer Available', 
                        'The ' . $itemTypeText . ' "' . $itemTitle . '" is no longer available.',
                        $itemId, 
                        null, 
                        $user['id']
                    );
                    error_log('Notification created successfully with ID: ' . $notificationId);
                    $notifiedCount++;
                } catch (Exception $e) {
                    error_log('ERROR creating notification for user ' . $userId . ': ' . $e->getMessage());
                    error_log('Stack trace: ' . $e->getTraceAsString());
                }
                
                // Remove from interested list if user had item in interested
                if ($hasInterested) {
                    try {
                        $stmt = $pdo->prepare("DELETE FROM interested_items WHERE user_id = ? AND item_id = ?");
                        $stmt->execute([$userId, $itemId]);
                        if ($stmt->rowCount() > 0) {
                            error_log('Removed item ' . $itemId . ' from interested list of user ' . $userId);
                            $removedCount++;
                        }
                    } catch (Exception $e) {
                        error_log('ERROR removing item from interested list for user ' . $userId . ': ' . $e->getMessage());
                    }
                }
            }
            
            error_log('Summary: Notified ' . $notifiedCount . ' users, removed from ' . $removedCount . ' interested lists');
            
            sendResponse(true, 'Item deleted successfully', [
                'conversations_cancelled' => $affectedConversations,
                'interested_users_count' => count($interestedUsers),
                'interested_users_notified' => $notifiedCount,
                'interested_items_removed' => $removedCount
            ]);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'items');
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

