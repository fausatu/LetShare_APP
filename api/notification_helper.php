<?php
/**
 * Helper functions for notifications
 * This file can be included in other API files without executing HTTP request handling
 */

require_once __DIR__ . '/email_config.php';

/**
 * Get notification translations
 */
function getNotificationTranslations() {
    return [
        'fr' => [
            // Titles
            'new_request' => 'Nouvelle demande',
            'request_accepted' => 'Demande acceptée',
            'request_rejected' => 'Demande refusée',
            'request_no_longer_available' => 'Demande non disponible',
            'new_review' => 'Nouvel avis',
            'new_message' => 'Nouveau message',
            'confirmation_needed' => 'Confirmation requise',
            'exchange_completed' => 'Échange terminé',
            'exchange_auto_completed' => 'Échange complété automatiquement',
            'exchange_reminder' => 'Rappel de confirmation d\'échange',
            'exchange_confirmation_reminder_5days' => 'Merci de confirmer la réception',
            'exchange_confirmation_reminder_10days' => 'Dernière chance de confirmer',
            'item_no_longer_available' => 'Article non disponible',
            'donation_confirmation_reminder' => 'Avez-vous bien reçu votre article ?',
            'donation_confirmation_reminder_final' => 'Dernier rappel : confirmez la réception de votre article',
            'donation_auto_completed' => 'Article marqué comme reçu automatiquement',
            'donation_completed' => 'Article remis avec succès',
            'acceptance_cancelled' => 'Échange annulé',
            'request_reactivated' => 'Demande réactivée',
            
            // Messages
            'interested_in_donation' => '{name} est intéressé(e) par votre don : {item}',
            'interested_in_loan' => '{name} est intéressé(e) par votre prêt : {item}',
            'interested_in_item' => '{name} est intéressé(e) par : {item}',
            'request_accepted_msg' => 'Votre demande pour "{item}" a été acceptée !',
            'request_rejected_msg' => 'Votre demande pour "{item}" a été refusée',
            'request_no_longer_available_msg' => '"{item}" n\'est plus disponible car une autre demande a été acceptée.',
            'review_received' => '{name} vous a laissé un avis {rating} étoiles pour "{item}"',
            'confirmation_needed_msg' => 'Votre partenaire d\'échange a confirmé. Merci de confirmer de votre côté également.',
            'exchange_auto_completed_msg' => 'Votre échange pour "{item}" a été marqué automatiquement comme complété. Vous pouvez toujours laisser un avis.',
            'exchange_completed_msg' => 'Votre échange pour "{item}" est terminé. Vous pouvez maintenant laisser un avis.',
            'exchange_reminder_msg' => 'Rappel : Votre partenaire d\'échange a confirmé {dayText}. Veuillez confirmer votre côté de l\'échange pour "{item}".',
            'exchange_confirmation_reminder_5days_msg' => 'Bonjour, n\'oubliez pas de confirmer que vous avez reçu "{item}". Cette confirmation est importante pour finaliser l\'échange.',
            'exchange_confirmation_reminder_10days_msg' => 'Rappel final : Veuillez confirmer la réception de "{item}" avant demain pour éviter une clôture automatique de l\'échange.',
            'item_no_longer_available_msg' => 'Le {type} « {item} » n\'est plus disponible.',
            'donation_confirmation_reminder_msg' => 'Votre demande pour "{item}" a été acceptée. Si vous l\'avez bien récupéré, merci de confirmer la bonne réception.',
            'donation_confirmation_reminder_final_msg' => 'Dernier rappel : confirmez la réception de "{item}" avant demain, sinon l\'article sera automatiquement marqué comme reçu.',
            'donation_auto_completed_msg' => 'L\'article "{item}" a été automatiquement marqué comme reçu. Vous pouvez toujours laisser un avis.',
            'donation_completed_msg' => 'Votre article "{item}" a été remis avec succès. Le receveur a confirmé (ou le délai a expiré). Merci pour votre générosité !',
            'acceptance_cancelled_msg' => 'Le propriétaire a annulé l\'acceptation pour "{item}". L\'article est de nouveau disponible, vous pouvez renvoyer une demande.',
            'request_reactivated_msg' => 'L\'article "{item}" est de nouveau disponible ! Votre demande a été automatiquement réactivée.',
            
            // Email
            'view_exchange' => 'Voir l\'échange',
            'view_review' => 'Voir l\'avis',
            'confirm_receipt' => 'Confirmer la réception',
            'email_greeting' => 'Bonjour',
            'email_footer' => 'Cet email a été envoyé par LetShare. Si vous ne l\'attendiez pas, vous pouvez l\'ignorer.'
        ],
        'en' => [
            // Titles
            'new_request' => 'New Request',
            'request_accepted' => 'Request Accepted',
            'request_rejected' => 'Request Rejected',
            'request_no_longer_available' => 'Request No Longer Available',
            'new_review' => 'New Review',
            'new_message' => 'New Message',
            'confirmation_needed' => 'Confirmation Needed',
            'exchange_completed' => 'Exchange Completed',
            'exchange_auto_completed' => 'Exchange Auto Completed',
            'exchange_reminder' => 'Exchange Confirmation Reminder',
            'exchange_confirmation_reminder_5days' => 'Please Confirm Receipt',
            'exchange_confirmation_reminder_10days' => 'Last Chance to Confirm',
            'item_no_longer_available' => 'Item No Longer Available',
            'donation_confirmation_reminder' => 'Did you receive your item?',
            'donation_confirmation_reminder_final' => 'Final reminder: confirm receipt of your item',
            'donation_auto_completed' => 'Item automatically marked as received',
            'donation_completed' => 'Item Successfully Delivered',
            'acceptance_cancelled' => 'Exchange Cancelled',
            'request_reactivated' => 'Request Reactivated',
            
            // Messages
            'interested_in_donation' => '{name} is interested in your donation: {item}',
            'interested_in_loan' => '{name} is interested in your loan: {item}',
            'interested_in_item' => '{name} is interested in: {item}',
            'request_accepted_msg' => 'Your request for "{item}" has been accepted!',
            'request_rejected_msg' => 'Your request for "{item}" has been rejected',
            'request_no_longer_available_msg' => '"{item}" is no longer available as another request has been accepted.',
            'review_received' => '{name} left you a {rating}-star review for "{item}"',
            'confirmation_needed_msg' => 'Your exchange partner has confirmed completion. Please confirm on your side too.',
            'exchange_auto_completed_msg' => 'Your exchange for "{item}" has been automatically marked as completed. You can still leave a review.',
            'exchange_completed_msg' => 'Your exchange for "{item}" has been completed. You can now leave a review.',
            'exchange_reminder_msg' => 'Reminder: Your exchange partner confirmed {dayText}. Please confirm your side of the exchange for "{item}".',
            'exchange_confirmation_reminder_5days_msg' => 'Hello, don\'t forget to confirm that you received "{item}". This confirmation is important to finalize the exchange.',
            'exchange_confirmation_reminder_10days_msg' => 'Final reminder: Please confirm receipt of "{item}" before tomorrow to avoid automatic closing of the exchange.',
            'item_no_longer_available_msg' => 'The {type} "{item}" is no longer available.',
            'donation_confirmation_reminder_msg' => 'Your request for "{item}" has been accepted. If you\'ve picked it up, please confirm receipt.',
            'donation_confirmation_reminder_final_msg' => 'Final reminder: Please confirm receipt of "{item}" before tomorrow, otherwise the item will be automatically marked as received.',
            'donation_auto_completed_msg' => 'The item "{item}" has been automatically marked as received. You can still leave a review.',
            'donation_completed_msg' => 'Your item "{item}" has been successfully delivered. The recipient confirmed (or the deadline passed). Thank you for your generosity!',
            'acceptance_cancelled_msg' => 'The owner has cancelled the acceptance for "{item}". The item is available again, you can send a new request.',
            'request_reactivated_msg' => 'The item "{item}" is available again! Your request has been automatically reactivated.',
            
            // Email
            'view_exchange' => 'View Exchange',
            'view_review' => 'View Review',
            'confirm_receipt' => 'Confirm Receipt',
            'email_greeting' => 'Hi',
            'email_footer' => 'This email was sent by LetShare. If you did not expect this email, you can ignore it.'
        ]
    ];
}

/**
 * Get translated notification text
 */
function getNotifText($key, $lang = 'fr', $params = []) {
    $translations = getNotificationTranslations();
    $lang = in_array($lang, ['fr', 'en']) ? $lang : 'fr';
    
    $text = $translations[$lang][$key] ?? $translations['en'][$key] ?? $key;
    
    // Replace placeholders
    foreach ($params as $placeholder => $value) {
        $text = str_replace('{' . $placeholder . '}', $value, $text);
    }
    
    return $text;
}

/**
 * Get user language preference
 */
function getUserLanguage($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT language FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    return $user['language'] ?? 'fr';
}

/**
 * Create a notification in the database
 * @param PDO $pdo Database connection
 * @param int $userId User ID to notify
 * @param string $type Notification type (message, request, acceptance, etc.)
 * @param string $title Notification title
 * @param string $message Notification message
 * @param int|null $relatedItemId Related item ID (optional)
 * @param int|null $relatedConversationId Related conversation ID (optional)
 * @param int|null $relatedUserId Related user ID (optional)
 * @return int Notification ID
 */
function createNotification($pdo, $userId, $type, $title, $message = '', $relatedItemId = null, $relatedConversationId = null, $relatedUserId = null) {
    try {
        // Check user's notification preferences
        // Map notification types to preference keys
        $typeToPreference = [
            'message' => 'messages',
            'request' => 'requests',
            'acceptance' => 'accepted',
            'review' => 'reviews'
        ];
        
        $preferenceKey = $typeToPreference[$type] ?? null;
        
        if ($preferenceKey) {
            try {
                $prefStmt = $pdo->prepare("SELECT notification_preferences FROM users WHERE id = ?");
                $prefStmt->execute([$userId]);
                $prefRow = $prefStmt->fetch();
                
                if ($prefRow && $prefRow['notification_preferences']) {
                    $prefs = json_decode($prefRow['notification_preferences'], true);
                    if (is_array($prefs) && isset($prefs[$preferenceKey]) && $prefs[$preferenceKey] === false) {
                        // User has disabled this notification type — skip silently
                        return 0;
                    }
                }
            } catch (\Throwable $e) {
                // If preference check fails, continue creating the notification
            }
        }
        
        // Safely insert notification
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, related_item_id, related_conversation_id, related_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([$userId, $type, $title, $message, $relatedItemId, $relatedConversationId, $relatedUserId]);
        
        if (!$result) {
            return 0;
        }
        
        $notificationId = $pdo->lastInsertId();
        
        // Send push notification if user has subscribed
        try {
            if (function_exists('sendPushNotification')) {
                sendPushNotification($pdo, $userId, $title, $message, $relatedItemId, $relatedConversationId);
            }
        } catch (Throwable $e) {
            // Don't fail the notification creation if push fails
        }
        
        // Send email for important notification types (acceptance, review, confirmation reminders, auto-completed)
        if (in_array($type, ['acceptance', 'review', 'confirmation_reminder_5days', 'confirmation_reminder_10days', 'exchange_auto_completed'])) {
            try {
                // For reminder types, also get partner confirmation status
                $partnerConfirmedAt = null;
                if (in_array($type, ['confirmation_reminder_5days', 'confirmation_reminder_10days']) && $relatedConversationId) {
                    try {
                        $stmtPartner = $pdo->prepare("
                            SELECT owner_id, requester_id, owner_confirmed_at, requester_confirmed_at 
                            FROM conversations 
                            WHERE id = ?
                        ");
                        $stmtPartner->execute([$relatedConversationId]);
                        $convData = $stmtPartner->fetch();
                        if ($convData) {
                            // If current user is owner, check if requester confirmed
                            if ($convData['owner_id'] == $userId) {
                                $partnerConfirmedAt = $convData['requester_confirmed_at'];
                            } else {
                                $partnerConfirmedAt = $convData['owner_confirmed_at'];
                            }
                        }
                    } catch (Exception $e) {
                        // Continue without partner info
                    }
                }
                sendNotificationEmail($pdo, $userId, $type, $title, $message, $relatedItemId, $relatedConversationId, $partnerConfirmedAt);
            } catch (Exception $e) {
                // Don't fail if email fails
            }
        }
        
        return $notificationId;
    } catch (PDOException $e) {
        return 0;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Send email notification for important events
 */
function sendNotificationEmail($pdo, $userId, $type, $title, $message, $itemId = null, $conversationId = null, $partnerConfirmedAt = null) {
    // Get user email and language
    $stmt = $pdo->prepare("SELECT email, name, language FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user || empty($user['email'])) {
        return false;
    }
    
    $userName = $user['name'] ?? 'User';
    $userLang = $user['language'] ?? 'fr';
    $appUrl = $_ENV['APP_BASE_URL'] ?? 'https://letshare-app.fr';
    
    // Get item type if itemId is provided (for determining button text)
    $itemType = 'exchange'; // default
    if ($itemId) {
        try {
            $stmtItem = $pdo->prepare("SELECT type FROM items WHERE id = ?");
            $stmtItem->execute([$itemId]);
            $item = $stmtItem->fetch();
            if ($item && isset($item['type'])) {
                $itemType = $item['type'];
            }
        } catch (Exception $e) {
            // Default to exchange if query fails
        }
    }
    
    // Build email content based on type
    if ($type === 'acceptance') {
        $subject = '🎉 ' . $title;
        $ctaText = getNotifText('view_exchange', $userLang);
        $ctaUrl = $appUrl . '/index.html' . ($itemId ? '?item=' . $itemId : '');
    } else if ($type === 'review') {
        $subject = '⭐ ' . $title;
        $ctaText = getNotifText('view_review', $userLang);
        $ctaUrl = $appUrl . '/profile.html';
    } else if ($type === 'confirmation_reminder_5days' || $type === 'confirmation_reminder_10days') {
        $subject = $title;
        $ctaText = getNotifText('confirm_receipt', $userLang);
        $ctaUrl = $appUrl . '/index.html' . ($itemId ? '?item=' . $itemId : '');
        
        // Get accepted_at date from conversation to calculate days elapsed
        $daysElapsed = 5; // default
        if ($conversationId) {
            try {
                $stmtConv = $pdo->prepare("SELECT updated_at, owner_confirmed_at, requester_confirmed_at FROM conversations WHERE id = ?");
                $stmtConv->execute([$conversationId]);
                $conv = $stmtConv->fetch();
                // Use the earliest confirmation timestamp, or updated_at as fallback
                $referenceDate = $conv['owner_confirmed_at'] ?? $conv['requester_confirmed_at'] ?? $conv['updated_at'] ?? null;
                if ($referenceDate) {
                    $refDateTime = new DateTime($referenceDate);
                    $nowDateTime = new DateTime();
                    $daysElapsed = (int)$nowDateTime->diff($refDateTime)->days;
                }
            } catch (Exception $e) {
                // Use default days
            }
        }
        
        // Build dynamic message based on days and type
        $isLastChance = ($type === 'confirmation_reminder_10days');
        if ($userLang === 'fr') {
            if ($isLastChance) {
                $message = "Bonjour " . htmlspecialchars($userName) . ",\n\n" .
                           "Cela fait " . $daysElapsed . " jours que l'échange a été accepté. Votre partenaire a confirmé sa partie, mais nous attendons toujours votre confirmation.\n\n" .
                           "L'échange a-t-il eu lieu ? Comment ça s'est passé ?";
            } else {
                $message = "Bonjour " . htmlspecialchars($userName) . ",\n\n" .
                           "Cela fait " . $daysElapsed . " jours que l'échange a été accepté. Votre partenaire a confirmé sa partie.\n\n" .
                           "L'échange a-t-il eu lieu ? Comment ça s'est passé ? Merci de confirmer rapidement.";
            }
        } else {
            if ($isLastChance) {
                $message = "Hello " . htmlspecialchars($userName) . ",\n\n" .
                           "It has been " . $daysElapsed . " days since the exchange was accepted. Your partner has confirmed their side, but we are still waiting for your confirmation.\n\n" .
                           "Did the exchange happen? How did it go?";
            } else {
                $message = "Hello " . htmlspecialchars($userName) . ",\n\n" .
                           "It has been " . $daysElapsed . " days since the exchange was accepted. Your partner has confirmed their side.\n\n" .
                           "Did the exchange happen? How did it go? Please confirm soon.";
            }
        }
    } else {
        return false;
    }
    
    $greeting = getNotifText('email_greeting', $userLang);
    $footer = getNotifText('email_footer', $userLang);
    
    // Build specialized HTML for acceptance emails
    if ($type === 'acceptance') {
        $platformSubtitle = $userLang === 'fr' ? 'Plateforme de Partage Communautaire' : 'Community Sharing Platform';
        $celebrationTitle = $userLang === 'fr' ? 'Demande Acceptée !' : 'Request Accepted!';
        $nextStepsTitle = $userLang === 'fr' ? 'Prochaines étapes' : 'Next Steps';
        $connectTitle = $userLang === 'fr' ? 'Connectez-vous avec le propriétaire' : 'Connect with the Owner';
        $connectDesc = $userLang === 'fr' ? 'Ouvrez un chat privé avec le propriétaire pour discuter des détails.' : 'Open a private chat with the owner to discuss the details.';
        $scheduleTitle = $userLang === 'fr' ? 'Planifiez votre échange' : 'Schedule Your Exchange';
        $scheduleDesc = $userLang === 'fr' ? 'Trouvez ensemble le meilleur moment et lieu pour un échange sans risque.' : 'Find the best time and place together for a safe exchange.';
        $completeTitle = $userLang === 'fr' ? 'Confirmez la fin de l\'échange' : 'Confirm Exchange Completion';
        $completeDesc = $userLang === 'fr' ? 'Confirmez que tout s\'est bien passé et laissez un avis pour le propriétaire.' : 'Confirm everything went well and leave a review for the owner.';
        $tipsLabel = $userLang === 'fr' ? 'Conseil :' : 'Tip:';
        $tipsText = $userLang === 'fr' ? 'Les utilisateurs qui communiquent bien et respectent leurs engagements reçoivent les meilleures évaluations !' : 'Users who communicate well and honor their commitments receive the best ratings!';
        $footerText = $userLang === 'fr' ? 'Cet email a été envoyé par LetShare. Si vous n\'attendiez pas cet email, vous pouvez l\'ignorer.' : 'This email was sent by LetShare. If you did not expect this email, you can ignore it.';
        $helpCenter = $userLang === 'fr' ? 'centre d\'aide' : 'help center';
        
        // Adapt CTA button text based on item type
        if ($itemType === 'donation') {
            $ctaText = $userLang === 'fr' ? 'Voir le don' : 'View Donation';
        } else if ($itemType === 'loan') {
            $ctaText = $userLang === 'fr' ? 'Voir le prêt' : 'View Loan';
        } else {
            $ctaText = $userLang === 'fr' ? 'Voir l\'échange' : 'View Exchange';
        }
        
        $htmlBody = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f0f7ff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f7ff; padding: 30px 0;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                        <!-- Brand Header -->
                        <tr>
                            <td style="background: #10b981; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);">
                                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">✨ LetShare</h1>
                                <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px; font-weight: 600;">' . $platformSubtitle . '</p>
                            </td>
                        </tr>
                        
                        <!-- Celebration Section -->
                        <tr>
                            <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px;">
                                <div style="text-align: center; margin-bottom: 35px;">
                                    <p style="margin: 0; font-size: 48px; line-height: 1;">🎉</p>
                                    <h2 style="margin: 15px 0 0 0; color: #059669; font-size: 26px; font-weight: 700;">' . $celebrationTitle . '</h2>
                                </div>
                                
                                <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">Salut ' . htmlspecialchars($userName) . ',</p>
                                
                                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                    <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 600; line-height: 1.6;">' . htmlspecialchars($message) . '</p>
                                </div>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 35px;">
                                    <tr>
                                        <td align="center">
                                            <a href="' . htmlspecialchars($ctaUrl) . '" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 16px 45px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform=\'scale(1.05)\';" onmouseout="this.style.transform=\'scale(1)\';">' . htmlspecialchars($ctaText) . '</a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Next Steps -->
                                <div style="background: #f9fafb; border-radius: 12px; padding: 25px; margin-top: 35px;">
                                    <h3 style="margin: 0 0 20px; color: #111827; font-size: 16px;">' . $nextStepsTitle . '</h3>
                                    
                                    <div style="margin-bottom: 18px;">
                                        <div style="display: flex; align-items: flex-start;">
                                            <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; margin-right: 12px;">1</span>
                                            <div style="flex: 1;">
                                                <p style="margin: 0 0 5px; color: #111827; font-weight: 600;">' . $connectTitle . '</p>
                                                <p style="margin: 0; color: #6b7280; font-size: 14px;">' . $connectDesc . '</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style="margin-bottom: 18px;">
                                        <div style="display: flex; align-items: flex-start;">
                                            <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; margin-right: 12px;">2</span>
                                            <div style="flex: 1;">
                                                <p style="margin: 0 0 5px; color: #111827; font-weight: 600;">' . $scheduleTitle . '</p>
                                                <p style="margin: 0; color: #6b7280; font-size: 14px;">' . $scheduleDesc . '</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div style="display: flex; align-items: flex-start;">
                                            <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; margin-right: 12px;">3</span>
                                            <div style="flex: 1;">
                                                <p style="margin: 0 0 5px; color: #111827; font-weight: 600;">' . $completeTitle . '</p>
                                                <p style="margin: 0; color: #6b7280; font-size: 14px;">' . $completeDesc . '</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Tips -->
                                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 25px;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>💡 ' . $tipsLabel . '</strong> ' . $tipsText . '</p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f3f4f6; padding: 25px 30px; text-align: center; border-radius: 0;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                                    <strong>LetShare</strong> - ' . $footerText . '<br>
                                    ' . ($userLang === 'fr' ? 'Si vous avez des questions, consultez notre' : 'If you have any questions, check our') . ' <a href="' . htmlspecialchars($appUrl) . '" style="color: #10b981; text-decoration: none;">' . $helpCenter . '</a>.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>';
    } else if ($type === 'confirmation_reminder_5days' || $type === 'confirmation_reminder_10days') {
        // Confirmation reminder email template - DYNAMIC and conversational
        $platformSubtitle = $userLang === 'fr' ? 'Plateforme de Partage Communautaire' : 'Community Sharing Platform';
        $isLastChance = ($type === 'confirmation_reminder_10days');
        
        $headerColor = $isLastChance ? '#f59e0b' : '#10b981'; // Orange for day 10, Green for day 5
        $headerTitle = $isLastChance ? 
            ($userLang === 'fr' ? 'Besoin d\'une confirmation !' : 'Confirmation Needed!') :
            ($userLang === 'fr' ? 'Comment ça s\'est passé ?' : 'How did it go?');
        
        // Calculate days from conversation if needed
        if ($daysElapsed < 5) {
            $daysElapsed = $isLastChance ? 10 : 5;
        }
        
        $itemName = 'l\'article'; // default
        if ($itemId) {
            try {
                $stmtItem = $pdo->prepare("SELECT title FROM items WHERE id = ?");
                $stmtItem->execute([$itemId]);
                $item = $stmtItem->fetch();
                if ($item && $item['title']) {
                    $itemName = '"' . htmlspecialchars($item['title']) . '"';
                }
            } catch (Exception $e) {
                // Use default
            }
        }
        
        // Determine if this is a donation and build appropriate messages
        $isDonation = ($itemType === 'donation');
        $partnerHasConfirmed = !empty($partnerConfirmedAt);
        
        if ($userLang === 'fr') {
            if ($isDonation) {
                // DONATION MESSAGE
                $mainQuestion = "Avez-vous bien reçu le don ?";
                $partnerStatus = "Le donateur attend votre confirmation.";
                $weAreWaiting = "Merci de confirmer rapidement.";
                $twoWaysTitle = "✓ Deux façons de confirmer";
                $way1 = "Confirmer la réception";
                $way1Desc = "Ouvrez la conversation et cliquez sur le bouton de confirmation";
                $way2 = "Répondre à cet email";
                $way2Desc = "Répondez simplement en nous disant si vous avez reçu le don";
                $whyTitle = "Pourquoi cette confirmation ?";
                $whyText = "Cette confirmation nous aide à garantir que le don a bien été reçu et à construire la confiance dans notre communauté.";
                $autoCompleteNote = $isLastChance ? 
                    "Si vous ne confirmez pas dans les 3 jours, le don sera automatiquement marqué comme reçu." :
                    "Si vous ne confirmez pas, nous vous renverrons un dernier email dans 5 jours.";
                $hopeNote = "Merci d'avoir participé à notre plateforme de partage communautaire !";
            } elseif ($partnerHasConfirmed) {
                // EXCHANGE - PARTNER ALREADY CONFIRMED
                $mainQuestion = "Votre partenaire a confirmé sa partie !";
                $partnerStatus = "Il/elle a confirmé avoir reçu l'article.";
                $weAreWaiting = "Nous attendons maintenant votre confirmation.";
                $twoWaysTitle = "✓ Deux façons de confirmer";
                $way1 = "Confirmer dans la conversation";
                $way1Desc = "Ouvrez la conversation et cliquez sur le bouton \"Confirmer la réception\"";
                $way2 = "Répondre à cet email";
                $way2Desc = "Répondez simplement en nous disant comment l'échange s'est passé";
                $whyTitle = "Pourquoi cette confirmation ?";
                $whyText = "Nous vérifions que tous les échanges se déroulent correctement et que nos utilisateurs sont satisfaits. Votre confirmation nous aide à:";
                $autoCompleteNote = $isLastChance ? 
                    "Si vous ne confirmez pas dans les 3 jours, l'échange sera automatiquement marqué comme terminé." :
                    "Si vous ne confirmez pas, nous vous renverrons un dernier email dans 5 jours.";
                $hopeNote = "Nous espérons que tout s'est bien passé ! Merci de votre utilisation de LetShare.";
            } else {
                // EXCHANGE - NOBODY CONFIRMED YET
                $mainQuestion = "L'échange a eu lieu ? Comment ça s'est passé ?";
                $partnerStatus = "Votre partenaire attend aussi votre confirmation.";
                $weAreWaiting = "Merci de confirmer rapidement.";
                $twoWaysTitle = "✓ Deux façons de confirmer";
                $way1 = "Confirmer dans la conversation";
                $way1Desc = "Ouvrez la conversation et cliquez sur le bouton \"Confirmer la réception\"";
                $way2 = "Répondre à cet email";
                $way2Desc = "Répondez simplement en nous disant comment l'échange s'est passé";
                $whyTitle = "Pourquoi cette confirmation ?";
                $whyText = "Nous vérifions que tous les échanges se déroulent correctement et que nos utilisateurs sont satisfaits. Votre confirmation nous aide à:";
                $autoCompleteNote = $isLastChance ? 
                    "Si vous ne confirmez pas dans les 3 jours, l'échange sera automatiquement marqué comme terminé." :
                    "Si vous ne confirmez pas, nous vous renverrons un dernier email dans 5 jours.";
                $hopeNote = "Nous espérons que tout s'est bien passé ! Merci de votre utilisation de LetShare.";
            }
        } else {
            if ($isDonation) {
                // DONATION MESSAGE
                $mainQuestion = "Did you receive the donation?";
                $partnerStatus = "The donor is waiting for your confirmation.";
                $weAreWaiting = "Please confirm quickly.";
                $twoWaysTitle = "✓ Two ways to confirm";
                $way1 = "Confirm receipt";
                $way1Desc = "Open the conversation and click the confirmation button";
                $way2 = "Reply to this email";
                $way2Desc = "Simply reply letting us know if you received the donation";
                $whyTitle = "Why this confirmation?";
                $whyText = "This confirmation helps us ensure the donation was received and builds trust in our community.";
                $autoCompleteNote = $isLastChance ? 
                    "If you don't confirm within 3 days, the donation will be automatically marked as received." :
                    "If you don't confirm, we'll send you one more email in 5 days.";
                $hopeNote = "Thank you for participating in our community sharing platform!";
            } elseif ($partnerHasConfirmed) {
                // EXCHANGE - PARTNER ALREADY CONFIRMED
                $mainQuestion = "Your partner has confirmed their side!";
                $partnerStatus = "They have confirmed receiving the item.";
                $weAreWaiting = "We are now waiting for your confirmation.";
                $twoWaysTitle = "✓ Two ways to confirm";
                $way1 = "Confirm in the conversation";
                $way1Desc = "Open the conversation and click the \"Confirm Receipt\" button";
                $way2 = "Reply to this email";
                $way2Desc = "Simply reply letting us know how the exchange went";
                $whyTitle = "Why this confirmation?";
                $whyText = "We verify that all exchanges go smoothly and that our users are satisfied. Your confirmation helps us to:";
                $autoCompleteNote = $isLastChance ? 
                    "If you don't confirm within 3 days, the exchange will be automatically marked as completed." :
                    "If you don't confirm, we'll send you one more email in 5 days.";
                $hopeNote = "We hope everything went smoothly! Thank you for using LetShare.";
            } else {
                // EXCHANGE - NOBODY CONFIRMED YET
                $mainQuestion = "Did the exchange happen? How did it go?";
                $partnerStatus = "Your partner is also waiting for your confirmation.";
                $weAreWaiting = "Please confirm quickly.";
                $twoWaysTitle = "✓ Two ways to confirm";
                $way1 = "Confirm in the conversation";
                $way1Desc = "Open the conversation and click the \"Confirm Receipt\" button";
                $way2 = "Reply to this email";
                $way2Desc = "Simply reply letting us know how the exchange went";
                $whyTitle = "Why this confirmation?";
                $whyText = "We verify that all exchanges go smoothly and that our users are satisfied. Your confirmation helps us to:";
                $autoCompleteNote = $isLastChance ? 
                    "If you don't confirm within 3 days, the exchange will be automatically marked as completed." :
                    "If you don't confirm, we'll send you one more email in 5 days.";
                $hopeNote = "We hope everything went smoothly! Thank you for using LetShare.";
            }
        }
        
        // Build why list
        $whyList = '';
        if ($isDonation) {
            // For donations, simpler list
            $why_items = $userLang === 'fr' ? 
                ["Confirmer que le don a bien été reçu", "Remercier le donateur", "Vérifier la satisfaction"] :
                ["Confirm the donation was received", "Thank the donor", "Verify satisfaction"];
        } else {
            // For exchanges, detailed list
            $why_items = $userLang === 'fr' ? 
                ["Garantir que les articles arrivent bien", "Protéger les deux parties de l'échange", "Maintenir la confiance dans notre communauté"] :
                ["Ensure items arrive safely", "Protect both parties in the exchange", "Maintain trust in our community"];
        }
        
        foreach ($why_items as $item) {
            $whyList .= '<li style="margin-bottom: 6px;">' . $item . '</li>';
        }
        
        $htmlBody = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 30px 0;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: ' . $headerColor . '; padding: 40px 30px; text-align: center; color: #ffffff;">
                                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700;">' . $headerTitle . '</h1>
                                <p style="margin: 0; font-size: 16px; opacity: 0.95;">Ça fait ' . $daysElapsed . ' jours...</p>
                            </td>
                        </tr>
                        
                        <!-- Main Question -->
                        <tr>
                            <td style="padding: 30px 30px 20px; border-bottom: 2px solid #f0f0f0;">
                                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937; text-align: center; line-height: 1.5;">' . $mainQuestion . '</p>
                            </td>
                        </tr>
                        
                        <!-- Status Info -->
                        <tr>
                            <td style="padding: 20px 30px;">
                                <div style="background: ' . ($isDonation || !$partnerHasConfirmed ? '#fef3c7' : '#f0fdf4') . '; border-left: 4px solid ' . ($isDonation || !$partnerHasConfirmed ? '#f59e0b' : '#10b981') . '; padding: 15px; border-radius: 4px;">
                                    <p style="margin: 0; color: ' . ($isDonation || !$partnerHasConfirmed ? '#92400e' : '#166534') . '; font-size: 14px;"><strong>' . ($isDonation || !$partnerHasConfirmed ? '⏳' : '✓') . ' ' . $partnerStatus . '</strong></p>
                                </div>
                                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 10px;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏳ ' . $weAreWaiting . '</strong></p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Two Ways to Confirm -->
                        <tr>
                            <td style="padding: 30px 30px; border-bottom: 1px solid #e5e7eb;">
                                <h2 style="margin: 0 0 20px; font-size: 16px; font-weight: 700; color: #1f2937;">' . $twoWaysTitle . '</h2>
                                
                                <!-- Method 1 -->
                                <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                                    <h3 style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1f2937;">1️⃣ ' . $way1 . '</h3>
                                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">' . $way1Desc . '</p>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                                        <tr>
                                            <td align="center">
                                                <a href="' . htmlspecialchars($ctaUrl) . '" style="display: inline-block; background-color: ' . $headerColor . '; color: #ffffff; text-decoration: none; padding: 10px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">' . htmlspecialchars($ctaText) . '</a>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- Method 2 -->
                                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px;">
                                    <h3 style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1f2937;">2️⃣ ' . $way2 . '</h3>
                                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">' . $way2Desc . '</p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Why This Matters -->
                        <tr>
                            <td style="padding: 30px 30px; background: #f0f7ff; border: 1px solid #dbeafe;">
                                <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1e40af;">💡 ' . $whyTitle . '</h3>
                                <p style="margin: 0 0 12px; color: #1f2937; font-size: 13px; line-height: 1.5;">' . $whyText . '</p>
                                <ul style="margin: 0; padding-left: 20px; color: #1f2937; font-size: 13px;">
                                    ' . $whyList . '
                                </ul>
                            </td>
                        </tr>
                        
                        <!-- Note -->
                        <tr>
                            <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">' . $autoCompleteNote . '</p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                                <p style="margin: 0 0 10px; color: #666; font-size: 13px;">' . $hopeNote . '</p>
                                <p style="margin: 0; color: #999; font-size: 11px;"><strong>LetShare</strong> - ' . htmlspecialchars($footer) . '</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>';
    } else if ($type === 'exchange_auto_completed') {
        // Auto-completed exchange email - Simple and friendly
        $subject = '✓ ' . $title;
        $ctaText = $userLang === 'fr' ? 'Laisser un avis' : 'Leave a Review';
        $ctaUrl = $appUrl . '/profile.html#history';
        
        if ($userLang === 'fr') {
            $heading = 'Échange terminé !';
            $mainText = 'Bonjour ' . htmlspecialchars($userName) . ',';
            $contentText = htmlspecialchars($message);
            $nextText = 'Vous pouvez maintenant:';
            $step1 = 'Consulter les détails dans votre historique';
            $step2 = 'Laisser un avis sur votre partenaire';
            $step3 = 'Continuer à découvrir de nouveaux échanges';
            $closingText = 'Merci d\'utiliser LetShare et bonne chance pour vos prochains échanges !';
        } else {
            $heading = 'Exchange Completed!';
            $mainText = 'Hi ' . htmlspecialchars($userName) . ',';
            $contentText = htmlspecialchars($message);
            $nextText = 'You can now:';
            $step1 = 'View the details in your history';
            $step2 = 'Leave a review of your partner';
            $step3 = 'Continue discovering new exchanges';
            $closingText = 'Thank you for using LetShare and good luck with your future exchanges!';
        }
        
        $htmlBody = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 30px 0;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
                                <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: 700;">✓</h1>
                                <h2 style="margin: 0; font-size: 24px; font-weight: 700;">' . $heading . '</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 35px 30px;">
                                <p style="margin: 0 0 15px; color: #1f2937; font-size: 16px; font-weight: 600;">' . $mainText . '</p>
                                <p style="margin: 0 0 20px; color: #6b7280; font-size: 15px; line-height: 1.6;">' . $contentText . '</p>
                                
                                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                    <p style="margin: 0; color: #166534; font-size: 14px;"><strong>💚 ' . $nextText . '</strong></p>
                                </div>
                                
                                <ul style="margin: 20px 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
                                    <li style="margin-bottom: 8px;">' . $step1 . '</li>
                                    <li style="margin-bottom: 8px;"><strong>' . $step2 . '</strong></li>
                                    <li>' . $step3 . '</li>
                                </ul>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 25px;">
                                    <tr>
                                        <td align="center">
                                            <a href="' . htmlspecialchars($ctaUrl) . '" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 35px; border-radius: 8px; font-weight: 600; font-size: 15px;">' . htmlspecialchars($ctaText) . '</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-align: center;">' . $closingText . '</p>
                                <p style="margin: 0; color: #999; font-size: 11px; text-align: center;"><strong>LetShare</strong> - ' . htmlspecialchars($footer) . '</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>';
    }
    
    return !empty($htmlBody) ? sendLetshareEmail($user['email'], $subject, $htmlBody) : false;
}

/**
 * Send push notification to user's devices
 * @param PDO $pdo Database connection
 * @param int $userId User ID
 * @param string $title Notification title
 * @param string $message Notification message
 * @param int|null $itemId Related item ID
 * @param int|null $conversationId Related conversation ID
 */
function sendPushNotification($pdo, $userId, $title, $message, $itemId = null, $conversationId = null) {
    // Log function call
    $logFile = '/home/www/letshare-debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] sendPushNotification() called for user: $userId\n", FILE_APPEND);
    
    try {
        // Get user's push subscriptions
        $stmt = $pdo->prepare("
            SELECT endpoint, p256dh, auth 
            FROM push_subscriptions 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $subscriptions = $stmt->fetchAll();
        
        file_put_contents($logFile, "[$timestamp] Found " . count($subscriptions) . " push subscriptions for user $userId\n", FILE_APPEND);
        
        if (empty($subscriptions)) {
            file_put_contents($logFile, "[$timestamp] No push subscriptions found, returning\n", FILE_APPEND);
            return;
        }
        
        // Build notification URL
        $url = '/index.html';
        if ($itemId) {
            $url .= '?item=' . $itemId;
        } else if ($conversationId) {
            $url .= '?conversation=' . $conversationId;
        }
        
        // Include push sender helper
        require_once __DIR__ . '/push/push_sender.php';
        
        // Build notification data
        // Note: URL is relative, Service Worker will use current origin (works with ngrok)
        $notificationData = [
            'url' => $url,
            'itemId' => $itemId,
            'conversationId' => $conversationId
        ];
        
        file_put_contents($logFile, "[$timestamp] Sending push to " . count($subscriptions) . " subscriptions\n", FILE_APPEND);
        
        // Send to each subscription
        foreach ($subscriptions as $subscription) {
            try {
                file_put_contents($logFile, "[$timestamp] Sending push to endpoint: " . substr($subscription['endpoint'], 0, 50) . "...\n", FILE_APPEND);
                
                $result = sendPushToSubscription($subscription, $title, $message, $notificationData);
                
                file_put_contents($logFile, "[$timestamp] Push send result: " . ($result['success'] ? 'SUCCESS' : 'FAILED') . "\n", FILE_APPEND);
                
                if (!$result['success']) {
                    file_put_contents($logFile, "[$timestamp] Push failed, message: " . ($result['message'] ?? 'unknown') . "\n", FILE_APPEND);
                    
                    // If subscription is invalid, remove it
                    $isExpired = !empty($result['expired']) || 
                                 strpos($result['message'] ?? '', '410') !== false || 
                                 strpos($result['message'] ?? '', 'Gone') !== false ||
                                 strpos($result['message'] ?? '', '404') !== false ||
                                 strpos($result['message'] ?? '', 'Not Found') !== false;
                    
                    if ($isExpired) {
                        file_put_contents($logFile, "[$timestamp] Subscription expired, deleting\n", FILE_APPEND);
                        $deleteStmt = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
                        $deleteStmt->execute([$subscription['endpoint']]);
                    }
                }
            } catch (Exception $e) {
                file_put_contents($logFile, "[$timestamp] Exception in push send: " . $e->getMessage() . "\n", FILE_APPEND);
            }
        }
        
        file_put_contents($logFile, "[$timestamp] Push sending complete\n", FILE_APPEND);
        
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] sendPushNotification() exception: " . $e->getMessage() . "\n", FILE_APPEND);
    }
}

/**
 * Send email to requester when owner cancels acceptance
 */
function sendCancelAcceptanceEmail($pdo, $userId, $itemTitle, $itemId = null) {
    try {
        $stmt = $pdo->prepare("SELECT email, name, language FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || empty($user['email'])) {
            return false;
        }
        
        $userName = $user['name'] ?? 'User';
        $userLang = $user['language'] ?? 'fr';
        $appUrl = $_ENV['APP_BASE_URL'] ?? 'https://letshare-app.fr';
        
        if ($userLang === 'fr') {
            $subject = 'Échange annulé — ' . $itemTitle;
            $greeting = 'Bonjour ' . htmlspecialchars($userName) . ',';
            $bodyText = 'Le propriétaire a annulé l\'acceptation pour <strong>"' . htmlspecialchars($itemTitle) . '"</strong>.<br><br>' .
                        'L\'article est de nouveau disponible sur la plateforme. Vous pouvez renvoyer une demande si vous êtes toujours intéressé(e).';
            $tipText = '<strong>Conseil :</strong> Après l\'acceptation d\'une demande, pensez à répondre rapidement aux messages pour organiser l\'échange. Un demandeur réactif a plus de chances de finaliser l\'échange avec succès !';
            $ctaText = 'Voir l\'article';
            $footerText = 'Cet email a été envoyé par LetShare. Si vous ne l\'attendiez pas, vous pouvez l\'ignorer.';
        } else {
            $subject = 'Exchange cancelled — ' . $itemTitle;
            $greeting = 'Hi ' . htmlspecialchars($userName) . ',';
            $bodyText = 'The owner has cancelled the acceptance for <strong>"' . htmlspecialchars($itemTitle) . '"</strong>.<br><br>' .
                        'The item is available again on the platform. You can send a new request if you are still interested.';
            $tipText = '<strong>Tip:</strong> After a request is accepted, make sure to reply quickly to messages to arrange the exchange. A responsive requester is more likely to successfully complete the exchange!';
            $ctaText = 'View Item';
            $footerText = 'This email was sent by LetShare. If you did not expect this email, you can ignore it.';
        }
        
        $ctaUrl = $appUrl . '/index.html' . ($itemId ? '?item=' . $itemId : '');
        
        $htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' .
            '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;background:#f0f7ff;">' .
            '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;padding:30px 0;"><tr><td align="center">' .
            '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">' .
            '<tr><td style="background:#f59e0b;padding:30px;text-align:center;border-radius:16px 16px 0 0;">' .
                '<h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">LetShare</h1>' .
            '</td></tr>' .
            '<tr><td style="background:#fff;padding:30px;border-radius:0 0 16px 16px;">' .
                '<p style="color:#374151;font-size:1rem;margin:0 0 1rem;">' . $greeting . '</p>' .
                '<p style="color:#374151;font-size:0.9375rem;line-height:1.6;margin:0 0 1.5rem;">' . $bodyText . '</p>' .
                '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:0 0 1.5rem;">' .
                    '<p style="color:#92400e;font-size:0.8125rem;line-height:1.5;margin:0;">' . $tipText . '</p>' .
                '</div>' .
                '<div style="text-align:center;margin:1.5rem 0;">' .
                    '<a href="' . $ctaUrl . '" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9375rem;">' . $ctaText . '</a>' .
                '</div>' .
                '<p style="color:#9ca3af;font-size:0.75rem;text-align:center;margin:1.5rem 0 0;">' . $footerText . '</p>' .
            '</td></tr>' .
            '</table></td></tr></table></body></html>';
        
        return sendLetshareEmail($user['email'], $subject, $htmlBody);
    } catch (\Throwable $e) {
        return false;
    }
}

/**
 * Send email to requesters whose requests have been reactivated after a cancel acceptance
 */
function sendReactivationEmail($pdo, $userId, $itemTitle, $itemId = null) {
    try {
        $stmt = $pdo->prepare("SELECT email, name, language FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || empty($user['email'])) {
            return false;
        }
        
        $userName = $user['name'] ?? 'User';
        $userLang = $user['language'] ?? 'fr';
        $appUrl = $_ENV['APP_BASE_URL'] ?? 'https://letshare-app.fr';
        
        if ($userLang === 'fr') {
            $subject = 'Bonne nouvelle — ' . $itemTitle . ' est de nouveau disponible !';
            $greeting = 'Bonjour ' . htmlspecialchars($userName) . ',';
            $bodyText = 'L\'article <strong>"' . htmlspecialchars($itemTitle) . '"</strong> est de nouveau disponible !<br><br>' .
                        'Votre demande a été <strong>automatiquement réactivée</strong>. Le propriétaire peut maintenant la consulter et y répondre.';
            $tipText = '<strong>Conseil :</strong> Après l\'acceptation d\'une demande, pensez à répondre rapidement aux messages pour organiser l\'échange. Un demandeur réactif a plus de chances de finaliser l\'échange avec succès !';
            $ctaText = 'Voir l\'article';
            $footerText = 'Cet email a été envoyé par LetShare. Si vous ne l\'attendiez pas, vous pouvez l\'ignorer.';
        } else {
            $subject = 'Good news — ' . $itemTitle . ' is available again!';
            $greeting = 'Hi ' . htmlspecialchars($userName) . ',';
            $bodyText = 'The item <strong>"' . htmlspecialchars($itemTitle) . '"</strong> is available again!<br><br>' .
                        'Your request has been <strong>automatically reactivated</strong>. The owner can now review it and respond.';
            $tipText = '<strong>Tip:</strong> After a request is accepted, make sure to reply quickly to messages to arrange the exchange. A responsive requester is more likely to successfully complete the exchange!';
            $ctaText = 'View Item';
            $footerText = 'This email was sent by LetShare. If you did not expect this email, you can ignore it.';
        }
        
        $ctaUrl = $appUrl . '/index.html' . ($itemId ? '?item=' . $itemId : '');
        
        $htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' .
            '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;background:#f0f7ff;">' .
            '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;padding:30px 0;"><tr><td align="center">' .
            '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">' .
            '<tr><td style="background:#10b981;padding:30px;text-align:center;border-radius:16px 16px 0 0;">' .
                '<h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">LetShare</h1>' .
            '</td></tr>' .
            '<tr><td style="background:#fff;padding:30px;border-radius:0 0 16px 16px;">' .
                '<p style="color:#374151;font-size:1rem;margin:0 0 1rem;">' . $greeting . '</p>' .
                '<p style="color:#374151;font-size:0.9375rem;line-height:1.6;margin:0 0 1.5rem;">' . $bodyText . '</p>' .
                '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:0 0 1.5rem;">' .
                    '<p style="color:#92400e;font-size:0.8125rem;line-height:1.5;margin:0;">' . $tipText . '</p>' .
                '</div>' .
                '<div style="text-align:center;margin:1.5rem 0;">' .
                    '<a href="' . $ctaUrl . '" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9375rem;">' . $ctaText . '</a>' .
                '</div>' .
                '<p style="color:#9ca3af;font-size:0.75rem;text-align:center;margin:1.5rem 0 0;">' . $footerText . '</p>' .
            '</td></tr>' .
            '</table></td></tr></table></body></html>';
        
        return sendLetshareEmail($user['email'], $subject, $htmlBody);
    } catch (\Throwable $e) {
        return false;
    }
}
