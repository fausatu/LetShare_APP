<?php
/**
 * Helper function to send email verification email
 * This can be used by register.php and other places that need to send verification emails
 */

require_once '../config.php';
require_once '../../lib/simple_smtp.php';

function sendVerificationEmail($email, $name, $token) {
    $verificationUrl = APP_BASE_URL . '/api/auth/verify_email.php?token=' . urlencode($token);
    
    $subject = 'Verify your email address - LetShare';
    
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
                                <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;'>Welcome to LetShare!</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style='padding: 40px 30px;'>
                                <p style='color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>Hi " . htmlspecialchars($name) . ",</p>
                                <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;'>Thank you for registering on LetShare. Please verify your email address by clicking the button below:</p>
                                
                                <!-- Button -->
                                <table width='100%' cellpadding='0' cellspacing='0' style='margin: 30px 0;'>
                                    <tr>
                                        <td align='center'>
                                            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0 auto;'>
                                                <tr>
                                                    <td align='center' style='background-color: #10b981; border-radius: 8px; padding: 2px;'>
                                                        <a href='" . htmlspecialchars($verificationUrl) . "' style='display: block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center; font-family: Arial, sans-serif;'>Verify Email Address</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style='color: #1f2937; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0; text-align: center; font-weight: 600;'>Or copy and paste this link into your browser:</p>
                                <p style='word-break: break-all; color: #059669; font-size: 12px; line-height: 1.6; margin: 0 0 30px 0; padding: 15px; background-color: #ffffff; border-radius: 6px; border: 2px solid #059669; font-family: monospace, \"Courier New\", Courier;'>" . htmlspecialchars($verificationUrl) . "</p>
                                
                                <p style='color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;'>This link will expire in 24 hours.</p>
                                <p style='color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;'>If you didn't create an account on LetShare, please ignore this email.</p>
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
    
    // Use Brevo API via simple_smtp.php
    $fromEmail = SMTP_FROM_EMAIL;
    $fromName = SMTP_FROM_NAME;
    
    $result = sendEmailViaSMTP(
        $email,
        $subject,
        $message,
        $fromEmail,
        $fromName,
        null,
        null,
        null,
        null
    );
    
    if (!$result) {
        error_log('Failed to send verification email to: ' . $email);
        // In development, you might want to log the token instead of failing
        // This allows testing without actual email configuration
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('DEBUG: Verification token for ' . $email . ': ' . $token);
        }
        return false;
    }
    
    return true;
}

