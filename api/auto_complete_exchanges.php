<?php
/**
 * Auto-completion script for exchanges
 * This script should be run daily via cron job to:
 * 1. Send reminders for partial confirmations (notifications + emails)
 * 2. Auto-complete exchanges after 7 days
 */
// Security: Only allow execution with secret key
$secret_key = $_ENV['CRON_SECRET'] ?? 'your-secret-key-here';
$provided_key = $_GET['key'] ?? $_POST['key'] ?? '';

if ($provided_key !== $secret_key) {
    http_response_code(403);
    die("Access denied. Invalid or missing key.");
}
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/email_config.php';

/**
 * Send email reminder to user
 */
function sendReminderEmail($pdo, $userId, $itemTitle, $dayText) {
    try {
        // Get user email
        $stmt = $pdo->prepare("SELECT email, first_name FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || !$user['email']) {
            error_log("No email found for user $userId");
            return false;
        }
        
        $subject = "Rappel d'échange - Letshare";
        $firstName = htmlspecialchars($user['first_name'] ?? '');
        $itemTitleSafe = htmlspecialchars($itemTitle);
        
        $htmlBody = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background: #4CAF50; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    margin: 15px 0;
                }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>📦 Rappel d'échange</h2>
                </div>
                <div class='content'>
                    <p>Bonjour " . $firstName . ",</p>
                    
                    <p>Votre partenaire d'échange a confirmé avoir reçu votre article <strong>\"$itemTitleSafe\"</strong> il y a $dayText.</p>
                    
                    <p>N'oubliez pas de confirmer de votre côté que vous avez bien reçu l'article de votre partenaire !</p>
                    
                    <p style='text-align: center;'>
                        <a href='https://letshare.infinityfreeapp.com/profile.html' class='button'>
                            Confirmer la réception
                        </a>
                    </p>
                    
                    <p><strong>Note :</strong> Si vous ne confirmez pas dans les 7 jours, l'échange sera automatiquement marqué comme terminé.</p>
                    
                    <p>Merci,<br>L'équipe Letshare</p>
                </div>
                <div class='footer'>
                    <p>Cet email a été envoyé automatiquement. Ne pas répondre.</p>
                </div>
            </div>
        </body>
        </html>";
        
        $result = sendLetshareEmail($user['email'], $subject, $htmlBody);
        
        if ($result) {
            error_log("Reminder email sent to {$user['email']} for item: $itemTitle");
            return true;
        } else {
            error_log("Failed to send reminder email to {$user['email']}");
            return false;
        }
        
    } catch (Exception $e) {
        error_log("Error sending reminder email: " . $e->getMessage());
        return false;
    }
}

try {
    $pdo = getDBConnection();
    
    // 1. Send reminders for partial confirmations (after 1, 3, 5 days)
    $reminderDays = [1, 3, 5];
    
    foreach ($reminderDays as $days) {
        $stmt = $pdo->prepare("
            SELECT c.id, c.item_id, c.owner_id, c.requester_id, c.owner_confirmed_at, c.requester_confirmed_at,
                   i.title as item_title, i.type as item_type
            FROM conversations c
            INNER JOIN items i ON c.item_id = i.id
            WHERE c.status = 'partial_confirmed' 
            AND DATE(c.updated_at) = DATE(DATE_SUB(NOW(), INTERVAL ? DAY))
            AND (c.confirmation_reminder_sent_at IS NULL 
                 OR DATE(c.confirmation_reminder_sent_at) != CURDATE())
        ");
        $stmt->execute([$days]);
        $partialConversations = $stmt->fetchAll();
        
        foreach ($partialConversations as $conv) {
            $waitingUserId = $conv['owner_confirmed_at'] ? $conv['requester_id'] : $conv['owner_id'];
            $dayText = $days == 1 ? 'yesterday' : $days . ' days ago';
            
            // Send in-app notification
            require_once __DIR__ . '/notification_helper.php';
            $userLang = getUserLanguage($pdo, $waitingUserId);
            $reminderTitle = getNotifText('exchange_reminder', $userLang);
            $reminderMessage = getNotifText('exchange_reminder_msg', $userLang, ['dayText' => $dayText, 'item' => $conv['item_title']]);
            
            createNotification(
                $pdo,
                $waitingUserId,
                'system',
                $reminderTitle,
                $reminderMessage,
                $conv['item_id'],
                $conv['id'],
                null
            );
            
            // Send email reminder
            sendReminderEmail($pdo, $waitingUserId, $conv['item_title'], $dayText);
            
            // Mark reminder as sent
            $stmt = $pdo->prepare("UPDATE conversations SET confirmation_reminder_sent_at = NOW() WHERE id = ?");
            $stmt->execute([$conv['id']]);
            
            echo "Reminder sent (notification + email) for conversation {$conv['id']} (day {$days})\n";
        }
    }
    
    // 2. Auto-complete partial confirmations after 7 days
    $stmt = $pdo->prepare("
        SELECT c.id, c.item_id, c.owner_id, c.requester_id, c.owner_confirmed_at, c.requester_confirmed_at,
               i.title as item_title, i.type as item_type
        FROM conversations c
        INNER JOIN items i ON c.item_id = i.id
        WHERE c.status = 'partial_confirmed' 
        AND c.updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $stmt->execute();
    $expiredConversations = $stmt->fetchAll();
    
    foreach ($expiredConversations as $conv) {
        // Auto-complete the conversation
        $stmt = $pdo->prepare("
            UPDATE conversations 
            SET status = 'completed', 
                owner_confirmed_at = COALESCE(owner_confirmed_at, NOW()),
                requester_confirmed_at = COALESCE(requester_confirmed_at, NOW()),
                updated_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$conv['id']]);
        
        // Update item status
        $stmt = $pdo->prepare("UPDATE items SET status = 'completed' WHERE id = ?");
        $stmt->execute([$conv['item_id']]);
        
        // Notify both parties
        $waitingUserId = $conv['owner_confirmed_at'] ? $conv['requester_id'] : $conv['owner_id'];
        $confirmedUserId = $conv['owner_confirmed_at'] ? $conv['owner_id'] : $conv['requester_id'];
        
        require_once __DIR__ . '/notification_helper.php';
        
        // Notify the person who hadn't confirmed yet
        $waitingUserLang = getUserLanguage($pdo, $waitingUserId);
        $autoCompleteTitle = getNotifText('exchange_auto_completed', $waitingUserLang);
        $autoCompleteMessage = getNotifText('exchange_auto_completed_msg', $waitingUserLang, ['item' => $conv['item_title']]);
        
        createNotification(
            $pdo,
            $waitingUserId,
            'system',
            $autoCompleteTitle,
            $autoCompleteMessage,
            $conv['item_id'],
            $conv['id'],
            null
        );
        
        // Notify the person who had confirmed
        $confirmedUserLang = getUserLanguage($pdo, $confirmedUserId);
        $completeTitle = getNotifText('exchange_completed', $confirmedUserLang);
        $completeMessage = getNotifText('exchange_completed_msg', $confirmedUserLang, ['item' => $conv['item_title']]);
        
        createNotification(
            $pdo,
            $confirmedUserId,
            'system',
            $completeTitle,
            $completeMessage,
            $conv['item_id'],
            $conv['id'],
            null
        );
        
        echo "Auto-completed conversation {$conv['id']} after 7 days\n";
    }
    
    echo "Auto-completion script completed successfully\n";
    
} catch (Exception $e) {
    echo "Error in auto-completion script: " . $e->getMessage() . "\n";
    error_log("Auto-completion script error: " . $e->getMessage());
}
?>