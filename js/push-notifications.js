// Push Notifications Manager
// Handles browser push notifications registration and management

// Determine API base URL (same logic as api.js)
var API_BASE_URL_PUSH = (function() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && (port === '5500' || port === '3000' || port === '8080')) {
        return 'http://localhost/XHANGE_APP/api';
    }
    
    if (hostname.match(/^192\.168\.\d+\.\d+$/)) {
        return 'http://' + hostname + '/XHANGE_APP/api';
    }
    
    if (hostname.includes('ngrok') || hostname.includes('loca.lt') || hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io')) {
        return protocol + '//' + hostname + (port ? ':' + port : '') + '/XHANGE_APP/api';
    }
    
    // Render.com detection
    if (hostname.includes('onrender.com')) {
        return protocol + '//' + hostname + (port ? ':' + port : '') + '/api';
    }
    
    return 'api';
})();

var pushNotificationsManager = {
    registration: null,
    subscription: null,
    
    // Initialize push notifications
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications are not supported in this browser');
            return false;
        }
        
        try {
            // Register service worker - determine path based on current location
            // For ngrok, we need to include the full path with "XHANGE_APP"
            let swPath = '/sw.js';
            const hostname = window.location.hostname;
            const pathname = window.location.pathname;
            
            // If accessing via ngrok or if pathname includes "XHANGE_APP", adjust path
            if (hostname.includes('ngrok') || hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io')) {
                // Check if we're in a subdirectory
                if (pathname.includes('XHANGE')) {
                    // Extract the base path (everything before the filename)
                    const basePath = pathname.substring(0, pathname.lastIndexOf('/'));
                    swPath = basePath + '/sw.js';
                } else {
                    // Root level, but might need the folder name
                    swPath = '/XHANGE_APP/sw.js';
                }
            } else if (hostname.includes('onrender.com')) {
                // Render.com: Service Worker should be at root
                swPath = '/sw.js';
            } else if (pathname.includes('XHANGE')) {
                // Localhost with folder path
                const basePath = pathname.substring(0, pathname.lastIndexOf('/'));
                swPath = basePath + '/sw.js';
            }
            
            console.log('Registering Service Worker at:', swPath);
            this.registration = await navigator.serviceWorker.register(swPath, {
                scope: pathname.substring(0, pathname.lastIndexOf('/') + 1) || '/' // Use current directory as scope
            });
            console.log('Service Worker registered:', this.registration);
            
            // Check if already subscribed
            this.subscription = await this.registration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('Already subscribed to push notifications');
                // Update subscription on server
                await this.updateSubscriptionOnServer(this.subscription);
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing push notifications:', error);
            return false;
        }
    },
    
    // Request permission and subscribe
    async requestPermission() {
        if (!this.registration) {
            var initialized = await this.init();
            if (!initialized) {
                throw new Error('Service Worker not available');
            }
        }
        
        // Request notification permission
        var permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            throw new Error('Notification permission denied');
        }
        
            // Subscribe to push notifications
            try {
                // Get VAPID public key from server (you'll need to generate this)
                const vapidPublicKey = await this.getVapidPublicKey();
                
                if (!vapidPublicKey) {
                    throw new Error('VAPID public key not available');
                }
                
                this.subscription = await this.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
                });
                
                console.log('Subscribed to push notifications:', this.subscription);
                
                // Send subscription to server - this will throw if user is not authenticated
                try {
                    await this.updateSubscriptionOnServer(this.subscription);
                } catch (serverError) {
                    // If subscription save failed, unsubscribe from push manager to keep things clean
                    try {
                        await this.subscription.unsubscribe();
                        this.subscription = null;
                    } catch (unsubError) {
                        console.warn('Failed to unsubscribe after server error:', unsubError);
                    }
                    // Re-throw the error so caller can handle it
                    throw serverError;
                }
                
                return true;
            } catch (error) {
                console.error('Error subscribing to push notifications:', error);
                throw error;
            }
    },
    
    // Unsubscribe from push notifications
    async unsubscribe() {
        if (this.subscription) {
            try {
                await this.subscription.unsubscribe();
                this.subscription = null;
                
                // Remove subscription from server
                await this.removeSubscriptionFromServer();
                
                return true;
            } catch (error) {
                console.error('Error unsubscribing from push notifications:', error);
                throw error;
            }
        }
        return false;
    },
    
    // Check if subscribed
    async isSubscribed() {
        if (!this.registration) {
            await this.init();
        }
        
        if (!this.registration) {
            return false;
        }
        
        this.subscription = await this.registration.pushManager.getSubscription();
        return this.subscription !== null;
    },
    
    // Get VAPID public key from server
    async getVapidPublicKey() {
        try {
            const url = API_BASE_URL_PUSH + '/push/vapid-key.php';
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Include cookies for session authentication
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const data = await response.json();
            return data.publicKey;
        } catch (error) {
            console.error('Error getting VAPID key:', error);
            return null;
        }
    },
    
    // Update subscription on server
    async updateSubscriptionOnServer(subscription) {
        try {
            // Try to get user ID from multiple sources
            var userId = null;
            
            // First, try localStorage
            var storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    var user = JSON.parse(storedUser);
                    userId = user.id;
                } catch (e) {
                    console.warn('Could not parse user from localStorage');
                }
            }
            
            // If still no userId, try API call to get current user
            if (!userId && typeof authAPI !== 'undefined' && authAPI.getCurrentUser) {
                try {
                    const response = await authAPI.getCurrentUser();
                    if (response && response.success && response.data && response.data.user) {
                        userId = response.data.user.id;
                        // Update localStorage with fresh data
                        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
                    }
                } catch (e) {
                    console.warn('Could not get user from API:', e);
                }
            }
            
            // Fallback: try getCurrentUserSync if available
            if (!userId && typeof getCurrentUserSync === 'function') {
                try {
                    var currentUser = getCurrentUserSync();
                    userId = currentUser ? currentUser.id : null;
                } catch (e) {
                    console.warn('Could not get user from getCurrentUserSync:', e);
                }
            }
            
            if (!userId) {
                console.warn('User not logged in, cannot save push subscription');
                throw new Error('User not authenticated. Please refresh the page and try again.');
            }
            
            // Convert PushSubscription object to plain object for JSON serialization
            // PushSubscription has getKey() method that returns ArrayBuffer
            let p256dh = '';
            let auth = '';
            
            try {
                if (subscription.getKey) {
                    // Modern API: getKey returns ArrayBuffer
                    const p256dhKey = subscription.getKey('p256dh');
                    const authKey = subscription.getKey('auth');
                    
                    if (p256dhKey) {
                        const p256dhArray = new Uint8Array(p256dhKey);
                        p256dh = btoa(String.fromCharCode.apply(null, p256dhArray));
                    }
                    
                    if (authKey) {
                        const authArray = new Uint8Array(authKey);
                        auth = btoa(String.fromCharCode.apply(null, authArray));
                    }
                } else if (subscription.keys) {
                    // Fallback: keys might already be base64 strings
                    p256dh = subscription.keys.p256dh || '';
                    auth = subscription.keys.auth || '';
                }
            } catch (e) {
                console.error('Error extracting subscription keys:', e);
            }
            
            const subscriptionData = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: p256dh,
                    auth: auth
                }
            };
            
            console.log('Subscription data to send:', {
                endpoint: subscriptionData.endpoint,
                hasP256dh: !!subscriptionData.keys.p256dh,
                hasAuth: !!subscriptionData.keys.auth
            });
            
            const url = API_BASE_URL_PUSH + '/push/subscribe.php';
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include', // Include cookies for session authentication
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscriptionData,
                    userId: userId
                })
            });
            
            // Get response text first to see what we're dealing with
            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', responseText);
                throw new Error('Server returned invalid JSON: ' + responseText.substring(0, 200));
            }
            
            if (!response.ok) {
                console.error('Server error response:', data);
                const errorMsg = data.message || 'HTTP ' + response.status;
                const errorDetails = data.data ? ' Details: ' + JSON.stringify(data.data) : '';
                throw new Error(errorMsg + errorDetails);
            }
            
            if (data.success) {
                console.log('Push subscription saved on server');
            } else {
                console.error('Subscription save failed:', data);
                throw new Error(data.message || 'Failed to save subscription');
            }
        } catch (error) {
            console.error('Error updating subscription on server:', error);
        }
    },
    
    // Remove subscription from server
    async removeSubscriptionFromServer() {
        try {
            // Get user from localStorage (works even if auth.js not loaded yet)
            var storedUser = localStorage.getItem('currentUser');
            var userId = null;
            
            if (storedUser) {
                try {
                    var user = JSON.parse(storedUser);
                    userId = user.id;
                } catch (e) {
                    console.warn('Could not parse user from localStorage');
                }
            }
            
            // Fallback: try getCurrentUserSync if available
            if (!userId && typeof getCurrentUserSync === 'function') {
                var currentUser = getCurrentUserSync();
                userId = currentUser ? currentUser.id : null;
            }
            
            if (!userId) {
                return;
            }
            
            const url = API_BASE_URL_PUSH + '/push/unsubscribe.php';
            await fetch(url, {
                method: 'POST',
                credentials: 'include', // Include cookies for session authentication
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId
                })
            });
        } catch (error) {
            console.error('Error removing subscription from server:', error);
        }
    },
    
    // Convert VAPID key from URL-safe base64 to Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        pushNotificationsManager.init();
    });
} else {
    pushNotificationsManager.init();
}

