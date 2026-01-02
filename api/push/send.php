<?php
/**
 * Push Notification Send Endpoint
 * API endpoint to send push notifications
 */

require_once '../config.php';
require_once 'push_sender.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = requireAuth();

if ($method !== 'POST') {
    sendResponse(false, 'Method not allowed', null, 405);
}

try {
    $data = getRequestData();
    
    $subscription = $data['subscription'] ?? null;
    $title = $data['title'] ?? 'LetShare';
    $message = $data['message'] ?? '';
    $notificationData = $data['data'] ?? [];
    
    if (!$subscription) {
        sendResponse(false, 'Subscription is required', null, 400);
    }
    
    if (empty($message)) {
        sendResponse(false, 'Message is required', null, 400);
    }
    
    // Send push notification
    $result = sendPushToSubscription($subscription, $title, $message, $notificationData);
    
    if ($result['success']) {
        sendResponse(true, 'Push notification sent', $result);
    } else {
        sendResponse(false, $result['message'] || 'Failed to send push notification', null, 500);
    }
    
} catch (Exception $e) {
    handleError($e, 'push_send', 'Failed to send push notification. Please try again later.');
}

