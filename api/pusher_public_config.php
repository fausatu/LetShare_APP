<?php
/**
 * Pusher Public Configuration Endpoint
 * Returns only the public key and cluster (NOT the secret!)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

// Only return public information - NEVER expose the secret
$publicConfig = [
    'key' => $_ENV['PUSHER_KEY'] ?? '',
    'cluster' => $_ENV['PUSHER_CLUSTER'] ?? 'eu'
];

// Validate that config is present
if (empty($publicConfig['key'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Pusher not configured']);
    exit;
}

echo json_encode($publicConfig);
