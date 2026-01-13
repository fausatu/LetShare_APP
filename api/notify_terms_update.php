<?php
/**
 * Terms Update Email Notification System
 * 
 * This script should be run via cron job once per day to:
 * 1. Check if new terms version exists
 * 2. Find users who haven't accepted the new version
 * 3. Send email notifications during grace period
 * 
 * Setup cron job:
 * 0 9 * * * php /path/to/notify_terms_update.php
 * (Runs daily at 9:00 AM)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/email_config.php';

// Configuration - These should match js/terms-config.js
$CURRENT_VERSION = '2026-01-12';
$EFFECTIVE_DATE = '2026-01-19';
$VERSION_NAME = 'v1.0';
$GRACE_PERIOD_DAYS = 7;

// Calculate days remaining
$today = new DateTime();
$effectiveDate = new DateTime($EFFECTIVE_DATE);
$daysRemaining = $today->diff($effectiveDate)->days;
$isBeforeEffective = $today < $effectiveDate;

// Log execution
$logFile = __DIR__ . '/../logs/terms_notifications.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    echo "[$timestamp] $message\n";
}

logMessage("========== Terms Notification Check Started ==========");
logMessage("Current Version: $CURRENT_VERSION ($VERSION_NAME)");
logMessage("Effective Date: $EFFECTIVE_DATE");
logMessage("Days Remaining: " . ($isBeforeEffective ? $daysRemaining : 0));

// Only send notifications if we're in grace period
if (!$isBeforeEffective) {
    logMessage("Effective date has passed. No notifications needed.");
    exit(0);
}

// Only send on specific days: 7, 3, 1 days before
$sendOnDays = [7, 3, 1];
if (!in_array($daysRemaining, $sendOnDays)) {
    logMessage("Not a notification day. Skipping. (Next notification at $daysRemaining days)");
    exit(0);
}

logMessage("Notification day! Sending emails to users with old version...");

try {
    $pdo = getDBConnection();
    
    // Find users who:
    // 1. Have accepted terms before (not null)
    // 2. But have old version (not current version)
    // 3. Haven't received notification today
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.language, u.terms_version, u.terms_accepted_at
        FROM users u
        WHERE u.terms_accepted_at IS NOT NULL
          AND (u.terms_version != ? OR u.terms_version IS NULL)
          AND (u.last_terms_notification IS NULL 
               OR DATE(u.last_terms_notification) < CURDATE())
    ");
    $stmt->execute([$CURRENT_VERSION]);
    $users = $stmt->fetchAll();
    
    logMessage("Found " . count($users) . " users to notify");
    
    if (count($users) === 0) {
        logMessage("No users to notify. Exiting.");
        exit(0);
    }
    
    $sentCount = 0;
    $errorCount = 0;
    
    foreach ($users as $user) {
        try {
            $isFrench = ($user['language'] ?? 'fr') === 'fr';
            
            // Prepare email content
            $subject = $isFrench 
                ? "📋 Nos conditions d'utilisation ont été mises à jour - Action requise"
                : "📋 Our Terms of Service have been updated - Action required";
            
            $htmlBody = getEmailTemplate($user, $isFrench, $daysRemaining, $EFFECTIVE_DATE, $VERSION_NAME);
            
            // Send email
            $sent = sendEmail($user['email'], $user['name'], $subject, $htmlBody);
            
            if ($sent) {
                // Update last notification timestamp
                $updateStmt = $pdo->prepare("
                    UPDATE users 
                    SET last_terms_notification = NOW() 
                    WHERE id = ?
                ");
                $updateStmt->execute([$user['id']]);
                
                $sentCount++;
                logMessage("✓ Sent to: {$user['email']}");
            } else {
                $errorCount++;
                logMessage("✗ Failed to send to: {$user['email']}");
            }
            
            // Rate limiting - wait 100ms between emails
            usleep(100000);
            
        } catch (Exception $e) {
            $errorCount++;
            logMessage("✗ Error sending to {$user['email']}: " . $e->getMessage());
        }
    }
    
    logMessage("========== Notification Summary ==========");
    logMessage("Successfully sent: $sentCount");
    logMessage("Errors: $errorCount");
    logMessage("Total processed: " . count($users));
    logMessage("========== Process Complete ==========");
    
} catch (Exception $e) {
    logMessage("FATAL ERROR: " . $e->getMessage());
    exit(1);
}

function sendEmail($to, $name, $subject, $htmlBody) {
    return sendLetshareEmail($to, $subject, $htmlBody);
}

function getEmailTemplate($user, $isFrench, $daysRemaining, $effectiveDate, $versionName) {
    $name = htmlspecialchars($user['name']);
    $appUrl = 'https://letshare.infinityfreeapp.com';
    
    if ($isFrench) {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Letshare</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Mise à jour importante</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour <strong>$name</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                Nous avons mis à jour nos <strong>Conditions Générales d'Utilisation</strong> et notre <strong>Politique de confidentialité</strong> (version $versionName).
            </p>
            
            <!-- Urgency Box -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #92400e; font-size: 15px; font-weight: 600; margin: 0 0 10px 0;">
                    ⚠️ Action requise
                </p>
                <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                    Il vous reste <strong style="font-size: 18px; color: #b45309;">$daysRemaining jour(s)</strong> pour accepter les nouvelles conditions.<br>
                    Date limite : <strong>$effectiveDate</strong>
                </p>
            </div>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                Ces modifications entrent en vigueur le <strong>$effectiveDate</strong>. Après cette date, vous devrez accepter les nouvelles conditions pour continuer à utiliser Letshare.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="$appUrl" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    Lire et accepter les conditions
                </a>
            </div>
            
            <!-- Documents List -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">📄 Documents mis à jour :</p>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 2;">
                    <li>Conditions Générales d'Utilisation</li>
                    <li>Politique de confidentialité</li>
                </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0;">
                Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:letshare.privacy@gmail.com" style="color: #10b981;">letshare.privacy@gmail.com</a>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                Letshare - Plateforme d'échange étudiante<br>
                Clermont-Ferrand, France
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
        </div>
        
    </div>
</body>
</html>
HTML;
    } else {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Letshare</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Important Update</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>$name</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                We have updated our <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> (version $versionName).
            </p>
            
            <!-- Urgency Box -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #92400e; font-size: 15px; font-weight: 600; margin: 0 0 10px 0;">
                    ⚠️ Action Required
                </p>
                <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                    You have <strong style="font-size: 18px; color: #b45309;">$daysRemaining day(s)</strong> to accept the new terms.<br>
                    Deadline: <strong>$effectiveDate</strong>
                </p>
            </div>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                These changes will become effective on <strong>$effectiveDate</strong>. After this date, you will need to accept the new terms to continue using Letshare.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="$appUrl" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    Read and Accept Terms
                </a>
            </div>
            
            <!-- Documents List -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">📄 Updated Documents:</p>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 2;">
                    <li>Terms of Service</li>
                    <li>Privacy Policy</li>
                </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0;">
                If you have any questions, feel free to contact us at <a href="mailto:letshare.privacy@gmail.com" style="color: #10b981;">letshare.privacy@gmail.com</a>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                Letshare - Student Exchange Platform<br>
                Clermont-Ferrand, France
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                This email was sent automatically. Please do not reply.
            </p>
        </div>
        
    </div>
</body>
</html>
HTML;
    }
}
