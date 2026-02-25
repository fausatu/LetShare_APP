<?php
// Set error reporting
ini_set('log_errors', 1);
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Load config first - it handles CORS and headers
require_once __DIR__ . '/../config.php';

// Wrap everything in a try-catch
try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!applyRateLimit('login_attempts', 5, 900, $clientIP, 'Too many login attempts. Please try again in {minutes} minute(s).')) {
        exit;
    }
    
    $data = getRequestData();
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $rememberMe = isset($data['remember_me']) && $data['remember_me'] === true;

    if (empty($email) || empty($password)) {
        sendResponse(false, 'Email and password are required', null, 400);
    }

    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("SELECT id, name, email, password, department, avatar, language, email_verified, terms_accepted_at FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    // Success! Start session and prepare response
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['token'] = bin2hex(random_bytes(32));
    
    // Remove password from response
    unset($user['password']);
    
    // Check if user needs to accept terms
    $termsRequired = empty($user['terms_accepted_at']);
    if ($termsRequired) {
        unset($user['terms_accepted_at']);
    }
    
    // Check if email is verified
    $emailVerified = (bool)$user['email_verified'];
    
    $message = $emailVerified 
        ? 'Login successful' 
        : 'Login successful. Please verify your email address to access all features.';
    
    // Send success response
    sendResponse(true, $message, [
        'user' => $user,
        'token' => $_SESSION['token'],
        'email_verified' => $emailVerified,
        'terms_required' => $termsRequired
    ], 200);
    
} catch (PDOException $e) {
    error_log("Login API Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error occurred', null, 500);
} catch (Exception $e) {
    error_log("Login API Error: " . $e->getMessage());
    sendResponse(false, 'Server error occurred', null, 500);
} catch (Error $e) {
    error_log("Login API Fatal Error: " . $e->getMessage());
    sendResponse(false, 'Fatal error occurred', null, 500);
}
?>

