<?php
/**
 * Get all university email domains for client-side validation
 */

// Set CORS headers
header('Access-Control-Allow-Origin: https://letshare.infinityfreeapp.com');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Only GET requests are accepted.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    require_once __DIR__ . '/config.php';
    
    $pdo = getDBConnection();
    
    // Get all active universities and their email domains
    $stmt = $pdo->prepare("
        SELECT email_domains 
        FROM universities 
        WHERE is_active = TRUE
    ");
    $stmt->execute();
    $universities = $stmt->fetchAll();
    
    $allDomains = [];
    
    foreach ($universities as $university) {
        $emailDomains = json_decode($university['email_domains'], true);
        if (is_array($emailDomains)) {
            $allDomains = array_merge($allDomains, $emailDomains);
        }
    }
    
    // Remove duplicates and sort
    $allDomains = array_unique($allDomains);
    sort($allDomains);
    
    echo json_encode([
        'success' => true,
        'data' => $allDomains
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Database error in get_university_domains: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error. Please try again later.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log('Error in get_university_domains: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred. Please try again later.'
    ], JSON_UNESCAPED_UNICODE);
}
?>