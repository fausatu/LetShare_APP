// Authentication and User Management
// ==================================

// Get current user info from API or localStorage (fallback)
async function getCurrentUser(forceRefresh = false) {
    // If not forcing refresh, try localStorage first for quick access
    if (!forceRefresh) {
        var storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                var user = JSON.parse(storedUser);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department: user.department || 'Finance',
                    avatar: user.avatar || null,
                    language: user.language || 'en',
                    initials: function() {
                        var name = this.name;
                        return name.split(' ').map(function(n) { return n[0]; }).join('');
                    }
                };
            } catch (e) {
                // If parsing fails, fetch from API
            }
        }
    }
    
    // Fetch from API (always when forceRefresh is true, or when localStorage is empty)
    try {
        var response = await authAPI.getCurrentUser();
        if (response.success && response.data && response.data.user) {
            var user = response.data.user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department || 'Finance',
                avatar: user.avatar || null,
                language: user.language || 'en',
                initials: function() {
                    var name = this.name;
                    return name.split(' ').map(function(n) { return n[0]; }).join('');
                }
            };
        }
    } catch (error) {
        console.error('Failed to get current user:', error);
        // If API fails, try localStorage as fallback
        if (!forceRefresh) {
            var storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    var user = JSON.parse(storedUser);
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        department: user.department || 'Finance',
                        avatar: user.avatar || null,
                        language: user.language || 'en',
                        initials: function() {
                            var name = this.name;
                            return name.split(' ').map(function(n) { return n[0]; }).join('');
                        }
                    };
                } catch (e) {}
            }
        }
    }
    
    // Fallback to default (should redirect to login)
    return {
        id: null,
        name: 'Guest',
        email: '',
        department: 'Finance',
        avatar: null,
        language: 'en',
        initials: function() { return 'G'; }
    };
}

// Synchronous version for backward compatibility (uses cached data)
function getCurrentUserSync() {
    var storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            var user = JSON.parse(storedUser);
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department || 'Finance',
                avatar: user.avatar || null,
                language: user.language || 'en',
                initials: function() {
                    var name = this.name;
                    return name.split(' ').map(function(n) { return n[0]; }).join('');
                }
            };
        } catch (e) {}
    }
    return {
        id: null,
        name: 'Guest',
        email: '',
        department: 'Finance',
        avatar: null,
        language: 'en',
        initials: function() { return 'G'; }
    };
}

// Disable guest features (hide buttons, etc.)
function disableGuestFeatures() {
    // Hide "Add Item" button (the floating + button) for authenticated users
    var addItemBtn = document.getElementById('btnAddItem');
    if (addItemBtn) {
        addItemBtn.style.display = 'none';
    }
    
    // Show "Join Community" button for non-authenticated users
    var joinCommunityBtn = document.getElementById('btnJoinCommunity');
    if (joinCommunityBtn) {
        joinCommunityBtn.style.display = 'block';
    }
    
    // Modify "Interested" and "Request" buttons to redirect to login
    // This will be handled in the button click handlers
}

// Enable authenticated features (show buttons for authenticated users)
function enableAuthenticatedFeatures() {
    // Show "Add Item" button for authenticated users
    var addItemBtn = document.getElementById('btnAddItem');
    if (addItemBtn) {
        addItemBtn.style.display = 'block';
    }
    
    // Hide "Join Community" button for authenticated users
    var joinCommunityBtn = document.getElementById('btnJoinCommunity');
    if (joinCommunityBtn) {
        joinCommunityBtn.style.display = 'none';
    }
}

// Open terms/privacy in correct language
function openTermsInLanguage() {
    const lang = getCurrentLanguage();
    const url = lang === 'en' ? 'terms-en.html' : 'terms.html';
    window.open(url, '_blank');
}

function openPrivacyInLanguage() {
    const lang = getCurrentLanguage();
    const url = lang === 'en' ? 'privacy-en.html' : 'privacy.html';
    window.open(url, '_blank');
}
