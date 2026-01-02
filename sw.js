// Service Worker for Push Notifications
// This file must be in the root directory

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        self.clients.claim().then(function() {
            return self.clients.matchAll().then(function(clients) {
                clients.forEach(function(client) {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        message: 'Service Worker is active and ready'
                    });
                });
            });
        })
    );
});

// Listen for messages from clients
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TEST_NOTIFICATION') {
        event.waitUntil(
            self.registration.showNotification('Test Notification (Direct)', {
                body: 'This is a direct test notification from Service Worker',
                icon: '/Letshare_Icon.png',
                badge: '/Letshare_Icon.png',
                tag: 'test-direct-' + Date.now(),
                vibrate: [200, 100, 200]
            }).then(function() {
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ success: true });
                }
            }).catch(function(error) {
                console.error('[SW] Error showing test notification:', error);
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ success: false, error: error.message });
                }
            })
        );
    }
});

// Handle push notifications
self.addEventListener('push', function(event) {
    var notificationPromise;
    
    if (event.data) {
        // Helper function to read and parse push data
        function readPushData() {
            return new Promise(function(resolve, reject) {
                try {
                    // Try json() first - browser automatically decrypts if encrypted
                    if (typeof event.data.json === 'function') {
                        event.data.json().then(function(data) {
                            resolve(data);
                        }).catch(function() {
                            readAsText().then(resolve).catch(reject);
                        });
                    } else {
                        readAsText().then(resolve).catch(reject);
                    }
                } catch (e) {
                    readAsText().then(resolve).catch(reject);
                }
            });
        }
        
        function readAsText() {
            return new Promise(function(resolve, reject) {
                try {
                    if (typeof event.data.text === 'function') {
                        var textResult = event.data.text();
                        if (textResult && typeof textResult.then === 'function') {
                            textResult.then(function(text) {
                                parseTextData(text, resolve);
                            }).catch(function() {
                                tryArrayBuffer(resolve, reject);
                            });
                        } else if (typeof textResult === 'string') {
                            parseTextData(textResult, resolve);
                        } else {
                            tryArrayBuffer(resolve, reject);
                        }
                    } else {
                        tryArrayBuffer(resolve, reject);
                    }
                } catch (e) {
                    tryArrayBuffer(resolve, reject);
                }
            });
        }
        
        function tryArrayBuffer(resolve, reject) {
            if (typeof event.data.arrayBuffer === 'function') {
                event.data.arrayBuffer().then(function(buffer) {
                    var text = new TextDecoder('utf-8').decode(buffer);
                    parseTextData(text, resolve);
                }).catch(function() {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        }
        
        function parseTextData(text, resolve) {
            if (!text || text.trim() === '') {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(text));
            } catch (e) {
                resolve({
                    title: 'LetShare',
                    body: text,
                    message: text
                });
            }
        }
        
        notificationPromise = readPushData();
    } else {
        notificationPromise = Promise.resolve(null);
    }
    
    // Show notification with parsed data or defaults
    event.waitUntil(
        notificationPromise.then(function(data) {
            var title = 'LetShare';
            var body = 'You have a new notification';
            
            if (data) {
                title = data.title || data.message || title;
                body = data.body || data.message || body;
            }
            
            return self.registration.showNotification(title, {
                body: body,
                icon: '/Letshare_Icon.png',
                badge: '/Letshare_Icon.png',
                tag: 'letshare-push-' + Date.now(),
                data: data && data.data ? data.data : {},
                requireInteraction: false,
                vibrate: [200, 100, 200],
                silent: false
            });
        }).catch(function(error) {
            console.error('[SW] Error processing push notification:', error);
            // Fallback: show a simple notification
            return self.registration.showNotification('LetShare', {
                body: 'You have a new notification',
                icon: '/Letshare_Icon.png',
                badge: '/Letshare_Icon.png',
                tag: 'letshare-fallback-' + Date.now()
            });
        })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Get base URL from current location or use relative path
    var urlToOpen = '/Test.html';
    
    // If notification has data with URL, use it
    if (event.notification.data && event.notification.data.url) {
        urlToOpen = event.notification.data.url;
    }
    
    // Ensure URL is absolute if needed (for ngrok compatibility)
    if (!urlToOpen.startsWith('http')) {
        // Use current origin (works with both localhost and ngrok)
        var origin = self.location.origin;
        urlToOpen = origin + urlToOpen;
    }
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Check if there's already a window open
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

