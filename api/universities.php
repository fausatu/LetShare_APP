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
            // Create new university (admin only - for now, allow any authenticated user)
            $user = requireAuth();
            $data = getRequestData();
            $name = trim($data['name'] ?? '');
            $code = trim($data['code'] ?? '');
            
            if (empty($name) || empty($code)) {
                sendResponse(false, 'Name and code are required', null, 400);
            }
            
            $stmt = $pdo->prepare("INSERT INTO universities (name, code) VALUES (?, ?)");
            $stmt->execute([$name, $code]);
            
            sendResponse(true, 'University created', ['id' => $pdo->lastInsertId()]);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'universities');
}

