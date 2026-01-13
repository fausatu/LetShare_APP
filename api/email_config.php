<?php
/**
 * Email Configuration - Wrapper for Brevo API
 * Used by automated email systems (cron jobs, reminders, etc.)
 */

require_once __DIR__ . '/../lib/simple_smtp.php';
require_once __DIR__ . '/config.php';

/**
 * Send email using Brevo API
 * 
 * @param string $to Recipient email
 * @param string $subject Email subject
 * @param string $htmlBody Email HTML content
 * @return bool Success status
 */
function sendLetshareEmail($to, $subject, $htmlBody) {
    $fromEmail = $_ENV['SMTP_FROM_EMAIL'] ?? 'letshare.privacy@gmail.com';
    $fromName = $_ENV['SMTP_FROM_NAME'] ?? 'LetShare';
    
    // Use simple_smtp.php which now uses Brevo API
    return sendEmailViaSMTP(
        $to,
        $subject,
        $htmlBody,
        $fromEmail,
        $fromName,
        null, // Not used by Brevo
        null, // Not used by Brevo
        null, // Not used by Brevo
        null  // Not used by Brevo
    );
}
