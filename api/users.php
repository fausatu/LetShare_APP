<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get user profile
            $userId = $_GET['id'] ?? ($_GET['user_id'] ?? $user['id']);
            
            $stmt = $pdo->prepare("
                SELECT u.id, u.name, u.email, u.department, u.avatar, u.language, u.created_at, u.university_id,
                       u.show_department, u.show_email, u.allow_messages_from_anyone, u.terms_accepted_at, u.terms_version,
                       u.auto_delete_rejected_conversations,
                       univ.name as university_name, univ.code as university_code, univ.logo as university_logo
                FROM users u
                LEFT JOIN universities univ ON u.university_id = univ.id
                WHERE u.id = ?
            ");
            $stmt->execute([$userId]);
            $userData = $stmt->fetch();
            
            // Convert boolean fields
            if ($userData) {
                $userData['show_department'] = (bool)($userData['show_department'] ?? true);
                $userData['show_email'] = (bool)($userData['show_email'] ?? false);
                $userData['allow_messages_from_anyone'] = (bool)($userData['allow_messages_from_anyone'] ?? true);
                $userData['auto_delete_rejected_conversations'] = (bool)($userData['auto_delete_rejected_conversations'] ?? true);
                
                // Check if terms acceptance is required
                $userData['terms_required'] = empty($userData['terms_accepted_at']);
                
                // Keep terms_accepted_at and terms_version for settings display
                // Only viewing own profile should see this sensitive info
                if ($userId != $user['id']) {
                    unset($userData['terms_accepted_at']);
                    unset($userData['terms_version']);
                }
            }
            
            if (!$userData) {
                sendResponse(false, 'User not found', null, 404);
            }
            
            // Get user stats
            $stmt = $pdo->prepare("
                SELECT 
                    (SELECT COUNT(*) FROM items WHERE user_id = ? AND status = 'active') as posted_count,
                    (SELECT COUNT(*) FROM interested_items WHERE user_id = ?) as interested_count,
                    (SELECT COUNT(*) FROM conversations WHERE (owner_id = ? OR requester_id = ?) AND status = 'completed') as exchanges_done
            ");
            $stmt->execute([$userId, $userId, $userId, $userId]);
            $stats = $stmt->fetch();
            
            // Get average rating
            $stmt = $pdo->prepare("
                SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
                FROM user_reviews WHERE reviewed_user_id = ?
            ");
            $stmt->execute([$userId]);
            $ratingData = $stmt->fetch();
            
            $userData['stats'] = [
                'posted' => (int)$stats['posted_count'],
                'interested' => (int)$stats['interested_count'],
                'exchanges_done' => (int)$stats['exchanges_done']
            ];
            
            $userData['rating'] = [
                'average' => round($ratingData['avg_rating'] ?? 0, 1),
                'count' => (int)($ratingData['review_count'] ?? 0)
            ];
            
            sendResponse(true, 'User data retrieved', $userData);
            break;
            
        case 'PUT':
            // Update user profile
            $data = getRequestData();
            
            $updates = [];
            $params = [];
            
            if (isset($data['name'])) {
                $updates[] = "name = ?";
                $params[] = trim($data['name']);
            }
            
            if (isset($data['email'])) {
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    sendResponse(false, 'Invalid email format', null, 400);
                }
                $updates[] = "email = ?";
                $params[] = trim($data['email']);
            }
            
            if (isset($data['department'])) {
                $updates[] = "department = ?";
                $params[] = trim($data['department']);
            }
            
            if (isset($data['avatar'])) {
                $updates[] = "avatar = ?";
                $params[] = $data['avatar'];
            }
            
            if (isset($data['language'])) {
                $updates[] = "language = ?";
                $params[] = $data['language'];
            }
            
            if (isset($data['university_id'])) {
                $updates[] = "university_id = ?";
                $params[] = (int)$data['university_id'];
            }
            
            // Privacy settings
            if (isset($data['show_department'])) {
                $updates[] = "show_department = ?";
                $params[] = (bool)$data['show_department'] ? 1 : 0;
            }
            
            if (isset($data['show_email'])) {
                $updates[] = "show_email = ?";
                $params[] = (bool)$data['show_email'] ? 1 : 0;
            }
            
            if (isset($data['allow_messages_from_anyone'])) {
                $updates[] = "allow_messages_from_anyone = ?";
                $params[] = (bool)$data['allow_messages_from_anyone'] ? 1 : 0;
            }
            
            // Conversation management settings
            if (isset($data['auto_delete_rejected_conversations'])) {
                $updates[] = "auto_delete_rejected_conversations = ?";
                $params[] = (bool)$data['auto_delete_rejected_conversations'] ? 1 : 0;
            }
            
            if (empty($updates)) {
                sendResponse(false, 'No fields to update', null, 400);
            }
            
            $params[] = $user['id'];
            
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            // Get updated user
            $stmt = $pdo->prepare("
                SELECT u.id, u.name, u.email, u.department, u.avatar, u.language, u.university_id,
                       u.show_department, u.show_email, u.allow_messages_from_anyone,
                       u.auto_delete_rejected_conversations,
                       univ.name as university_name, univ.code as university_code, univ.logo as university_logo
                FROM users u
                LEFT JOIN universities univ ON u.university_id = univ.id
                WHERE u.id = ?
            ");
            $stmt->execute([$user['id']]);
            $updatedUser = $stmt->fetch();
            
            // Convert boolean fields
            if ($updatedUser) {
                $updatedUser['show_department'] = (bool)($updatedUser['show_department'] ?? true);
                $updatedUser['show_email'] = (bool)($updatedUser['show_email'] ?? false);
                $updatedUser['allow_messages_from_anyone'] = (bool)($updatedUser['allow_messages_from_anyone'] ?? true);
                $updatedUser['auto_delete_rejected_conversations'] = (bool)($updatedUser['auto_delete_rejected_conversations'] ?? true);
            }
            
            sendResponse(true, 'Profile updated successfully', $updatedUser);
            break;
            
        case 'DELETE':
            // Delete user account (soft delete - mark as deleted)
            // Note: In production,  i want to anonymize data instead of hard delete
            // to preserve referential integrity and historical data
            
            // First, verify user wants to delete (could add password confirmation here)
            $data = getRequestData();
            $confirmDelete = $data['confirm'] ?? false;
            
            if (!$confirmDelete) {
                sendResponse(false, 'Account deletion must be confirmed', null, 400);
            }
            
            $userId = $user['id'];
            
            // Soft delete: Mark user as deleted (you could add a 'deleted' status or 'deleted_at' timestamp)
            // For now, we'll use a soft delete approach by setting email to a deleted marker
            // In production, consider adding a 'deleted_at' timestamp column
            
            // Option 1: Mark email as deleted (prevents login but keeps data)
            $deletedEmail = 'deleted_' . $userId . '_' . time() . '@deleted.local';
            $stmt = $pdo->prepare("UPDATE users SET email = ?, name = 'Deleted User', avatar = NULL WHERE id = ?");
            $stmt->execute([$deletedEmail, $userId]);
            
            // Option 2: Hard delete (uncomment if you want to completely remove user)
            // Note: This will cascade delete due to foreign keys
            // $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            // $stmt->execute([$userId]);
            
            // Destroy session
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_destroy();
            }
            
            sendResponse(true, 'Account deleted successfully');
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'users');
}

