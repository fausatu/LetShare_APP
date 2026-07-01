<?php
// api/translate.php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

// Debug: Check if curl is available
if (!extension_loaded('curl')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL extension not available', 'success' => false]);
    exit;
}

// Get the API key from environment variables 
$apiKey = $_ENV['GOOGLE_TRANSLATE_API_KEY'] ?? getenv('GOOGLE_TRANSLATE_API_KEY') ?? '';
if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'Translation API key is not configured', 'success' => false]);
    exit;
}

// Parse input
$data = json_decode(file_get_contents('php://input'), true);
$text = $data['text'] ?? '';
$target = $data['target'] ?? 'en';
$source = $data['source'] ?? null;  // Optional source language


// Validate input
if (!$text || trim($text) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'No text provided', 'success' => false]);
    exit;
}

// Ensure text is not too long (Google Translate has limits)
if (strlen($text) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Text too long (max 5000 chars)', 'success' => false]);
    exit;
}

// Call Google Translate API using cURL
$url = 'https://translation.googleapis.com/language/translate/v2?key=' . $apiKey;
$postData = [
    'q' => $text,
    'target' => $target
];

// Add source language if provided (helps with detection accuracy)
if ($source) {
    $postData['source'] = $source;
}


$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData, JSON_UNESCAPED_UNICODE));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);  // For testing, might need to be true in production
curl_setopt($ch, CURLOPT_VERBOSE, false);
curl_setopt($ch, CURLOPT_REFERER, 'https://letshare-app.fr');  // Add Referer header for Google Translate API

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrorNo = curl_errno($ch);
curl_close($ch);

if ($curlError) {
}

// **DEBUG: Log the full response for inspection**

// Check if cURL failed
if ($result === false || $curlErrorNo !== 0) {
    http_response_code(503);
    echo json_encode(['error' => 'Translation service unavailable: ' . $curlError, 'success' => false]);
    exit;
}

// Check if result is empty
if (empty($result) || trim($result) === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Empty response from translation service', 'success' => false]);
    exit;
}

// Try to parse the response
$apiResponse = json_decode($result, true);
if ($apiResponse === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid response from translation service', 'success' => false]);
    exit;
}

// Check for API errors
if (isset($apiResponse['error'])) {
    http_response_code(400);
    echo json_encode(['error' => $apiResponse['error']['message'] ?? 'Translation failed', 'success' => false]);
    exit;
}

// Return the valid response
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($apiResponse, JSON_UNESCAPED_UNICODE);
?>
