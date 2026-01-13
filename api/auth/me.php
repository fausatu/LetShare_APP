<?php
require_once __DIR__ . '/../config.php';

$user = requireAuth();

try {
    $pdo = getDBConnection();
    
    // Get terms acceptance status
    $stmt = $pdo->prepare("SELECT terms_accepted_at FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $result = $stmt->fetch();
    
    // Check if terms acceptance is required
    $termsRequired = empty($result['terms_accepted_at']);
    
    sendResponse(true, 'User data retrieved', [
        'user' => $user,
        'terms_required' => $termsRequired
    ]);
} catch (PDOException $e) {
    error_log("Database error in me.php: " . $e->getMessage());
    // Fallback: send user data without terms check
    sendResponse(true, 'User data retrieved', ['user' => $user]);
}
