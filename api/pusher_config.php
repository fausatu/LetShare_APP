<?php
/**
 * Pusher Configuration for Real-time Chat
 * Uses environment variables for sensitive credentials
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/config.php';

// Pusher configuration from environment variables
define('PUSHER_APP_ID', $_ENV['PUSHER_APP_ID'] ?? '');
define('PUSHER_KEY', $_ENV['PUSHER_KEY'] ?? '');
define('PUSHER_SECRET', $_ENV['PUSHER_SECRET'] ?? '');
define('PUSHER_CLUSTER', $_ENV['PUSHER_CLUSTER'] ?? 'eu');

/**
 * Get Pusher instance
 */
function getPusher() {
    if (empty(PUSHER_KEY) || empty(PUSHER_SECRET) || empty(PUSHER_APP_ID)) {
        throw new Exception('Pusher not configured');
    }
    
    $options = [
        'cluster' => PUSHER_CLUSTER,
        'useTLS' => true
    ];
    
    return new Pusher\Pusher(
        PUSHER_KEY,
        PUSHER_SECRET,
        PUSHER_APP_ID,
        $options
    );
}

/**
 * Trigger a message event on a conversation channel
 */
function triggerNewMessage($conversationId, $messageData) {
    try {
        $pusher = getPusher();
        $pusher->trigger(
            'conversation-' . $conversationId,
            'new-message',
            $messageData
        );
        return true;
    } catch (Exception $e) {
        // Don't fail message sending if Pusher fails
        return false;
    }
}

/**
 * Trigger typing indicator
 */
function triggerTyping($conversationId, $userId, $userName) {
    try {
        $pusher = getPusher();
        $pusher->trigger(
            'conversation-' . $conversationId,
            'typing',
            [
                'userId' => $userId,
                'userName' => $userName
            ]
        );
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Trigger messages-read event so the sender can update read receipts in real-time
 */
function triggerMessagesRead($conversationId, $readByUserId) {
    try {
        $pusher = getPusher();
        $pusher->trigger(
            'conversation-' . $conversationId,
            'messages-read',
            [
                'readByUserId' => (int)$readByUserId,
                'readAt' => date('Y-m-d H:i:s')
            ]
        );
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Trigger conversation status update (accepted, rejected, etc.)
 */
function triggerStatusUpdate($conversationId, $status, $data = []) {
    try {
        $pusher = getPusher();
        $pusher->trigger(
            'conversation-' . $conversationId,
            'status-update',
            array_merge(['status' => $status], $data)
        );
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Trigger reaction update on a message
 */
function triggerReactionUpdate($conversationId, $reactionData) {
    try {
        $pusher = getPusher();
        $pusher->trigger(
            'conversation-' . $conversationId,
            'reaction-update',
            $reactionData
        );
        return true;
    } catch (Exception $e) {
        return false;
    }
}
