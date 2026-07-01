<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get all universities
            $stmt = $pdo->query("SELECT id, name, code FROM universities ORDER BY name");
            $universities = $stmt->fetchAll();
            
            sendResponse(true, 'Universities retrieved', $universities);
            break;
            
        case 'POST':
            // Create new university - DISABLED for security
            // Universities should be created manually by admin in database
            // To enable: add is_admin column to users table and check here
            sendResponse(false, 'University creation is restricted to administrators', null, 403);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'universities');
}

