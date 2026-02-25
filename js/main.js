// NOTE: getCurrentUser(), getCurrentUserSync(), disableGuestFeatures(), enableAuthenticatedFeatures()
// are now in js/auth.js

// NOTE: translations, getCurrentLanguage(), t(), applyTranslations() are now in js/translations.js

// NOTE: userReviews is now in js/modals.js

// Items array - will be loaded from API
var items = [];

// NOTE: loadItems(), renderItems(), toggleInterested() are now in js/items.js
// NOTE: toggleFilters(), applyFilters(), clearFilters(), performSearch() are now in js/filters.js
// NOTE: showToast(), formatTimeAgo() are now in js/utils.js
// NOTE: currentItem, currentImageIndex, modalImages are now in js/modals.js

// NOTE: openReviewsModal(), closeModal(), closeReviewsModal() and modal click handlers
// are now implemented in js/modals.js

// NOTE: openAddModal(), closeAddModal(), handleImageUpload(), addImageFromUrl(), handleAddItem()
// are now in js/items.js

// NOTE: showToast() is now in js/utils.js

function createCard(item) {
    // This function is kept for backward compatibility but should use renderItems() instead
    // Get list of deleted items from localStorage
    var deletedItems = JSON.parse(localStorage.getItem('deletedItems') || '[]');
    
    // Skip deleted items - normalize IDs to numbers for reliable comparison
    var itemIdNum = Number(item.id);
    var isDeleted = deletedItems.some(function(deletedId) {
        var deletedIdNum = Number(deletedId);
        return deletedIdNum === itemIdNum;
    });
    if (isDeleted) {
        return;
    }
    
    // Skip items posted by the current user
    var currentUser = getCurrentUser();
    if (item.user === currentUser.name) {
        return;
    }
    
    var card = document.createElement('div');
    card.className = 'card';
    card.onclick = function() { openModal(item); };
    
    var userInitials = item.user.split(' ').map(function(n) { return n[0]; }).join('');
    var badgeColor = item.type === 'donation' ? '#4ade80' : '#60a5fa';
    var badgeText = item.type === 'donation' ? ' Donation ' : ' Exchange';
    
    // Condition status badge
    var conditionBadge = '';
    if (item.condition_status) {
        var conditionLabels = {
            'new': { text: 'Neuf', color: '#10b981' },
            'excellent': { text: 'Excellent', color: '#22c55e' },
            'good': { text: 'Bon', color: '#84cc16' },
            'fair': { text: 'Correct', color: '#eab308' },
            'poor': { text: 'Usé', color: '#f97316' }
        };
        var condition = conditionLabels[item.condition_status] || { text: item.condition_status, color: '#6b7280' };
        conditionBadge = '<div class="card-condition-badge" style="background: ' + condition.color + '; color: white;">' + condition.text + '</div>';
    }
    
    var interestedClass = localStorage.getItem('interested_' + item.id) === 'true' ? 'active' : '';
    card.innerHTML = 
        '<div class="card-glow" style="background: ' + item.color + '"></div>' +
        '<div class="card-interested ' + interestedClass + '" onclick="toggleInterested(event, ' + item.id + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' +
                '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
            '</svg>' +
        '</div>' +
        '<img class="card-image" src="' + (item.image || '') + '" alt="' + item.title + '" onerror="this.style.display=\'none\'">' +
        '<div class="card-badge" style="color: ' + badgeColor + '">' + badgeText + '</div>' +
        conditionBadge +
        '<div class="card-content">' +
            '<h3 class="card-title">' + item.title + '</h3>' +
            '<p class="card-desc">' + item.description + '</p>' +
            '<div class="card-footer">' +
                '<div class="card-user">' +
                    '<div class="user-avatar" style="background: ' + item.color + '">' + userInitials + '</div>' +
                    '<div class="user-info">' +
                        '<h4>' + item.user + '</h4>' +
                        '<div class="user-location">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>' +
                            '</svg>' +
                            item.department +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-time" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || 'just now')) + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="card-overlay">' +
                '<button class="btn-details">' + t('viewDetails') + '</button>' +
        '</div>';

    // Traduction automatique de la description si besoin (pas l'auteur)
    var currentUser = getCurrentUserSync ? getCurrentUserSync() : null;
    var isAuthor = currentUser && currentUser.id && item.user_id && currentUser.id === item.user_id;
    var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
    if (!isAuthor && item.description) {
        autoTranslateText(item.description, userLang).then(function(translated) {
            var descElem = card.querySelector('.card-desc');
            if (descElem) descElem.textContent = translated;
        });
    }
    grid.appendChild(card);
}

// Load users for header (for non-authenticated users)
async function loadUsersForHeader() {
    try {
        const response = await usersPublicAPI.getUsers();
        if (response.success && response.data) {
            const users = response.data.users || [];
            const totalUsers = response.data.total || 0;
            
            // Get containers
            const usersAvatarsContainer = document.getElementById('usersAvatars');
            const usersCountContainer = document.getElementById('usersCount');
            
            // Clear existing content
            if (usersAvatarsContainer) {
                usersAvatarsContainer.innerHTML = '';
            }
            
            // Display avatars (up to 4)
            if (usersAvatarsContainer && users.length > 0) {
                users.forEach(function(user) {
                    const avatarDiv = document.createElement('div');
                    avatarDiv.className = 'user-avatar-header';
                    
                    if (user.avatar) {
                        avatarDiv.innerHTML = '<img src="' + user.avatar + '" alt="' + user.name + '">';
                    } else {
                        // Use initials
                        const initials = user.initials || (user.name ? user.name.split(' ').map(function(n) { return n[0]; }).join('').substring(0, 2).toUpperCase() : 'U');
                        avatarDiv.textContent = initials;
                    }
                    
                    usersAvatarsContainer.appendChild(avatarDiv);
                });
            }
            
            // Display user count
            if (usersCountContainer) {
                if (totalUsers > 0) {
                    var memberText = totalUsers === 1 ? t('member') : t('members');
                    usersCountContainer.textContent = totalUsers + ' ' + memberText;
                } else {
                    usersCountContainer.textContent = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading users for header:', error);
        // Don't show error to user, just log it
    }
}

// Check authentication and load data on page load
window.addEventListener('load', async function() {
    // Check if user is authenticated
    try {
        const isAuth = await checkAuth();
        
        if (isAuth) {
            // User is authenticated - show authenticated header
            var headerAuth = document.getElementById('headerAuthenticated');
            var headerGuest = document.getElementById('headerGuest');
            if (headerAuth) headerAuth.style.display = 'flex';
            if (headerGuest) headerGuest.style.display = 'none';
            
            // Sync language from API to localStorage
            try {
                const userResponse = await authAPI.getCurrentUser();
                if (userResponse.success && userResponse.data && userResponse.data.user) {
                    var userLanguage = userResponse.data.user.language;
                    if (userLanguage) {
                        var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                        settings.language = userLanguage;
                        localStorage.setItem('userSettings', JSON.stringify(settings));
                    }
                }
            } catch (error) {
                console.error('Error syncing language:', error);
            }
            
            // Apply translations immediately after syncing language
            applyTranslations();
            
            // Check if terms acceptance is required
            checkTermsAcceptance();
            
            // Check if profile was just updated (from settings page)
            var profileJustUpdated = sessionStorage.getItem('userProfileJustUpdated');
            if (profileJustUpdated === 'true') {
                // Get updated data from sessionStorage
                var updatedUserData = sessionStorage.getItem('updatedUserData');
                if (updatedUserData) {
                    try {
                        var updatedUser = JSON.parse(updatedUserData);
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        sessionStorage.removeItem('userProfileJustUpdated');
                        sessionStorage.removeItem('updatedUserData');
                    } catch (e) {
                        console.error('Error parsing updated user data:', e);
                    }
                }
            }
            
            // Update current user data (force refresh from API)
            await getCurrentUser(true); // Force refresh to get latest data
            
            // Load items from API
            await loadItems();
            
            // Start time update interval
            startTimeUpdates();
            
            // Load other data
            await updateMessageBadge();
            await updateNotificationBadge();
            await updateProfileAvatar();
            
            // Start notifications polling
            startNotificationsPolling();
            
            // Start presence heartbeat (update online status)
            startPresenceHeartbeat();
            
            // Enable authenticated features (show Add Item button)
            enableAuthenticatedFeatures();
            
            // Check if we need to open an item modal (from login redirect)
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('item');
            if (itemId) {
                // Find the item and open its modal
                try {
                    const itemsResponse = await itemsAPI.getAll();
                    if (itemsResponse.success && itemsResponse.data) {
                        const item = itemsResponse.data.find(function(i) {
                            return String(i.id) === String(itemId);
                        });
                        if (item) {
                            // Wait a bit for the page to render, then open modal
                            setTimeout(function() {
                                openModal(item);
                            }, 500);
                        }
                    }
                } catch (error) {
                    console.error('Error loading item for modal:', error);
                }
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } else {
            // User is not authenticated - show guest header
            var headerAuth = document.getElementById('headerAuthenticated');
            var headerGuest = document.getElementById('headerGuest');
            if (headerAuth) headerAuth.style.display = 'none';
            if (headerGuest) headerGuest.style.display = 'flex';
            
            // Load users for avatars
            await loadUsersForHeader();
            
            // Load items (public view)
            await loadItems();
            
            // Apply translations
            applyTranslations();
            
            // Disable interactive features for guests
            disableGuestFeatures();
        }
    } catch (error) {
        console.error('Error on page load:', error);
        // If error, show guest view
        var headerAuth = document.getElementById('headerAuthenticated');
        var headerGuest = document.getElementById('headerGuest');
        if (headerAuth) headerAuth.style.display = 'none';
        if (headerGuest) headerGuest.style.display = 'flex';
        await loadUsersForHeader();
        await loadItems();
        disableGuestFeatures();
        applyTranslations(); // Apply translations after showing guest features
    }
});

// Update profile avatar in header
async function updateProfileAvatar() {
    // Force refresh from API to get latest data
    try {
        const response = await authAPI.getCurrentUser();
        if (response && response.success && response.data && response.data.user) {
            var user = response.data.user;
            // Update localStorage with fresh data
            localStorage.setItem('currentUser', JSON.stringify(user));
            var profileLink = document.getElementById('profileLink');
            if (profileLink) {
                if (user.avatar) {
                    profileLink.innerHTML = '<img src="' + user.avatar + '" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
                } else {
                    var initials = user.name.split(' ').map(function(n) { return n[0]; }).join('');
                    profileLink.textContent = initials;
                }
            }
        }
    } catch (error) {
        // Fallback to cached data
        var user = getCurrentUserSync();
        var profileLink = document.getElementById('profileLink');
        if (profileLink) {
            if (user.avatar) {
                profileLink.innerHTML = '<img src="' + user.avatar + '" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
            } else {
                profileLink.textContent = user.initials();
            }
        }
    }
}

// Listen for profile updates from settings page
window.addEventListener('userProfileUpdated', async function(event) {
    if (event.detail) {
        // Update localStorage with new data
        localStorage.setItem('currentUser', JSON.stringify(event.detail));
        // Force refresh from API to ensure we have latest data
        await getCurrentUser(true);
        // Refresh avatar display
        await updateProfileAvatar();
    }
});

// Also listen for focus event (when user comes back to this tab)
window.addEventListener('focus', async function() {
    // Check if profile was updated while away
    var profileJustUpdated = sessionStorage.getItem('userProfileJustUpdated');
    if (profileJustUpdated === 'true') {
        await getCurrentUser(true);
        await updateProfileAvatar();
        sessionStorage.removeItem('userProfileJustUpdated');
        sessionStorage.removeItem('updatedUserData');
    }
});

// Load profile avatar on page load
updateProfileAvatar();

// NOTE: All modal functions (openModal, closeModal, openReviewsModal, closeReviewsModal,
// openRequestModal, closeRequestModal, requestItem, sendDonationRequest, sendExchangeRequest,
// checkExistingRequest, createMessage, changeImage, updateCarousel) are now in js/modals.js

// NOTE: currentImageIndex, modalImages are now in js/modals.js

// NOTE: All modal functions are now in js/modals.js
// NOTE: All messages functions are now in js/messages.js
// NOTE: All presence functions are now in js/presence.js
// NOTE: All feedback functions are now in js/feedback.js

// NOTE: Messages functions (openMessagesModal, closeMessagesModal, showMessagesList, showConversation,
// loadMessagesList, formatConversationTime, loadMainConversation, startConversationPolling,
// stopConversationPolling, loadMainConversationMessages, loadMainConversationActions,
// handleMainConversationKeyPress, handleMainConversationTyping, sendMainMessage,
// acceptMainRequest, rejectMainRequest, confirmMainReceived, updateMessageBadge) are now in js/messages.js

// NOTE: Presence functions (startPresenceHeartbeat, stopPresenceHeartbeat, updatePresence) are now in js/presence.js

// NOTE: Feedback functions (openFeedbackModal, closeFeedbackModal, selectFeedbackType, selectRating,
// skipFeedback, submitFeedback) are now in js/feedback.js

// NOTE: Messages functions are now in js/messages.js
// All message-related functions have been moved to js/messages.js

// NOTE: Presence functions are now in js/presence.js
// All presence-related functions have been moved to js/presence.js

// NOTE: Feedback functions are now in js/feedback.js
// All feedback-related functions have been moved to js/feedback.js

// Notifications system
var notificationsPollInterval = null;

async function updateNotificationBadge() {
    var badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    try {
        // Get unread count - use getAll with unreadOnly flag as fallback
        var response;
        if (notificationsAPI.getUnreadCount && typeof notificationsAPI.getUnreadCount === 'function') {
            response = await notificationsAPI.getUnreadCount();
        } else {
            // Fallback to getAll with unreadOnly
            response = await notificationsAPI.getAll(1, true);
        }
        
        if (response.success && response.data) {
            var unreadCount = response.data.unread_count || response.data.count || 0;
            
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
        badge.style.display = 'none';
    }
}

async function loadNotifications() {
    var container = document.getElementById('notificationsList');
    if (!container) return;
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loadingNotifications') + '</div>';
        
        const response = await notificationsAPI.getAll(50);
        
        if (response.success && response.data) {
            var notifications = response.data.notifications || [];
            
            container.innerHTML = '';
            
            if (notifications.length === 0) {
                container.innerHTML = '<div class="notification-empty">' + t('noNotifications') + '</div>';
                return;
            }
            
            // Use for...of loop to support async/await
            for (const notification of notifications) {
                var item = document.createElement('div');
                // Check read_status - it might be 0/1 or false/true
                var isRead = notification.read_status === 1 || notification.read_status === true || notification.read_status === '1';
                item.className = 'notification-item' + (isRead ? '' : ' unread');
                item.onclick = function() {
                    handleNotificationClick(notification);
                };
                
                var icon = getNotificationIcon(notification.type);
                var time = formatTimeAgo(notification.created_at);
                
                // Determine icon color based on notification type
                var iconColor = getNotificationIconColor(notification.type);
                
                // Translate notification title
                var translatedTitle = translateNotificationTitle(notification.title || 'Notification');
                
                // Translate notification message - hybrid approach
                var translatedMessage = '';
                
                // Try pattern matching only for standard notification types (faster)
                if (notification.type === 'request' || notification.type === 'acceptance' || notification.type === 'rejection') {
                    translatedMessage = translateNotificationMessage(notification.message || '') || '';
                }
                
                // For request/acceptance/rejection types, ALWAYS use API to ensure item titles are translated
                if ((notification.type === 'request' || notification.type === 'acceptance' || notification.type === 'rejection') && notification.message) {
                    var userLang = getCurrentLanguage();
                    try {
                        translatedMessage = await autoTranslateText(notification.message, userLang);
                    } catch (e) {
                        console.warn('Error translating notification message:', e);
                        translatedMessage = notification.message;
                    }
                }
                // For other types, only try API if pattern matching found nothing
                else if (!translatedMessage && notification.message) {
                    var userLang = getCurrentLanguage();
                    try {
                        translatedMessage = await autoTranslateText(notification.message, userLang);
                    } catch (e) {
                        console.warn('Error translating notification message:', e);
                        translatedMessage = notification.message;
                    }
                }
                
                item.innerHTML = 
                    '<div class="notification-icon" style="background: ' + iconColor + ';">' + icon + '</div>' +
                    '<div class="notification-content">' +
                        '<div class="notification-title">' + translatedTitle + '</div>' +
                        (translatedMessage ? '<div class="notification-message">' + translatedMessage + '</div>' : '') +
                        '<div class="notification-time">' + time + '</div>' +
                    '</div>';
                
                container.appendChild(item);
            }
        } else {
            console.error('Invalid response format:', response);
            container.innerHTML = '<div class="notification-empty">' + t('errorLoadingNotifications') + '</div>';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<div class="notification-empty">' + t('errorLoadingNotifications') + '</div>';
    }
}

function getNotificationIcon(type) {
    var icons = {
        'message': '💬',
        'request': '📨',
        'acceptance': '✅',
        'rejection': '❌',
        'completion': '🎉',
        'review': '⭐',
        'system': '🔔',
        'item_deleted': '🗑️',
        'conversation_cancelled': '⚠️'
    };
    return icons[type] || '🔔';
}

function getNotificationIconColor(type) {
    // Positive notifications (green)
    var positiveTypes = ['acceptance', 'completion', 'review'];
    // Negative notifications (red)
    var negativeTypes = ['rejection', 'item_deleted', 'conversation_cancelled'];
    // Neutral notifications (blue/green default)
    var neutralTypes = ['message', 'request', 'system'];
    
    if (positiveTypes.indexOf(type) !== -1) {
        return 'linear-gradient(135deg, #10b981, #059669)'; // Green
    } else if (negativeTypes.indexOf(type) !== -1) {
        return 'linear-gradient(135deg, #ef4444, #dc2626)'; // Red
    } else {
        return 'linear-gradient(135deg, #10b981, #059669)'; // Default green
    }
}

function handleNotificationClick(notification) {
    var isRead = notification.read_status === 1 || notification.read_status === true || notification.read_status === '1';
    if (!isRead) {
        notificationsAPI.markAsRead([notification.id], false).then(function() {
            notification.read_status = 1;
            updateNotificationBadge();
            // Reload notifications to update UI
            loadNotifications();
        });
    }
    
    // Handle navigation based on notification type
    if (notification.related_item_id) {
        closeNotificationsModal();
        // Could open item modal here
    } else if (notification.related_conversation_id) {
        closeNotificationsModal();
        openMessagesModal();
        // Could open specific conversation
    }
}

function openNotificationsModal() {
    var modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        loadNotifications();
    }
}

function closeNotificationsModal() {
    var modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

async function markAllNotificationsAsRead() {
    try {
        await notificationsAPI.markAsRead(null, true);
        await loadNotifications();
        await updateNotificationBadge();
    } catch (error) {
        console.error('Error marking all as read:', error);
        showToast('Error marking notifications as read');
    }
}

// Start polling for notifications
function startNotificationsPolling() {
    // Update immediately
    updateNotificationBadge();
    
    // Then poll every 30 seconds
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
    }
    notificationsPollInterval = setInterval(function() {
        updateNotificationBadge();
    }, 30000); // 30 seconds
}

// Stop polling
function stopNotificationsPolling() {
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
        notificationsPollInterval = null;
    }
}

function notifyInterestedUsers(itemId) {
    var unavailableItems = JSON.parse(localStorage.getItem('unavailableItems') || '[]');
    if (unavailableItems.indexOf(itemId) === -1) {
        unavailableItems.push(itemId);
        localStorage.setItem('unavailableItems', JSON.stringify(unavailableItems));
    }
}

// NOTE: formatTimeAgo() and formatMessageDate() are now in js/utils.js
// NOTE: All messages functions are now in js/messages.js
// NOTE: All presence functions are now in js/presence.js
// NOTE: All feedback functions are now in js/feedback.js

// Update time displays periodically
function updateItemTimes() {
    var timeElements = document.querySelectorAll('.card-time[data-created-at], #modalTime[data-created-at]');
    timeElements.forEach(function(el) {
        var createdAt = el.getAttribute('data-created-at');
        if (createdAt) {
            var newTime = formatTimeAgo(createdAt);
            var currentTime = el.textContent.trim();
            if (currentTime !== newTime) {
                el.textContent = newTime;
            }
        }
    });
}

// Start periodic time updates (more frequent for recent items)
var timeUpdateInterval = null;
function startTimeUpdates() {
    updateItemTimes();
    
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
    
    timeUpdateInterval = setInterval(function() {
        updateItemTimes();
    }, 5000);
}

// NOTE: All messages functions (showMessagesList, showConversation, loadMessagesList, etc.) are now in js/messages.js
// NOTE: All presence functions are now in js/presence.js
// NOTE: All feedback functions are now in js/feedback.js

// Listen for storage events to update badge when messages change in other tabs
window.addEventListener('storage', async function(e) {
    if (e.key === 'messages') {
        await updateMessageBadge();
        await updateProfileAvatar();
    }
    if (e.key === 'userSettings') {
        updateProfileAvatar();
        applyTranslations(); // Update translations when language changes
    }
});

// Listen for custom events when settings are saved
window.addEventListener('storage', function(e) {
    if (e.key === 'userSettings') {
        updateProfileAvatar();
        applyTranslations(); // Update translations when language changes
    }
});

// Check if user needs to accept terms
async function checkTermsAcceptance() {
    try {
        const userResponse = await authAPI.getCurrentUser();
        if (userResponse.success && userResponse.data) {
            const user = userResponse.data.user;
            const termsRequired = userResponse.data.terms_required;
            
            // Check if terms were never accepted
            if (termsRequired) {
                showTermsModal(true);
            }
            
            // Check if user accepted an older version
            if (user && user.terms_version) {
                const userVersion = user.terms_version;
                const currentVersion = TERMS_CONFIG.CURRENT_VERSION;
                
                if (userVersion !== currentVersion) {
                    showTermsModal(false);
                }
            }
        }
    } catch (error) {
        console.error('Error checking terms acceptance:', error);
    }
}

// Show terms acceptance modal
function showTermsModal(isFirstTime = true) {
    const modal = document.getElementById('termsModal');
    const checkbox = document.getElementById('termsModalConsent');
    const acceptBtn = document.getElementById('btnAcceptTerms');
    const modalTitle = modal.querySelector('[data-i18n="termsUpdatedTitle"]');
    const modalText = modal.querySelector('[data-i18n="termsUpdatedText"]');
    
    // Update text based on whether it's first time or update
    if (isFirstTime) {
        modalTitle.textContent = t('termsModalTitleFirst');
        modalText.textContent = t('termsModalTextFirst');
    } else {
        modalTitle.textContent = t('termsModalTitleUpdate');
        modalText.textContent = t('termsModalTextUpdate');
    }
    
    modal.style.display = 'flex';
    
    // Enable/disable button based on checkbox
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            acceptBtn.disabled = false;
            acceptBtn.style.opacity = '1';
            acceptBtn.style.cursor = 'pointer';
        } else {
            acceptBtn.disabled = true;
            acceptBtn.style.opacity = '0.5';
            acceptBtn.style.cursor = 'not-allowed';
        }
    });
    
    // Handle accept
    acceptBtn.onclick = async function() {
        if (!checkbox.checked) return;

        acceptBtn.disabled = true;
        acceptBtn.textContent = t('saving') || 'Enregistrement...';

        try {
            // Récupérer le token CSRF via l'API utilitaire
            let csrfToken = null;
            if (window.getCSRFToken) {
                csrfToken = await window.getCSRFToken();
            } else if (window.api && window.api.getCSRFToken) {
                csrfToken = await window.api.getCSRFToken();
            } else if (window.csrfToken) {
                csrfToken = window.csrfToken;
            }

            const response = await fetch('api/accept-terms.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                },
                body: JSON.stringify({
                    version: TERMS_CONFIG.CURRENT_VERSION
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                modal.style.display = 'none';

                // Update user data in localStorage
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                currentUser.terms_version = TERMS_CONFIG.CURRENT_VERSION;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                if (isFirstTime) {
                    showToast(t('termsAcceptedSuccess') || '✓ Conditions acceptées avec succès');
                } else {
                    showToast('✓ ' + (getCurrentLanguage() === 'fr' ? 'Nouvelles conditions acceptées' : 'New terms accepted'));
                }
            } else {
                alert(data.message || t('errorOccurred') || 'Une erreur est survenue');
                acceptBtn.disabled = false;
                acceptBtn.textContent = t('acceptAndContinue') || 'Accepter et continuer';
            }
        } catch (error) {
            console.error('Error accepting terms:', error);
            alert(t('errorOccurred') || 'Une erreur est survenue');
            acceptBtn.disabled = false;
            acceptBtn.textContent = t('acceptAndContinue') || 'Accepter et continuer';
        }
    };
}

// Handle decline terms
function handleDeclineTerms() {
    if (confirm(t('confirmDeclineTerms') || 'En refusant les conditions, vous serez déconnecté. Êtes-vous sûr ?')) {
        // Logout user
        authAPI.logout();
        window.location.href = 'login.html';
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

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initCustomSelects === 'undefined') {
        // Copie locale si non déjà défini
        function initCustomSelects() {
            const customSelects = document.querySelectorAll('.custom-select');
            customSelects.forEach(select => {
                const trigger = select.querySelector('.select-trigger');
                const options = select.querySelector('.select-options');
                const optionItems = select.querySelectorAll('.select-option');
                const hiddenInput = select.nextElementSibling;
                const selectText = select.querySelector('.select-text');
                trigger.addEventListener('click', function(e) {
                    e.stopPropagation();
                    document.querySelectorAll('.custom-select').forEach(otherSelect => {
                        if (otherSelect !== select) {
                            otherSelect.querySelector('.select-trigger').classList.remove('active');
                            otherSelect.querySelector('.select-options').classList.remove('open');
                        }
                    });
                    trigger.classList.toggle('active');
                    options.classList.toggle('open');
                });
                optionItems.forEach(option => {
                    option.addEventListener('click', function(e) {
                        e.stopPropagation();
                        optionItems.forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        const value = this.getAttribute('data-value');
                        const text = this.textContent;
                        selectText.textContent = text;
                        hiddenInput.value = value;
                        select.setAttribute('data-value', value);
                        trigger.classList.remove('active');
                        options.classList.remove('open');
                    });
                });
            });
            document.addEventListener('click', function() {
                document.querySelectorAll('.custom-select').forEach(select => {
                    select.querySelector('.select-trigger').classList.remove('active');
                    select.querySelector('.select-options').classList.remove('open');
                });
            });
        }
    }
    initCustomSelects();
});

