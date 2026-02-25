<?php
/**
 * CSRF Token Endpoint
 * Returns a CSRF token for use in subsequent requests
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed', null, 405);
}

// Generate/retrieve token
$token = getCSRFToken();

// Return the token
sendResponse(true, 'CSRF token generated', ['csrf_token' => $token]);
