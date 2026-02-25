<?php
/**
 * Push Notification Sender Helper
 * Handles sending push notifications to browser push services
 */

// Use absolute path to config.php
require_once __DIR__ . '/../config.php';

/**
 * Send push notification to a subscription
 * @param array $subscription Subscription data (endpoint, p256dh, auth)
 * @param string $title Notification title
 * @param string $message Notification message
 * @param array $data Additional data (url, etc.)
 * @return array Result with success status and message
 */
function sendPushToSubscription($subscription, $title, $message, $data = []) {
    try {
        // Check if web-push-php library is available
        if (class_exists('Minishlink\WebPush\WebPush')) {
            return sendPushWithLibrary($subscription, $title, $message, $data);
        } else {
            return [
                'success' => false, 
                'message' => 'Push notifications require the web-push-php library'
            ];
        }
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * Send push notification using web-push-php library
 */
function sendPushWithLibrary($subscription, $title, $message, $data = []) {
    try {
        // Validate VAPID keys are configured
        if (empty(VAPID_PUBLIC_KEY) || empty(VAPID_PRIVATE_KEY) || empty(APP_BASE_URL)) {
            return [
                'success' => false,
                'message' => 'VAPID keys not configured in .env file'
            ];
        }
        
        $auth = [
            'VAPID' => [
                'subject' => APP_BASE_URL,
                'publicKey' => VAPID_PUBLIC_KEY,
                'privateKey' => VAPID_PRIVATE_KEY,
            ],
        ];
        
        $webPush = new \Minishlink\WebPush\WebPush($auth);
        
        $payload = json_encode([
            'title' => $title,
            'body' => $message,
            'icon' => '/Letshare_Icon.png',
            'badge' => '/Letshare_Icon.png',
            'data' => $data
        ]);
        
        $pushSubscription = \Minishlink\WebPush\Subscription::create([
            'endpoint' => $subscription['endpoint'],
            'keys' => [
                'p256dh' => $subscription['p256dh'],
                'auth' => $subscription['auth']
            ]
        ]);
        
        $webPush->queueNotification($pushSubscription, $payload);
        
        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                $reason = $report->getReason();
                $statusCode = null;
                if ($report->getResponse()) {
                    $statusCode = $report->getResponse()->getStatusCode();
                }
                
                // Check if subscription is expired
                if ($statusCode === 410 || $statusCode === 404 || 
                    strpos($reason, '410') !== false || 
                    strpos($reason, 'Gone') !== false ||
                    strpos($reason, 'Not Found') !== false) {
                    return [
                        'success' => false, 
                        'message' => 'Subscription expired or invalid',
                        'expired' => true,
                        'endpoint' => $subscription['endpoint'],
                        'status_code' => $statusCode
                    ];
                }
                
                return ['success' => false, 'message' => $reason];
            }
        }
        
        return ['success' => true, 'message' => 'Push notification sent'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * Send push notification using cURL (fallback)
 * This is a basic implementation - web-push-php is recommended
 */
function sendPushWithCurl($subscription, $title, $message, $data = []) {
    try {
        // Parse endpoint to get push service URL
        $endpoint = $subscription['endpoint'];
        
        // Build payload
        $payload = json_encode([
            'title' => $title,
            'body' => $message,
            'icon' => '/Letshare_Icon.png',
            'badge' => '/Letshare_Icon.png',
            'data' => $data
        ]);
        
        // Encrypt payload (simplified - web-push-php does this properly)
        // For a proper implementation, you need to:
        // 1. Generate a random salt and server key
        // 2. Derive encryption keys using HKDF
        // 3. Encrypt payload with AES-128-GCM
        // 4. Build the encrypted message format
        
        // For now, we'll use a basic approach (this won't work with all browsers)
        // In production, you should use web-push-php library
        
        $headers = [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400'
        ];
        
        // Generate VAPID JWT token
        $vapidToken = generateVapidToken($endpoint);
        if ($vapidToken) {
            $headers[] = 'Authorization: vapid t=' . $vapidToken['token'] . ', k=' . VAPID_PUBLIC_KEY;
        }
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            error_log('cURL error: ' . $error);
            return ['success' => false, 'message' => $error];
        }
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'message' => 'Push notification sent'];
        } else {
            error_log('Push notification failed with HTTP ' . $httpCode . ': ' . $response);
            return ['success' => false, 'message' => 'HTTP ' . $httpCode];
        }
    } catch (Exception $e) {
        error_log('Error with cURL fallback: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Generate VAPID JWT token
 * Simplified version - web-push-php does this properly
 */
function generateVapidToken($audience) {
    try {
        // VAPID token requires JWT encoding with specific claims
        // This is a simplified version - for production use web-push-php
        
        $header = [
            'typ' => 'JWT',
            'alg' => 'ES256'
        ];
        
        $claims = [
            'aud' => parse_url($audience, PHP_URL_SCHEME) . '://' . parse_url($audience, PHP_URL_HOST),
            'exp' => time() + 43200, // 12 hours
            'sub' => 'mailto:' . SMTP_FROM_EMAIL
        ];
        
        // Note: Proper JWT signing with ES256 requires cryptographic libraries
        // This is a placeholder - web-push-php handles this correctly
        // For now, return null to indicate library is needed
        
        return null; // Indicates web-push-php library should be used
    } catch (Exception $e) {
        error_log('Error generating VAPID token: ' . $e->getMessage());
        return null;
    }
}

