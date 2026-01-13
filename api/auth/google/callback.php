<?php
/**
 * Google OAuth Callback - Handle OAuth response
 * This receives the authorization code from Google and exchanges it for user info
 * 
 * TODO: Implement token exchange and user creation
 */

require_once '../../config.php';
require_once '../validate_university_email.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verify state token (CSRF protection)
$state = $_GET['state'] ?? '';
if (empty($state) || !isset($_SESSION['google_oauth_state']) || $state !== $_SESSION['google_oauth_state']) {
    sendResponse(false, 'Invalid state parameter', null, 400);
}

unset($_SESSION['google_oauth_state']);

// Get authorization code
$code = $_GET['code'] ?? '';
if (empty($code)) {
    sendResponse(false, 'Authorization code not provided', null, 400);
}

// Check if Google OAuth is configured
if (!defined('GOOGLE_CLIENT_ID') || empty(GOOGLE_CLIENT_ID) || 
    !defined('GOOGLE_CLIENT_SECRET') || empty(GOOGLE_CLIENT_SECRET)) {
    sendResponse(false, 'Google OAuth is not configured. Please add credentials in config.php', null, 503);
}

try {
    // Exchange authorization code for access token
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $tokenData = [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code'
    ];
    
    $ch = curl_init($tokenUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($tokenData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    $tokenResponse = curl_exec($ch);
    $tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($tokenHttpCode !== 200) {
        throw new Exception('Failed to exchange authorization code for token');
    }
    
    $tokenData = json_decode($tokenResponse, true);
    if (!isset($tokenData['access_token'])) {
        throw new Exception('Access token not received from Google');
    }
    
    // Get user info from Google
    $userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo?access_token=' . $tokenData['access_token'];
    $ch = curl_init($userInfoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $userInfoResponse = curl_exec($ch);
    $userInfoHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($userInfoHttpCode !== 200) {
        throw new Exception('Failed to get user info from Google');
    }
    
    $userInfo = json_decode($userInfoResponse, true);
    
    // Validate that email is a university email
    $email = $userInfo['email'] ?? '';
    if (empty($email)) {
        sendResponse(false, 'Email not provided by Google', null, 400);
    }
    
    $emailValidation = validateUniversityEmail($email);
    if (!$emailValidation['valid']) {
        // Determine if this was a login or register attempt
        $action = $_SESSION['google_oauth_action'] ?? 'login';
        unset($_SESSION['google_oauth_action']);
        
        // Create a more user-friendly error message
        $errorMessage = 'Your email address is not from a partner university. Please use your university email address (e.g., @student.clermont-sb.fr) to access this platform.';
        
        // Redirect to appropriate page based on action
        if ($action === 'register') {
            header('Location: ../../../register.html?error=' . urlencode($errorMessage));
        } else {
            header('Location: ../../../login.html?error=' . urlencode($errorMessage));
        }
        exit();
    }
    
    $pdo = getDBConnection();
    
    // Check if user already exists
    $stmt = $pdo->prepare("SELECT id, name, email, department, avatar, language, university_id, auth_provider, google_id FROM users WHERE email = ? OR google_id = ?");
    $stmt->execute([$email, $userInfo['id']]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        // User exists - log them in
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $existingUser['id'];
        $_SESSION['email'] = $existingUser['email'];
        $_SESSION['token'] = bin2hex(random_bytes(32));
        
        // Link Google account to existing user (if not already linked)
        if (empty($existingUser['google_id'])) {
            // User has classic account, link it to Google
            $stmt = $pdo->prepare("UPDATE users SET google_id = ?, auth_provider = 'google' WHERE id = ?");
            $stmt->execute([$userInfo['id'], $existingUser['id']]);
        }
        
        // Redirect to main page
        header('Location: ../../../index.html');
        exit();
    }
    
    // New user - redirect to registration page to complete profile
    // Store Google info in session for registration
    $_SESSION['google_oauth_data'] = [
        'google_id' => $userInfo['id'],
        'email' => $email,
        'name' => $userInfo['name'] ?? '',
        'picture' => $userInfo['picture'] ?? '',
        'university_id' => $emailValidation['university_id'],
        'university_name' => $emailValidation['university_name']
    ];
    
    header('Location: ../../../register.html?google=1&email=' . urlencode($email) . '&name=' . urlencode($userInfo['name'] ?? ''));
    exit();
    
} catch (Exception $e) {
    error_log('Google OAuth error: ' . $e->getMessage());
    
    // Redirect to login page with error message
    $errorMessage = urlencode('Google authentication failed: ' . $e->getMessage());
    header('Location: ../../../login.html?error=' . $errorMessage);
    exit();
}

