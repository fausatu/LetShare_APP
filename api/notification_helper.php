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
            'item_no_longer_available' => 'Article non disponible',
            
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
            'item_no_longer_available_msg' => 'Le {type} « {item} » n\'est plus disponible.',
            
            // Email
            'view_exchange' => 'Voir l\'échange',
            'view_review' => 'Voir l\'avis',
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
            'item_no_longer_available' => 'Item No Longer Available',
            
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
            'item_no_longer_available_msg' => 'The {type} "{item}" is no longer available.',
            
            // Email
            'view_exchange' => 'View Exchange',
            'view_review' => 'View Review',
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
            sendPushNotification($pdo, $userId, $title, $message, $relatedItemId, $relatedConversationId);
        } catch (Exception $e) {
            // Don't fail the notification creation if push fails
        }
        
        // Send email for important notification types (acceptance, review)
        if (in_array($type, ['acceptance', 'review'])) {
            try {
                sendNotificationEmail($pdo, $userId, $type, $title, $message, $relatedItemId);
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
function sendNotificationEmail($pdo, $userId, $type, $title, $message, $itemId = null) {
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
    
    // Build email content based on type
    if ($type === 'acceptance') {
        $subject = '🎉 ' . $title;
        $ctaText = getNotifText('view_exchange', $userLang);
        $ctaUrl = $appUrl . '/index.html' . ($itemId ? '?item=' . $itemId : '');
    } else if ($type === 'review') {
        $subject = '⭐ ' . $title;
        $ctaText = getNotifText('view_review', $userLang);
        $ctaUrl = $appUrl . '/profile.html';
    } else {
        return false;
    }
    
    $greeting = getNotifText('email_greeting', $userLang);
    $footer = getNotifText('email_footer', $userLang);
    
    $htmlBody = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px;">LetShare</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="margin: 0 0 20px; color: #333; font-size: 16px;">' . htmlspecialchars($greeting) . ' ' . htmlspecialchars($userName) . ',</p>
                                <p style="margin: 0 0 30px; color: #333; font-size: 16px;">' . htmlspecialchars($message) . '</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="' . htmlspecialchars($ctaUrl) . '" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">' . htmlspecialchars($ctaText) . '</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                                <p style="margin: 0; color: #999; font-size: 12px;">' . htmlspecialchars($footer) . '</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>';
    
    return sendLetshareEmail($user['email'], $subject, $htmlBody);
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
    try {
        // Get user's push subscriptions
        $stmt = $pdo->prepare("
            SELECT endpoint, p256dh, auth 
            FROM push_subscriptions 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $subscriptions = $stmt->fetchAll();
        
        if (empty($subscriptions)) {
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
        
        // Send to each subscription
        foreach ($subscriptions as $subscription) {
            try {
                $result = sendPushToSubscription($subscription, $title, $message, $notificationData);
                
                if (!$result['success']) {
                    // If subscription is invalid, remove it
                    $isExpired = !empty($result['expired']) || 
                                 strpos($result['message'] ?? '', '410') !== false || 
                                 strpos($result['message'] ?? '', 'Gone') !== false ||
                                 strpos($result['message'] ?? '', '404') !== false ||
                                 strpos($result['message'] ?? '', 'Not Found') !== false;
                    
                    if ($isExpired) {
                        $deleteStmt = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
                        $deleteStmt->execute([$subscription['endpoint']]);
                    }
                }
            } catch (Exception $e) {
                // Continue with next subscription
            }
        }
        
    } catch (Exception $e) {
        // Don't throw - we don't want to fail notification creation if push fails
    }
}


