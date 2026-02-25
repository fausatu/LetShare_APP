/**
 * Pusher Real-time Chat Integration
 * Handles real-time message delivery for conversations
 */

// Pusher configuration - loaded from server
var PUSHER_KEY = null;
var PUSHER_CLUSTER = null;
var pusherConfigLoaded = false;

// Pusher instance
var pusher = null;
var currentChannel = null;
var currentSubscribedConversationId = null;

/**
 * Load Pusher config from server
 */
async function loadPusherConfig() {
    if (pusherConfigLoaded) {
        return true;
    }
    
    try {
        var response = await fetch('/api/pusher_public_config.php');
        if (!response.ok) {
            throw new Error('Failed to load Pusher config');
        }
        var config = await response.json();
        PUSHER_KEY = config.key;
        PUSHER_CLUSTER = config.cluster;
        pusherConfigLoaded = true;
        return true;
    } catch (e) {
        console.error('Failed to load Pusher config:', e);
        return false;
    }
}

/**
 * Initialize Pusher
 */
async function initPusher() {
    if (typeof Pusher === 'undefined') {
        console.warn('Pusher SDK not loaded');
        return false;
    }
    
    if (pusher) {
        return true; // Already initialized
    }
    
    // Load config from server if not already loaded
    if (!pusherConfigLoaded) {
        var loaded = await loadPusherConfig();
        if (!loaded) {
            console.warn('Could not load Pusher config');
            return false;
        }
    }
    
    try {
        pusher = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
            encrypted: true
        });
        
        pusher.connection.bind('connected', function() {
            console.log('Pusher connected');
        });
        
        pusher.connection.bind('error', function(err) {
            console.error('Pusher connection error:', err);
        });
        
        return true;
    } catch (e) {
        console.error('Failed to initialize Pusher:', e);
        return false;
    }
}

/**
 * Subscribe to a conversation channel for real-time messages
 * @param {number} conversationId - Database conversation ID
 * @param {function} onMessage - Callback when new message received
 * @param {function} onTyping - Callback when typing indicator received
 * @param {function} onStatusUpdate - Callback when status changes
 */
async function subscribeToConversation(conversationId, onMessage, onTyping, onStatusUpdate) {
    var initialized = await initPusher();
    if (!initialized) {
        console.warn('Pusher not available, falling back to polling');
        return false;
    }
    
    // Unsubscribe from previous conversation if any
    unsubscribeFromConversation();
    
    var channelName = 'conversation-' + conversationId;
    
    try {
        currentChannel = pusher.subscribe(channelName);
        currentSubscribedConversationId = conversationId;
        
        // Listen for new messages
        currentChannel.bind('new-message', function(data) {
            console.log('Real-time message received:', data);
            if (typeof onMessage === 'function') {
                onMessage(data);
            }
        });
        
        // Listen for typing indicators
        if (typeof onTyping === 'function') {
            currentChannel.bind('typing', function(data) {
                onTyping(data);
            });
        }
        
        // Listen for status updates (accept, reject, complete)
        if (typeof onStatusUpdate === 'function') {
            currentChannel.bind('status-update', function(data) {
                console.log('Status update received:', data);
                onStatusUpdate(data);
            });
        }
        
        console.log('Subscribed to channel:', channelName);
        return true;
    } catch (e) {
        console.error('Failed to subscribe to conversation:', e);
        return false;
    }
}

/**
 * Unsubscribe from current conversation channel
 */
function unsubscribeFromConversation() {
    if (currentChannel && currentSubscribedConversationId) {
        var channelName = 'conversation-' + currentSubscribedConversationId;
        try {
            pusher.unsubscribe(channelName);
            console.log('Unsubscribed from channel:', channelName);
        } catch (e) {
            console.error('Error unsubscribing:', e);
        }
        currentChannel = null;
        currentSubscribedConversationId = null;
    }
}

/**
 * Check if Pusher is connected
 */
function isPusherConnected() {
    return pusher && pusher.connection.state === 'connected';
}

/**
 * Get current subscribed conversation ID
 */
function getCurrentSubscribedConversation() {
    return currentSubscribedConversationId;
}
