/**
 * API Client for LetShare
 * Handles all API calls to the backend
 */

// Use absolute URL for WAMP server
// If running on WAMP (localhost), use this:
// Note: We automatically detect the folder name from the current URL
// Determine API base URL based on current hostname
const API_BASE_URL = (function() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol; // http: or https:
    const pathname = window.location.pathname;
    
    // Extract the project folder name from the pathname (for WAMP/localhost)
    // e.g., /Letshare_app/index.html -> Letshare_app
    const projectFolder = pathname.split('/')[1] || 'Letshare_app';
    
    // If accessing via localhost or 127.0.0.1 with a different port (Live Server, etc.)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && (port === '5500' || port === '3000' || port === '8080')) {
        return 'http://localhost/' + projectFolder + '/api';
    }
    
    // If accessing via local network IP (192.168.x.x)
    if (hostname.match(/^192\.168\.\d+\.\d+$/)) {
        return 'http://' + hostname + '/' + projectFolder + '/api';
    }
    
    // If accessing via ngrok, localtunnel, or other remote service
    // Use the same protocol and hostname as the current page
    if (hostname.includes('ngrok') || hostname.includes('loca.lt') || hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io')) {
        return protocol + '//' + hostname + (port ? ':' + port : '') + '/' + projectFolder + '/api';
    }
    
    // Render.com detection
    if (hostname.includes('onrender.com')) {
        return protocol + '//' + hostname + (port ? ':' + port : '') + '/api';
    }
    
    // InfinityFree detection
    if (hostname.includes('infinityfreeapp.com') || hostname.includes('.rf.gd') || hostname.includes('.ct.ws')) {
        return protocol + '//' + hostname + '/api';
    }
    
    // For localhost without special ports (WAMP default)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost/' + projectFolder + '/api';
    }
    
    // Default: relative path (same origin)
    return 'api';
})();

/**
 * Make API request
 */
async function apiRequest(endpoint, options = {}) {
    // Ensure endpoint doesn't start with a slash
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
    // Handle query parameters - if endpoint contains '?', add .php before the '?'
    let url;
    if (cleanEndpoint.includes('?')) {
        const [path, query] = cleanEndpoint.split('?');
        // Check if API_BASE_URL is absolute or relative
        if (API_BASE_URL.startsWith('http')) {
            // Use URL constructor to properly handle encoding
            try {
                const baseUrl = new URL(API_BASE_URL);
                const pathParts = path.split('/');
                // Build the path properly
                let fullPath = baseUrl.pathname;
                if (!fullPath.endsWith('/')) {
                    fullPath += '/';
                }
                fullPath += pathParts.join('/') + '.php';
                const finalUrl = new URL(fullPath + '?' + query, baseUrl.origin);
                url = finalUrl.href;
            } catch (e) {
                // Fallback to string concatenation if URL constructor fails
                const basePath = API_BASE_URL.replace(/\/$/, '');
                url = `${basePath}/${path}.php?${query}`;
            }
        } else {
            url = `${API_BASE_URL}/${path}.php?${query}`;
        }
    } else {
        if (API_BASE_URL.startsWith('http')) {
            // Use URL constructor to properly handle encoding
            try {
                const baseUrl = new URL(API_BASE_URL);
                const pathParts = cleanEndpoint.split('/');
                // Build the path properly
                let fullPath = baseUrl.pathname;
                if (!fullPath.endsWith('/')) {
                    fullPath += '/';
                }
                fullPath += pathParts.join('/') + '.php';
                const finalUrl = new URL(fullPath, baseUrl.origin);
                url = finalUrl.href;
            } catch (e) {
                // Fallback to string concatenation if URL constructor fails
                const basePath = API_BASE_URL.replace(/\/$/, '');
                url = `${basePath}/${cleanEndpoint}.php`;
            }
        } else {
            url = `${API_BASE_URL}/${cleanEndpoint}.php`;
        }
    }
    
    const defaultOptions = {
        // Note: credentials: 'include' requires Access-Control-Allow-Credentials: true
        // and a specific origin (not *), which we handle in PHP
        // For cross-origin requests, we need credentials for session cookies
        credentials: 'include', // Include cookies for session
        mode: 'cors', // Explicitly set CORS mode
        cache: 'no-cache', // Don't cache API requests
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    // Convert body to JSON if it's an object
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    try {
        console.log('API Request:', url, config.method || 'GET', config.body);
        console.log('API Request URL (decoded):', decodeURIComponent(url));
        console.log('API Request Origin:', window.location.origin);
        console.log('API Request Headers:', config.headers);
        console.log('API Request Config:', {
            method: config.method || 'GET',
            mode: config.mode,
            credentials: config.credentials,
            headers: config.headers
        });
        
        const response = await fetch(url, config);
        
        console.log('API Response received:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok
        });
        
        console.log('API Response:', response.status, response.statusText, response.headers.get('content-type'));
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response. Status: ' + response.status + '. Please check the server logs.');
        }
        
        const data = await response.json();
        
        // Log response data for notifications endpoint
        if (url.includes('notifications')) {
            console.log('Notifications API data:', data);
        }
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            url: url
        });
        
        // Provide more helpful error messages
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.error('Network error - possible causes:');
            console.error('1. WAMP server is not running');
            console.error('2. CORS is blocking the request');
            console.error('3. URL is incorrect:', url);
            throw new Error('Cannot connect to server. Please ensure WAMP is running and the API is accessible.');
        }
        
        // If it's a JSON parse error, provide a better message
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            throw new Error('Server returned invalid JSON. Please check the server configuration.');
        }
        throw error;
    }
}

/**
 * Authentication API
 */
const authAPI = {
    async login(email, password, rememberMe = false) {
        return await apiRequest('auth/login', {
            method: 'POST',
            body: { email, password, remember_me: rememberMe }
        });
    },
    
    async register(userData) {
        return await apiRequest('auth/register', {
            method: 'POST',
            body: userData
        });
    },
    
    async logout() {
        return await apiRequest('auth/logout', {
            method: 'POST'
        });
    },
    
    async getCurrentUser() {
        return await apiRequest('auth/me', {
            method: 'GET',
            cache: 'no-store' // Prevent caching of authentication check
        });
    }
};

/**
 * Public Users API (for non-authenticated users)
 */
const usersPublicAPI = {
    async getUsers() {
        return await apiRequest('users_public', {
            method: 'GET'
        });
    }
};

/**
 * Items API
 */
const itemsAPI = {
    async getAll(filter = 'all', options = {}) {
        const params = new URLSearchParams({ filter });
        if (options.type) params.append('type', options.type);
        if (options.department) params.append('department', options.department);
        if (options.condition) params.append('condition', options.condition);
        if (options.urgent) params.append('urgent', 'true');
        if (options.search) params.append('search', options.search);
        return await apiRequest(`items?${params}`, {
            method: 'GET'
        });
    },
    
    async create(itemData) {
        return await apiRequest('items', {
            method: 'POST',
            body: itemData
        });
    },
    
    async delete(itemId) {
        return await apiRequest(`items?id=${itemId}`, {
            method: 'DELETE'
        });
    }
};

/**
 * Messages API
 */
const messagesAPI = {
    async getAll() {
        return await apiRequest('messages', {
            method: 'GET'
        });
    },
    
    async send(itemId, message) {
        return await apiRequest('messages', {
            method: 'POST',
            body: {
                item_id: itemId,
                message: message
            }
        });
    }
};

/**
 * Conversations API
 */
const conversationsAPI = {
    async get(conversationId) {
        return await apiRequest(`conversations?id=${conversationId}`, {
            method: 'GET'
        });
    },
    
    async sendMessage(conversationId, message) {
        return await apiRequest('conversations', {
            method: 'POST',
            body: {
                conversation_id: conversationId,
                message: message
            }
        });
    },
    
    async updateStatus(conversationId, status) {
        return await apiRequest('conversations', {
            method: 'PUT',
            body: {
                conversation_id: conversationId,
                status: status
            }
        });
    },
    
    async deleteConversation(conversationId) {
        return await apiRequest(`conversations?id=${conversationId}`, {
            method: 'DELETE'
        });
    },
    
    async updateTyping(conversationId, isTyping) {
        return await apiRequest('conversations', {
            method: 'PATCH',
            body: {
                conversation_id: conversationId,
                is_typing: isTyping
            }
        });
    }
};

/**
 * Users API
 */
const usersAPI = {
    async deleteAccount() {
        return await apiRequest('users', {
            method: 'DELETE',
            body: { confirm: true }
        });
    },
    async get(userId) {
        return await apiRequest(`users?id=${userId}`, {
            method: 'GET'
        });
    },
    
    async update(userData) {
        return await apiRequest('users', {
            method: 'PUT',
            body: userData
        });
    }
};

/**
 * Interested Items API
 */
const interestedAPI = {
    async getAll() {
        return await apiRequest('interested', {
            method: 'GET'
        });
    },
    
    async add(itemId) {
        return await apiRequest('interested', {
            method: 'POST',
            body: {
                item_id: itemId
            }
        });
    },
    
    async remove(itemId) {
        return await apiRequest(`interested?item_id=${itemId}`, {
            method: 'DELETE'
        });
    }
};

/**
 * Reviews API
 */
const reviewsAPI = {
    async get(userId) {
        return await apiRequest(`reviews?user_id=${userId}`, {
            method: 'GET'
        });
    },
    
    async create(reviewedUserId, conversationId, rating, reviewText) {
        return await apiRequest('reviews', {
            method: 'POST',
            body: {
                reviewed_user_id: reviewedUserId,
                conversation_id: conversationId,
                rating: rating,
                review_text: reviewText
            }
        });
    }
};

/**
 * Universities API
 */
const universitiesAPI = {
    async getAll() {
        return await apiRequest('universities', {
            method: 'GET'
        });
    },
    
    async create(name, code) {
        return await apiRequest('universities', {
            method: 'POST',
            body: { name, code }
        });
    }
};

/**
 * Notifications API
 */
const notificationsAPI = {
    async getAll(limit = 50, unreadOnly = false) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (unreadOnly) params.append('unread_only', 'true');
        return await apiRequest(`notifications?${params}`, {
            method: 'GET'
        });
    },
    
    async getUnreadCount() {
        const params = new URLSearchParams({ limit: '1', unread_only: 'true' });
        return await apiRequest(`notifications?${params}`, {
            method: 'GET'
        });
    },
    
    async markAsRead(notificationIds = null, markAll = false) {
        return await apiRequest('notifications', {
            method: 'PUT',
            body: {
                notification_ids: notificationIds,
                mark_all_as_read: markAll
            }
        });
    },
    
    async delete(notificationId) {
        return await apiRequest(`notifications?id=${notificationId}`, {
            method: 'DELETE'
        });
    }
};

/**
 * Moderation API
 */
const moderationAPI = {
    async report(data) {
        return await apiRequest('moderation', {
            method: 'POST',
            body: data
        });
    },
    
    async getReports() {
        return await apiRequest('moderation', {
            method: 'GET'
        });
    }
};

/**
 * Feedback API
 */
const feedbackAPI = {
    async submit(conversationId, feedbackType, rating, feedbackText, wouldRecommend) {
        return await apiRequest('feedback', {
            method: 'POST',
            body: {
                conversation_id: conversationId,
                feedback_type: feedbackType,
                rating: rating,
                feedback_text: feedbackText,
                would_recommend: wouldRecommend
            }
        });
    },
    
    async get(conversationId) {
        return await apiRequest(`feedback?conversation_id=${conversationId}`, {
            method: 'GET'
        });
    }
};

/**
 * Presence API (Online/Offline status)
 */
const presenceAPI = {
    async updatePresence() {
        return await apiRequest('presence', {
            method: 'POST'
        });
    },
    
    async getPresence(userIds) {
        // userIds should be an array of user IDs
        var idsString = Array.isArray(userIds) ? userIds.join(',') : userIds;
        return await apiRequest(`presence?user_ids=${idsString}`, {
            method: 'GET'
        });
    }
};

/**
 * Matching API
 */
const matchingAPI = {
    async getSuggestions(limit = 10) {
        return await apiRequest(`matching?limit=${limit}`, {
            method: 'GET'
        });
    },
    
    async savePreferences(preferences) {
        return await apiRequest('matching', {
            method: 'POST',
            body: preferences
        });
    }
};

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        // Force a fresh check by adding cache-busting parameter
        const response = await authAPI.getCurrentUser();
        
        // Check if response indicates authentication failure
        if (!response || !response.success || !response.data || !response.data.user) {
            // Clear any cached user data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            return false;
        }
        
        return true;
    } catch (error) {
        // On any error, assume not authenticated
        console.error('Auth check failed:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        return false;
    }
}

/**
 * Handle API errors
 */
function handleAPIError(error) {
    console.error('API Error:', error);
    
    if (error.message.includes('Authentication required') || error.message.includes('401')) {
        // Redirect to login
        window.location.replace('login.html');
        return;
    }
    
    // Show error toast
    if (typeof showToast === 'function') {
        showToast(error.message || 'An error occurred');
    } else {
        alert(error.message || 'An error occurred');
    }
}

