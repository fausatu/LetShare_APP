<?php
// api/translate.php
header('Content-Type: application/json');

// Debug: Check if curl is available
if (!extension_loaded('curl')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL extension not available', 'success' => false]);
    error_log('[translate.php] ERROR: cURL extension not available');
    exit;
}

// Get the API key from environment or config
$apiKey = 'AIzaSyD4RmCD5OG40raZ2zj2eFGMJo4uMsMxbrQ'; 

// Parse input
$data = json_decode(file_get_contents('php://input'), true);
$text = $data['text'] ?? '';
$target = $data['target'] ?? 'en';
$source = $data['source'] ?? null;  // Optional source language

error_log('[translate.php] Request received - Text: ' . substr($text, 0, 50) . ', Target: ' . $target);

// Validate input
if (!$text || trim($text) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'No text provided', 'success' => false]);
    error_log('[translate.php] ERROR: No text provided');
    exit;
}

// Ensure text is not too long (Google Translate has limits)
if (strlen($text) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Text too long (max 5000 chars)', 'success' => false]);
    error_log('[translate.php] ERROR: Text too long');
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

error_log('[translate.php] Calling Google Translate API at: ' . $url);

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

error_log('[translate.php] cURL HTTP Code: ' . $httpCode);
error_log('[translate.php] cURL Error No: ' . $curlErrorNo);
if ($curlError) {
    error_log('[translate.php] cURL Error: ' . $curlError);
}
error_log('[translate.php] Raw API response: ' . substr($result, 0, 500));

// **DEBUG: Log the full response for inspection**
error_log('[translate.php] FULL API RESPONSE: ' . $result);

// Check if cURL failed
if ($result === false || $curlErrorNo !== 0) {
    error_log('[translate.php] cURL failed with error: ' . $curlError);
    http_response_code(503);
    echo json_encode(['error' => 'Translation service unavailable: ' . $curlError, 'success' => false]);
    exit;
}

// Check if result is empty
if (empty($result) || trim($result) === '') {
    error_log('[translate.php] Empty response from API');
    http_response_code(503);
    echo json_encode(['error' => 'Empty response from translation service', 'success' => false]);
    exit;
}

// Try to parse the response
$apiResponse = json_decode($result, true);
if ($apiResponse === null) {
    error_log('[translate.php] Failed to parse JSON response: ' . $result);
    http_response_code(502);
    echo json_encode(['error' => 'Invalid response from translation service', 'success' => false]);
    exit;
}

// Check for API errors
if (isset($apiResponse['error'])) {
    error_log('[translate.php] API error: ' . json_encode($apiResponse['error']));
    http_response_code(400);
    echo json_encode(['error' => $apiResponse['error']['message'] ?? 'Translation failed', 'success' => false]);
    exit;
}

// Return the valid response
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($apiResponse, JSON_UNESCAPED_UNICODE);
?>