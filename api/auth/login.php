<?php
// Prevent any output before JSON
if (ob_get_level()) {
    ob_clean();
}

require_once '../config.php';

$data = getRequestData();
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$rememberMe = isset($data['remember_me']) && $data['remember_me'] === true;

if (empty($email) || empty($password)) {
    sendResponse(false, 'Email and password are required', null, 400);
}

try {
    // Rate limiting: max 5 login attempts per 15 minutes per IP
    if (!applyRateLimit('login_attempts', 5, 900)) {
        return; // Response already sent by applyRateLimit
    }
    
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT id, name, email, password, department, avatar, language, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    // Check if email is verified
    $emailVerified = (bool)$user['email_verified'];
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        // Configure session cookie based on "remember me"
        if ($rememberMe) {
            // Remember me: cookie expires in 30 days
            $cookieParams = session_get_cookie_params();
            $cookieLifetime = 30 * 24 * 60 * 60; // 30 days
            session_set_cookie_params(
                $cookieLifetime,
                $cookieParams['path'],
                $cookieParams['domain'],
                $cookieParams['secure'],
                $cookieParams['httponly']
            );
        }
        session_start();
    }
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['token'] = bin2hex(random_bytes(32));
    
    // If remember me is checked, also update the cookie expiration time explicitly
    if ($rememberMe) {
        $cookieParams = session_get_cookie_params();
        setcookie(
            session_name(), 
            session_id(), 
            time() + (30 * 24 * 60 * 60), // 30 days
            $cookieParams['path'],
            $cookieParams['domain'],
            $cookieParams['secure'],
            $cookieParams['httponly']
        );
    }
    
    // Remove password from response
    unset($user['password']);
    
    $message = $emailVerified 
        ? 'Login successful' 
        : 'Login successful. Please verify your email address to access all features.';
    
    sendResponse(true, $message, [
        'user' => $user,
        'token' => $_SESSION['token'],
        'email_verified' => $emailVerified
    ]);
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'login');
}

