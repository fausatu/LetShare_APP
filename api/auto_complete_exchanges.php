<?php
/**
 * Auto-completion script for exchanges
 * This script should be run daily via cron job to:
 * 1. Send reminders for partial confirmations (notifications + emails)
 * 2. Auto-complete exchanges after 7 days
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/email_config.php';

// Security: Only allow execution with secret key (after config loads .env)
$secret_key = $_ENV['CRON_SECRET'] ?? 'your-secret-key-here';
$provided_key = $_GET['key'] ?? $_POST['key'] ?? '';

if (!hash_equals($secret_key, $provided_key)) {
    http_response_code(403);
    die("Access denied. Invalid or missing key.");
}

/**
 * Send email reminder to user
 * @param string $type 'exchange' or 'donation'
 * @param bool $isFinal true for the last reminder before auto-completion
 */
function sendReminderEmail($pdo, $userId, $itemTitle, $dayText, $type = 'exchange', $isFinal = false) {
    try {
        // Get user email
        $stmt = $pdo->prepare("SELECT email, name, language FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || !$user['email']) {
            return false;
        }
        
        $userLang = $user['language'] ?? 'fr';
        $appUrl = $_ENV['APP_BASE_URL'] ?? 'https://letshare-app.fr';
        $supportEmail = $_ENV['SMTP_FROM_EMAIL'] ?? 'support@letshare-app.fr';
        $userName = htmlspecialchars($user['name'] ?? '');
        $itemTitleSafe = htmlspecialchars($itemTitle);
        $isFr = ($userLang === 'fr');
        $isDonation = ($type === 'donation');
        
        // === SUBJECT ===
        if ($isDonation) {
            if ($isFinal) {
                $subject = $isFr 
                    ? "Dernier rappel : confirmez la réception de votre article - LetShare" 
                    : "Final reminder: confirm receipt of your item - LetShare";
            } else {
                $subject = $isFr 
                    ? "Rappel : avez-vous bien reçu votre article ? - LetShare" 
                    : "Reminder: did you receive your item? - LetShare";
            }
        } else {
            $subject = $isFr 
                ? "Rappel : confirmez la réception de votre article - LetShare" 
                : "Reminder: confirm receipt of your item - LetShare";
        }
        
        // === HEADER ===
        if ($isDonation && $isFinal) {
            $headerTitle = $isFr ? '🎁 Dernier rappel' : '🎁 Final Reminder';
        } elseif ($isDonation) {
            $headerTitle = $isFr ? '🎁 Rappel' : '🎁 Reminder';
        } else {
            $headerTitle = $isFr ? '🔄 Rappel de confirmation' : '🔄 Confirmation Reminder';
        }
        
        // === MAIN TEXT ===
        if ($isDonation && $isFinal) {
            $mainText = $isFr
                ? "Votre demande pour l'article <strong>\"$itemTitleSafe\"</strong> a été acceptée il y a $dayText. Avez-vous bien récupéré l'article ?"
                : "Your request for the item <strong>\"$itemTitleSafe\"</strong> was accepted $dayText ago. Did you pick up the item?";
        } elseif ($isDonation) {
            $mainText = $isFr
                ? "Votre demande pour l'article <strong>\"$itemTitleSafe\"</strong> a été acceptée il y a $dayText. Si vous l'avez bien récupéré, merci de confirmer la bonne réception sur LetShare."
                : "Your request for the item <strong>\"$itemTitleSafe\"</strong> was accepted $dayText ago. If you've picked it up, please confirm receipt on LetShare.";
        } else {
            $mainText = $isFr 
                ? "L'autre membre a confirmé avoir reçu votre article <strong>\"$itemTitleSafe\"</strong> il y a $dayText. Merci de confirmer de votre côté que vous avez bien récupéré le sien."
                : "The other member confirmed receiving your item <strong>\"$itemTitleSafe\"</strong> $dayText ago. Please confirm on your side that you picked up theirs.";
        }
        
        // === CTA TEXT ===
        if ($isDonation && $isFinal) {
            $ctaText = $isFr
                ? "<strong>C'est votre dernier rappel.</strong> Si vous ne confirmez pas d'ici demain, l'article sera automatiquement marqué comme reçu."
                : "<strong>This is your final reminder.</strong> If you don't confirm by tomorrow, the item will be automatically marked as received.";
        } elseif ($isDonation) {
            $ctaText = $isFr
                ? "Si la remise n'a pas encore eu lieu, n'hésitez pas à envoyer un message à l'autre membre via l'application pour convenir d'un rendez-vous."
                : "If the handover hasn't taken place yet, feel free to message the other member via the app to arrange a meeting.";
        } else {
            $ctaText = '';
        }
        
        // === NOTE ===
        if ($isDonation && !$isFinal) {
            $noteText = $isFr
                ? "Sans confirmation de votre part, l'article sera automatiquement marqué comme reçu après 11 jours."
                : "Without your confirmation, the item will be automatically marked as received after 11 days.";
        } elseif (!$isDonation) {
            $noteText = $isFr
                ? "Sans confirmation de votre part dans les 7 jours, la transaction sera automatiquement marquée comme terminée."
                : "Without your confirmation within 7 days, the transaction will be automatically marked as completed.";
        } else {
            $noteText = '';
        }
        
        // === BUTTON ===
        $buttonText = $isFr ? 'Confirmer la réception' : 'Confirm Receipt';
        
        // === SUPPORT LINE ===
        $supportLine = $isFr 
            ? "Un problème ? Contactez-nous à <a href='mailto:$supportEmail'>$supportEmail</a>"
            : "Having an issue? Contact us at <a href='mailto:$supportEmail'>$supportEmail</a>";
        
        // Build optional sections
        $ctaSection = $ctaText ? "<p>$ctaText</p>" : '';
        $noteSection = $noteText ? "<p><strong>" . ($isFr ? 'Note :' : 'Note:') . "</strong> $noteText</p>" : '';
        
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
                .support { color: #888; font-size: 13px; margin-top: 15px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>$headerTitle</h2>
                </div>
                <div class='content'>
                    <p>" . ($isFr ? 'Bonjour' : 'Hello') . " " . $userName . ",</p>
                    
                    <p>$mainText</p>
                    
                    $ctaSection
                    
                    <p style='text-align: center;'>
                        <a href='" . htmlspecialchars($appUrl) . "/index.html' class='button'>
                            $buttonText
                        </a>
                    </p>
                    
                    $noteSection
                    
                    <p class='support'>$supportLine</p>
                    
                    <p>" . ($isFr ? 'Merci,<br>L\'équipe LetShare' : 'Thanks,<br>The LetShare Team') . "</p>
                </div>
                <div class='footer'>
                    <p>" . ($isFr ? 'Cet email a été envoyé automatiquement. Ne pas répondre.' : 'This email was sent automatically. Do not reply.') . "</p>
                </div>
            </div>
        </body>
        </html>";
        
        $result = sendLetshareEmail($user['email'], $subject, $htmlBody);
        
        if ($result) {
            return true;
        } else {
            return false;
        }
        
    } catch (Exception $e) {
        return false;
    }
}

try {
    $pdo = getDBConnection();
    
    // 1. Send reminders for partial confirmations (after 1, 3, 5 days)
    // Use range-based matching so reminders aren't missed if cron skips a day
    $reminderDays = [1, 3, 5];
    
    foreach ($reminderDays as $days) {
        $nextDay = $days + 1;
        // If this is the last reminder tier, match anything from this day up to auto-complete (7 days)
        if ($days === 5) {
            $nextDay = 7;
        } elseif ($days === 3) {
            $nextDay = 5;
        } elseif ($days === 1) {
            $nextDay = 3;
        }
        $stmt = $pdo->prepare("
            SELECT c.id, c.item_id, c.owner_id, c.requester_id, c.owner_confirmed_at, c.requester_confirmed_at,
                   i.title as item_title, i.type as item_type
            FROM conversations c
            INNER JOIN items i ON c.item_id = i.id
            WHERE c.status = 'partial_confirmed' 
            AND COALESCE(c.owner_confirmed_at, c.requester_confirmed_at) <= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND COALESCE(c.owner_confirmed_at, c.requester_confirmed_at) > DATE_SUB(NOW(), INTERVAL ? DAY)
            AND (c.confirmation_reminder_sent_at IS NULL 
                 OR DATE(c.confirmation_reminder_sent_at) != CURDATE())
        ");
        $stmt->execute([$days, $nextDay]);
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
            
            // Mark reminder as sent (preserve updated_at to avoid resetting the day counter)
            $stmtReminder = $pdo->prepare("UPDATE conversations SET confirmation_reminder_sent_at = NOW(), updated_at = updated_at WHERE id = ?");
            $stmtReminder->execute([$conv['id']]);
            
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
        AND COALESCE(c.owner_confirmed_at, c.requester_confirmed_at) < DATE_SUB(NOW(), INTERVAL 7 DAY)
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
            'exchange_auto_completed',
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
    
    // === DONATION REMINDERS ===
    // Donations: only the requester confirms. If they don't after acceptance:
    //   - Day 5: first reminder email
    //   - Day 10: final reminder email (last chance)
    //   - Day 11: auto-complete
    
    // 3. First reminder for accepted donations (5 days, no reminder sent yet)
    $stmt = $pdo->prepare("
        SELECT c.id, c.item_id, c.owner_id, c.requester_id,
               i.title as item_title, i.type as item_type
        FROM conversations c
        INNER JOIN items i ON c.item_id = i.id
        WHERE c.status = 'accepted' 
        AND i.type = 'donation' 
        AND c.requester_confirmed_at IS NULL
        AND c.accepted_at IS NOT NULL
        AND c.accepted_at <= DATE_SUB(NOW(), INTERVAL 5 DAY)
        AND c.confirmation_reminder_sent_at IS NULL
    ");
    $stmt->execute();
    $donationReminders5 = $stmt->fetchAll();
    
    foreach ($donationReminders5 as $conv) {
        require_once __DIR__ . '/notification_helper.php';
        $requesterLang = getUserLanguage($pdo, $conv['requester_id']);
        
        $reminderTitle = getNotifText('donation_confirmation_reminder', $requesterLang);
        $reminderMessage = getNotifText('donation_confirmation_reminder_msg', $requesterLang, ['item' => $conv['item_title']]);
        
        // Create in-app notification + trigger email (type confirmation_reminder_5days)
        createNotification(
            $pdo,
            $conv['requester_id'],
            'confirmation_reminder_5days',
            $reminderTitle,
            $reminderMessage,
            $conv['item_id'],
            $conv['id'],
            $conv['owner_id']
        );
        
        // Also send the simple reminder email
        sendReminderEmail($pdo, $conv['requester_id'], $conv['item_title'], 
            $requesterLang === 'fr' ? '5 jours' : '5 days', 'donation');
        
        // Mark reminder as sent (preserve updated_at)
        $stmtReminder = $pdo->prepare("UPDATE conversations SET confirmation_reminder_sent_at = NOW(), updated_at = updated_at WHERE id = ?");
        $stmtReminder->execute([$conv['id']]);
        
        echo "Donation reminder (5 days) sent for conversation {$conv['id']}\n";
    }
    
    // 4. Second/final reminder for accepted donations (10 days, first reminder already sent)
    $stmt = $pdo->prepare("
        SELECT c.id, c.item_id, c.owner_id, c.requester_id,
               i.title as item_title, i.type as item_type
        FROM conversations c
        INNER JOIN items i ON c.item_id = i.id
        WHERE c.status = 'accepted' 
        AND i.type = 'donation' 
        AND c.requester_confirmed_at IS NULL
        AND c.accepted_at IS NOT NULL
        AND c.accepted_at <= DATE_SUB(NOW(), INTERVAL 10 DAY)
        AND c.confirmation_reminder_sent_at IS NOT NULL
        AND c.confirmation_reminder_sent_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)
    ");
    $stmt->execute();
    $donationReminders10 = $stmt->fetchAll();
    
    foreach ($donationReminders10 as $conv) {
        require_once __DIR__ . '/notification_helper.php';
        $requesterLang = getUserLanguage($pdo, $conv['requester_id']);
        
        $reminderTitle = getNotifText('donation_confirmation_reminder_final', $requesterLang);
        $reminderMessage = getNotifText('donation_confirmation_reminder_final_msg', $requesterLang, ['item' => $conv['item_title']]);
        
        // Create in-app notification + trigger email (type confirmation_reminder_10days)
        createNotification(
            $pdo,
            $conv['requester_id'],
            'confirmation_reminder_10days',
            $reminderTitle,
            $reminderMessage,
            $conv['item_id'],
            $conv['id'],
            $conv['owner_id']
        );
        
        sendReminderEmail($pdo, $conv['requester_id'], $conv['item_title'],
            $requesterLang === 'fr' ? '10 jours' : '10 days', 'donation', true);
        
        // Update reminder timestamp (preserve updated_at)
        $stmtReminder = $pdo->prepare("UPDATE conversations SET confirmation_reminder_sent_at = NOW(), updated_at = updated_at WHERE id = ?");
        $stmtReminder->execute([$conv['id']]);
        
        echo "Donation reminder (10 days - final) sent for conversation {$conv['id']}\n";
    }
    
    // 5. Auto-complete accepted donations after 11 days (1 day grace after final reminder)
    $stmt = $pdo->prepare("
        SELECT c.id, c.item_id, c.owner_id, c.requester_id,
               i.title as item_title, i.type as item_type
        FROM conversations c
        INNER JOIN items i ON c.item_id = i.id
        WHERE c.status = 'accepted' 
        AND i.type = 'donation' 
        AND c.requester_confirmed_at IS NULL
        AND c.accepted_at IS NOT NULL
        AND c.accepted_at <= DATE_SUB(NOW(), INTERVAL 11 DAY)
        AND c.confirmation_reminder_sent_at IS NOT NULL
        AND c.confirmation_reminder_sent_at <= DATE_SUB(NOW(), INTERVAL 1 DAY)
    ");
    $stmt->execute();
    $expiredDonations = $stmt->fetchAll();
    
    foreach ($expiredDonations as $conv) {
        // Auto-complete the donation
        $stmtUpdate = $pdo->prepare("
            UPDATE conversations 
            SET status = 'completed', 
                requester_confirmed_at = NOW(),
                updated_at = NOW() 
            WHERE id = ?
        ");
        $stmtUpdate->execute([$conv['id']]);
        
        // Update item status
        $stmtUpdate = $pdo->prepare("UPDATE items SET status = 'completed' WHERE id = ?");
        $stmtUpdate->execute([$conv['item_id']]);
        
        require_once __DIR__ . '/notification_helper.php';
        
        // Notify the requester (who didn't confirm)
        $requesterLang = getUserLanguage($pdo, $conv['requester_id']);
        $autoTitle = getNotifText('donation_auto_completed', $requesterLang);
        $autoMessage = getNotifText('donation_auto_completed_msg', $requesterLang, ['item' => $conv['item_title']]);
        
        createNotification(
            $pdo,
            $conv['requester_id'],
            'exchange_auto_completed',
            $autoTitle,
            $autoMessage,
            $conv['item_id'],
            $conv['id'],
            null
        );
        
        // Notify the owner (donor) that donation is complete
        $ownerLang = getUserLanguage($pdo, $conv['owner_id']);
        $completeTitle = getNotifText('donation_completed', $ownerLang);
        $completeMessage = getNotifText('donation_completed_msg', $ownerLang, ['item' => $conv['item_title']]);
        
        createNotification(
            $pdo,
            $conv['owner_id'],
            'system',
            $completeTitle,
            $completeMessage,
            $conv['item_id'],
            $conv['id'],
            null
        );
        
        echo "Auto-completed donation conversation {$conv['id']} after 11 days\n";
    }
    
    echo "Auto-completion script completed successfully\n";
    
} catch (Exception $e) {
    echo "Error in auto-completion script: " . $e->getMessage() . "\n";
}
?>
