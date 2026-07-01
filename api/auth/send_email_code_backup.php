<?php
/**
 * Send Email Code for Login
 * Sends a 6-digit code to the user's email for passwordless login
 */

// Set CORS headers early to avoid CORS issues
header('Access-Control-Allow-Origin: https://letshare.infinityfreeapp.com');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

// Start output buffering to prevent any output before JSON
ob_start();

// Disable error display to prevent warnings/notices from corrupting JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set error handler to catch fatal errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) {
        return false;
    }
    return false; // Let PHP handle it normally
});

// Set exception handler
set_exception_handler(function($exception) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred. Please try again later.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
});

// Set shutdown handler to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'A server error occurred. Please try again later.'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
});

try {
    require_once __DIR__ . '/../config.php';
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Configuration error. Please contact administrator.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    require_once __DIR__ . '/validate_university_email.php';
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server configuration error. Please contact administrator.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    require_once __DIR__ . '/send_verification_email.php';
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server configuration error. Please contact administrator.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Clear any output that might have been generated
ob_clean();

try {
    // Get request data with error handling
    try {
        $data = getRequestData();
    } catch (Exception $e) {
        sendResponse(false, 'Invalid request. Please try again.', null, 400);
    }
    
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        sendResponse(false, 'Email is required', null, 400);
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format', null, 400);
    }

    // Validate university email with error handling
    try {
        $emailValidation = validateUniversityEmail($email);
        if (!$emailValidation['valid']) {
            sendResponse(false, $emailValidation['message'], null, 400);
        }
    } catch (PDOException $e) {
        sendResponse(false, 'Database connection error. Please try again later.', null, 500);
    } catch (Exception $e) {
        sendResponse(false, 'Error validating email. Please try again.', null, 500);
    }

    // Start session with proper configuration
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Ensure session is writable
    if (!isset($_SESSION)) {
        sendResponse(false, 'Session error. Please try again.', null, 500);
    }
    
    // Generate 6-digit code
    $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Store code in session (expires in 10 minutes)
    $_SESSION['email_code'] = $code;
    $_SESSION['email_code_email'] = $email;
    $_SESSION['email_code_expires'] = time() + 600; // 10 minutes
    
    // Log for debugging (remove in production)
    
    // Get user name if exists (with error handling)
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT name FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        $name = $user ? $user['name'] : 'Utilisateur';
    } catch (PDOException $e) {
        // Use default name if database fails
        $name = 'Utilisateur';
    } catch (Exception $e) {
        $name = 'Utilisateur';
    }
    
    // Send email with code (with error handling)
    try {
        $emailSent = sendEmailCode($email, $name, $code);
    } catch (Exception $e) {
        $emailSent = false;
    }
    
    if ($emailSent) {
        sendResponse(true, 'Code sent successfully', ['email' => $email]);
    } else {
        // On InfinityFree, localhost and some free hosts, mail() might fail
        // Check if we're on InfinityFree, localhost or in development (common hostname patterns)
        $hostname = $_SERVER['HTTP_HOST'] ?? '';
        $isLocalOrDev = (
            $hostname === 'localhost' ||
            strpos($hostname, '127.0.0.1') !== false ||
            strpos($hostname, 'localhost:') !== false ||
            strpos($hostname, 'infinityfree') !== false ||
            strpos($hostname, 'epizy') !== false ||
            strpos($hostname, 'byet') !== false ||
            strpos($hostname, 'freehostia') !== false ||
            (defined('APP_ENV') && APP_ENV === 'development')
        );
        
        // Check if SMTP_FROM_EMAIL is configured (not the default placeholder)
        $smtpConfigured = defined('SMTP_FROM_EMAIL') && 
                         !empty(SMTP_FROM_EMAIL) && 
                         SMTP_FROM_EMAIL !== 'your-email@gmail.com' &&
                         filter_var(SMTP_FROM_EMAIL, FILTER_VALIDATE_EMAIL);
        
        // On free hosts, localhost or in debug mode, allow the code to work even if email fails
        // The code is still stored in session, so user can test
        if ($isLocalOrDev || (defined('DEBUG_MODE') && DEBUG_MODE)) {
            // Always log the code when email fails
            if (!$smtpConfigured) {
            }
            
            // In debug mode, return the code in the response (for testing only)
            $responseData = ['email' => $email];
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                $responseData['debug_code'] = $code;
                $responseData['debug_message'] = 'Email sending failed. Code returned in debug mode only.';
            }
            
            sendResponse(true, 'Code generated successfully. ' . 
                ($smtpConfigured ? 'Email may not have been sent. ' : 'Email not configured. ') .
                (defined('DEBUG_MODE') && DEBUG_MODE ? 'Check response for code (debug mode).' : 'Check server logs for code.'), 
                $responseData);
        } else {
            sendResponse(false, 'Failed to send code. Please try again later.', null, 500);
        }
    }
    
} catch (PDOException $e) {
    sendResponse(false, 'Database error. Please try again later.', null, 500);
} catch (Error $e) {
    // Catch fatal errors (PHP 7+)
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
} catch (Exception $e) {
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
} catch (Throwable $e) {
    // Catch any other throwable (PHP 7+)
    sendResponse(false, 'An error occurred. Please try again later.', null, 500);
}

/**
 * Send email with verification code
 */
function sendEmailCode($email, $name, $code) {
    
    // Suppress warnings from mail() function
    error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
    
    // Check if SMTP constants are defined and properly configured
    if (!defined('SMTP_FROM_EMAIL') || empty(SMTP_FROM_EMAIL)) {
        return false;
    }
    
    // Check if SMTP_FROM_EMAIL is not the default placeholder
    if (SMTP_FROM_EMAIL === 'your-email@gmail.com' || !filter_var(SMTP_FROM_EMAIL, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    
    
    if (!defined('SMTP_FROM_NAME') || empty(SMTP_FROM_NAME)) {
        // Use default name
        $fromName = 'LetShare';
    } else {
        $fromName = SMTP_FROM_NAME;
    }
    
    
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
                                                <p style='font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; margin: 0; font-family: monospace, \"Courier New\", Courier;'>" . htmlspecialchars($code) . "</p>
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
    
    // Try to use PHPMailer if available, prioritize SMTP when configured
    $usePHPMailer = false;
    
    
    // First check if we have SMTP configuration
    $hasSmtpConfig = defined('SMTP_HOST') && !empty(SMTP_HOST) && 
                    defined('SMTP_USERNAME') && !empty(SMTP_USERNAME) &&
                    defined('SMTP_PASSWORD') && !empty(SMTP_PASSWORD);
    
    
    // If we have SMTP config, prioritize loading PHPMailer
    if ($hasSmtpConfig) {
        
        // Check if PHPMailer is already loaded
        if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            $usePHPMailer = true;
        } elseif (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
            // Check if PHPMailer might be available via Composer
            try {
                require_once __DIR__ . '/../../vendor/autoload.php';
                if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                    $usePHPMailer = true;
                } else {
                }
            } catch (Exception $e) {
            }
        } elseif (file_exists(__DIR__ . '/../../vendor/phpmailer/phpmailer/PHPMailer.php')) {
            // Load PHPMailer manually (without Composer)
            try {
                require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/Exception.php';
                require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/PHPMailer.php';
                require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/SMTP.php';
                if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                    $usePHPMailer = true;
                } else {
                }
            } catch (Exception $e) {
            }
        } else {
        // Fallback: Use native SMTP implementation
        try {
            require_once __DIR__ . '/../../lib/simple_smtp.php';
            
            $result = sendEmailViaSMTP(
                $email,
                $subject,
                $message,
                SMTP_FROM_EMAIL,
                $fromName,
                SMTP_HOST,
                SMTP_PORT,
                SMTP_USERNAME,
                SMTP_PASSWORD
            );
            
            if ($result) {
            } else {
            }
            error_reporting(E_ALL);
            return $result;
            
        } catch (Exception $e) {
            error_reporting(E_ALL);
            return false;
        }
        }
    } else {
        // On InfinityFree, mail() function doesn't work - require SMTP
        if (!$hasSmtpConfig) {
        }
        return false;
    }
    
}

