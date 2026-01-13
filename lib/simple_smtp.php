<?php
/**
 * Email Sender for InfinityFree - Brevo API Version
 * Utilise cURL au lieu de fsockopen pour compatibilité InfinityFree
 */

function sendEmailViaSMTP($to, $subject, $htmlBody, $fromEmail, $fromName, $smtpHost, $smtpPort, $username, $password) {
    error_log('=== Starting Brevo API email send ===');
    error_log('To: ' . $to);
    error_log('Subject: ' . $subject);
    
    // Charger la clé API Brevo depuis .env
    $brevoApiKey = $_ENV['BREVO_API_KEY'] ?? null;
    if (empty($brevoApiKey)) {
        error_log('❌ BREVO_API_KEY not configured in .env');
        return false;
    }
    
    // Préparer les données pour l'API Brevo
    $data = [
        'sender' => [
            'name' => $fromName,
            'email' => $fromEmail
        ],
        'to' => [
            [
                'email' => $to
            ]
        ],
        'subject' => $subject,
        'htmlContent' => $htmlBody
    ];
    
    $jsonData = json_encode($data);
    error_log('Brevo API request: ' . $jsonData);
    
    // Initialiser cURL
    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonData,
        CURLOPT_HTTPHEADER => [
            'accept: application/json',
            'api-key: ' . $brevoApiKey,
            'content-type: application/json'
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 30
    ]);
    
    // Exécuter la requête
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Vérifier le résultat
    if ($curlError) {
        error_log('❌ cURL Error: ' . $curlError);
        return false;
    }
    
    error_log('Brevo API response (HTTP ' . $httpCode . '): ' . $response);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        error_log('✅ Email sent successfully via Brevo API');
        return true;
    } else {
        error_log('❌ Brevo API Error: HTTP ' . $httpCode);
        return false;
    }
}

// Compatibility wrapper
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return substr($haystack, 0, strlen($needle)) === $needle;
    }
}
?>