<?php
/**
 * Send Email Code for Login
 * Sends a 6-digit code to the user's email for passwordless login
 */

require_once '../config.php';
require_once 'validate_university_email.php';
require_once 'send_verification_email.php';

$data = getRequestData();
$email = trim($data['email'] ?? '');

if (empty($email)) {
    sendResponse(false, 'Email is required', null, 400);
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format', null, 400);
}

// Validate university email
$emailValidation = validateUniversityEmail($email);
if (!$emailValidation['valid']) {
    sendResponse(false, $emailValidation['message'], null, 400);
}

try {
    // Start session with proper configuration
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Ensure session is writable
    if (!isset($_SESSION)) {
        error_log('Session not available in send_email_code.php');
        sendResponse(false, 'Session error. Please try again.', null, 500);
    }
    
    // Generate 6-digit code
    $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Store code in session (expires in 10 minutes)
    $_SESSION['email_code'] = $code;
    $_SESSION['email_code_email'] = $email;
    $_SESSION['email_code_expires'] = time() + 600; // 10 minutes
    
    // Log for debugging (remove in production)
    error_log('Email code generated for: ' . $email . ' - Code: ' . $code);
    
    // Get user name if exists
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    $name = $user ? $user['name'] : 'Utilisateur';
    
    // Send email with code
    $emailSent = sendEmailCode($email, $name, $code);
    
    if ($emailSent) {
        sendResponse(true, 'Code sent successfully', ['email' => $email]);
    } else {
        sendResponse(false, 'Failed to send code. Please try again later.', null, 500);
    }
    
} catch (PDOException $e) {
    error_log('Send email code error: ' . $e->getMessage());
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
}

/**
 * Send email with verification code
 */
function sendEmailCode($email, $name, $code) {
    $subject = 'Votre code de connexion LetShare';
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    </head>
    <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;'>
        <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f3f4f6; padding: 20px;'>
            <tr>
                <td align='center'>
                    <table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                        <!-- Header -->
                        <tr>
                            <td style='background: linear-gradient(135deg, #10b981, #059669); padding: 30px 20px; text-align: center;'>
                                <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;'>Code de Connexion</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style='padding: 40px 30px;'>
                                <p style='color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>Bonjour " . htmlspecialchars($name) . ",</p>
                                <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;'>Utilisez ce code pour vous connecter à LetShare :</p>
                                
                                <!-- Code Display -->
                                <table width='100%' cellpadding='0' cellspacing='0' style='margin: 30px 0;'>
                                    <tr>
                                        <td align='center'>
                                            <div style='background-color: #ffffff; border: 3px solid #059669; border-radius: 12px; padding: 20px 40px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>
                                                <p style='font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; margin: 0; font-family: monospace, "Courier New", Courier;'>" . htmlspecialchars($code) . "</p>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;'>Ce code est valide pendant 10 minutes.</p>
                                <p style='color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;'>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
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
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">" . "\r\n";
    $headers .= "Reply-To: " . SMTP_FROM_EMAIL . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    $result = @mail($email, $subject, $message, $headers);
    
    if (!$result) {
        error_log('Failed to send email code to: ' . $email);
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('DEBUG: Email code for ' . $email . ': ' . $code);
        }
        return false;
    }
    
    return true;
}

