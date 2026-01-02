<?php
/**
 * Google OAuth Login - Initiate OAuth flow
 * This will redirect user to Google for authentication
 * 
 * TODO: Add your Google OAuth credentials in config.php:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */

require_once '../../config.php';

// Check if Google OAuth is configured
if (!defined('GOOGLE_CLIENT_ID') || empty(GOOGLE_CLIENT_ID)) {
    sendResponse(false, 'Google OAuth is not configured. Please add credentials in config.php', null, 503);
}

// Generate state token for CSRF protection
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$state = bin2hex(random_bytes(16));
$_SESSION['google_oauth_state'] = $state;

// Store the action (login or register) to know where to redirect on error
$action = $_GET['action'] ?? 'login'; // 'login' or 'register'
$_SESSION['google_oauth_action'] = $action;

// Build Google OAuth URL
$params = [
    'client_id' => GOOGLE_CLIENT_ID,
    'redirect_uri' => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope' => 'openid email profile',
    'state' => $state,
    'access_type' => 'offline',
    'prompt' => 'consent'
];

$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

// Redirect to Google
header('Location: ' . $authUrl);
exit();

