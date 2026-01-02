<?php
/**
 * API to get list of departments (for autocomplete)
 */
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get all unique departments from users (for autocomplete)
            $stmt = $pdo->query("
                SELECT DISTINCT department 
                FROM users 
                WHERE department IS NOT NULL AND department != ''
                ORDER BY department ASC
            ");
            $departments = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            sendResponse(true, 'Departments retrieved', $departments);
            break;
            
        default:
            sendResponse(false, 'Method not allowed', null, 405);
    }
} catch (PDOException $e) {
    handleDatabaseError($e, 'departments');
}

