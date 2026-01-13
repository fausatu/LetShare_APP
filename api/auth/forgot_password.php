<?php
/**
 * Forgot Password - Send password reset email
 * Generates a reset token and sends it to the user's email
 */

// Set CORS headers early
header('Access-Control-Allow-Origin: https://letshare.infinityfreeapp.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Only POST requests are accepted.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Prevent any output before JSON
if (ob_get_level()) {
    ob_clean();
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../lib/simple_smtp.php';

$data = getRequestData();
$email = trim($data['email'] ?? '');

if (empty($email)) {
    sendResponse(false, 'Email is required', null, 400);
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format', null, 400);
}

try {
    // Start session for rate limiting
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Rate limiting: max 3 requests per 15 minutes per email
    $rateLimitKey = 'forgot_password_' . md5($email);
    $currentTime = time();
    $rateLimitWindow = 900; // 15 minutes in seconds
    $maxAttempts = 3;
    
    if (!isset($_SESSION[$rateLimitKey])) {
        $_SESSION[$rateLimitKey] = ['count' => 0, 'first_attempt' => $currentTime];
    }
    
    $rateLimit = $_SESSION[$rateLimitKey];
    
    // Reset if window expired
    if ($currentTime - $rateLimit['first_attempt'] > $rateLimitWindow) {
        $_SESSION[$rateLimitKey] = ['count' => 0, 'first_attempt' => $currentTime];
        $rateLimit = $_SESSION[$rateLimitKey];
    }
    
    // Check rate limit
    if ($rateLimit['count'] >= $maxAttempts) {
        $remainingTime = $rateLimitWindow - ($currentTime - $rateLimit['first_attempt']);
        $remainingMinutes = ceil($remainingTime / 60);
        $message = getSecurityMessage('forgot_password', $remainingMinutes);
        sendResponse(false, $message, ['retry_after' => $remainingTime], 429);
    }
    
    // Increment attempt count
    $_SESSION[$rateLimitKey]['count']++;
    
    $pdo = getDBConnection();
    
    // Find user by email
    $stmt = $pdo->prepare("SELECT id, name, email, auth_provider FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    // Don't reveal if email exists or not (security best practice)
    // Always return success message to prevent email enumeration
    if (!$user) {
        sendResponse(true, 'If this email is registered, a password reset link has been sent.');
        exit();
    }
    
    // Check if user uses password authentication (not Google OAuth)
    if ($user['auth_provider'] !== 'email') {
        sendResponse(true, 'If this email is registered, a password reset link has been sent.');
        exit();
    }
    
    // Generate reset token
    $resetToken = bin2hex(random_bytes(32));
    $resetTokenExpires = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token expires in 1 hour
    
    // Store reset token in database (this also invalidates any previous token)
    try {
        $stmt = $pdo->prepare("
            UPDATE users 
            SET password_reset_token = ?, 
                password_reset_expires_at = ? 
            WHERE id = ?
        ");
        $stmt->execute([$resetToken, $resetTokenExpires, $user['id']]);
    } catch (PDOException $e) {
        // Check if columns don't exist (migration not run)
        if (strpos($e->getMessage(), "Unknown column 'password_reset_token'") !== false) {
            error_log('Password reset columns not found. Please run migration_password_reset.sql');
            sendResponse(false, 'Password reset feature is not configured. Please contact administrator.', null, 500);
            exit();
        }
        throw $e; // Re-throw if it's a different error
    }
    
    // Send password reset email
    // Detect if we're on localhost/development
    $isLocal = (
        $_SERVER['HTTP_HOST'] === 'localhost' ||
        strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false ||
        strpos($_SERVER['HTTP_HOST'], 'localhost:') !== false ||
        (defined('APP_ENV') && APP_ENV === 'development')
    );
    
    // Use local URL in development, APP_BASE_URL in production
    if ($isLocal) {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        // Script is in /api/auth/, so go up 2 levels to reach project root
        $baseUrl = $protocol . '://' . $_SERVER['HTTP_HOST'] . dirname(dirname(dirname($_SERVER['SCRIPT_NAME'])));
    } else {
        $baseUrl = defined('APP_BASE_URL') && !empty(APP_BASE_URL) 
            ? APP_BASE_URL 
            : ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname(dirname($_SERVER['SCRIPT_NAME'])));
    }
    
    $resetUrl = rtrim($baseUrl, '/') . '/reset_password.html?token=' . urlencode($resetToken);
    
    $subject = 'Reset your password - LetShare';
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    </head>
    <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;'>
        <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f3f4f6; padding: 40px 0;'>
            <tr>
                <td align='center'>
                    <table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                        <!-- Header -->
                        <tr>
                            <td style='padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981, #059669);'>
                                <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;'>LetShare</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style='padding: 40px 30px;'>
                                <h2 style='color: #1f2937; margin: 0 0 20px 0; font-size: 24px;'>Reset your password</h2>
                                <p style='color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;'>Hello " . htmlspecialchars($user['name']) . ",</p>
                                <p style='color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;'>You requested to reset your password. Click the button below to reset it:</p>
                                <table width='100%' cellpadding='0' cellspacing='0' style='margin: 30px 0;'>
                                    <tr>
                                        <td align='center'>
                                            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0 auto;'>
                                                <tr>
                                                    <td align='center' style='background-color: #10b981; border-radius: 8px; padding: 2px;'>
                                                        <a href='" . htmlspecialchars($resetUrl) . "' style='display: block; background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center; font-family: Arial, sans-serif; border: none;'>Reset Password</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <p style='color: #1f2937; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0; font-weight: 600;'>Or copy and paste this link into your browser:</p>
                                <p style='word-break: break-all; color: #059669; font-size: 13px; line-height: 1.6; margin: 0 0 30px 0; padding: 15px; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #d1fae5; font-family: monospace;'>" . htmlspecialchars($resetUrl) . "</p>
                                <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;'>This link will expire in 1 hour.</p>
                                <p style='color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;'>If you didn't request a password reset, please ignore this email.</p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style='padding: 20px 30px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb;'>
                                <p style='color: #6b7280; font-size: 12px; margin: 0;'>© " . date('Y') . " LetShare. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    ";
    
    // Send password reset email using native SMTP
    error_log('Sending password reset email to: ' . $email);
    
    try {
        $emailSent = sendEmailViaSMTP(
            $email,
            $subject,
            $message,
            SMTP_FROM_EMAIL,
            SMTP_FROM_NAME,
            SMTP_HOST,
            SMTP_PORT,
            SMTP_USERNAME,
            SMTP_PASSWORD
        );
        
        if ($emailSent) {
            error_log('✅ Password reset email sent successfully to: ' . $email);
        } else {
            error_log('❌ Failed to send password reset email to: ' . $email);
        }
    } catch (Exception $e) {
        error_log('❌ SMTP error sending password reset email: ' . $e->getMessage());
        $emailSent = false;
    }
    
    // Always return success to prevent email enumeration (security best practice)
    sendResponse(true, 'If this email is registered, a password reset link has been sent.');
    
} catch (PDOException $e) {
    error_log('Forgot password PDO error: ' . $e->getMessage());
    handleDatabaseError($e, 'forgot_password');
} catch (Exception $e) {
    error_log('Forgot password error: ' . $e->getMessage());
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
}

