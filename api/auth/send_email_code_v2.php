<?php
/**
 * Send Email Code for Login - Version InfinityFree Compatible
 * Utilise SMTP natif sans dépendre de PHPMailer
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

// Start output buffering and error handling
ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/../config.php';
    require_once __DIR__ . '/validate_university_email.php';
    require_once __DIR__ . '/../../lib/simple_smtp.php';
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    error_log('Error loading required files: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Server configuration error. Please try again later.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

ob_clean();

try {
    // Get request data
    $data = getRequestData();
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        sendResponse(false, 'Email is required', null, 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format', null, 400);
    }

    // Validate university email
    $emailValidation = validateUniversityEmail($email);
    if (!$emailValidation['valid']) {
        sendResponse(false, $emailValidation['message'], null, 400);
    }

    // Start session for code storage
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Generate 6-digit code
    $code = sprintf('%06d', mt_rand(0, 999999));
    
    // Store code in session (valid for 10 minutes)
    $_SESSION['email_code'] = $code;
    $_SESSION['email_code_email'] = $email;
    $_SESSION['email_code_expires'] = time() + 600;
    
    error_log('Email code generated for: ' . $email . ' - Code: ' . $code);
    
    // Get user name if exists
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT name FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        $name = $user ? $user['name'] : 'Utilisateur';
    } catch (Exception $e) {
        error_log('Error getting user name: ' . $e->getMessage());
        $name = 'Utilisateur';
    }
    
    // Send email with native SMTP
    $emailSent = sendEmailCodeViaNativeSMTP($email, $name, $code);
    
    if ($emailSent) {
        sendResponse(true, 'Code sent successfully', ['email' => $email]);
    } else {
        // In debug mode, still allow the code to work for testing
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('DEBUG MODE: Email failed but allowing code to work');
            error_log('DEBUG CODE for ' . $email . ': ' . $code);
            sendResponse(true, 'Code generated (check logs for debug code)', ['email' => $email, 'debug_note' => 'Email failed but code stored in session']);
        } else {
            sendResponse(false, 'Failed to send email. Please try again later.', null, 500);
        }
    }

} catch (Exception $e) {
    error_log('Send email code error: ' . $e->getMessage());
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
}

/**
 * Send email code using native SMTP
 */
function sendEmailCodeViaNativeSMTP($email, $name, $code) {
    error_log('=== Starting native SMTP email send ===');
    
    // Check SMTP configuration
    $requiredConstants = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME'];
    foreach ($requiredConstants as $constant) {
        if (!defined($constant) || empty(constant($constant))) {
            error_log("ERROR: $constant not defined or empty");
            return false;
        }
    }
    
    $subject = 'Votre code de connexion LetShare';
    $htmlBody = createEmailHTML($name, $code);
    
    return sendEmailViaSMTP(
        $email,
        $subject, 
        $htmlBody,
        SMTP_FROM_EMAIL,
        SMTP_FROM_NAME,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USERNAME,
        SMTP_PASSWORD
    );
}

/**
 * Create HTML email content
 */
function createEmailHTML($name, $code) {
    return "
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
                    <table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px;'>
                        <tr>
                            <td style='background: linear-gradient(135deg, #10b981, #059669); padding: 30px 20px; text-align: center;'>
                                <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;'>LetShare</h1>
                                <p style='color: #ffffff; margin: 10px 0 0 0; font-size: 16px;'>Connexion par email</p>
                            </td>
                        </tr>
                        <tr>
                            <td style='padding: 40px 30px;'>
                                <p style='color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>Bonjour " . htmlspecialchars($name) . ",</p>
                                <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;'>Voici votre code de connexion LetShare :</p>
                                
                                <div style='background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;'>
                                    <p style='color: #059669; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;'>VOTRE CODE DE CONNEXION</p>
                                    <p style='color: #1f2937; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: monospace;'>" . htmlspecialchars($code) . "</p>
                                </div>
                                
                                <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>Ce code est valable pendant <strong>10 minutes</strong>. Saisissez-le sur la page de connexion.</p>
                                <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;'>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
                            </td>
                        </tr>
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
}
?>