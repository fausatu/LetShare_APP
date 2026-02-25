    
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
                            department: user.department,
                            avatar: user.avatar,
                            language: user.language || 'en',
                            initials: function() {
                                var name = this.name;
                                return name ? name.split(' ').map(function(n) { return n[0]; }).join('') : '';
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
                        department: user.department,
                        avatar: user.avatar,
                        language: user.language || 'en',
                        initials: function() {
                            var name = this.name;
                            return name ? name.split(' ').map(function(n) { return n[0]; }).join('') : '';
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
                                department: user.department,
                                avatar: user.avatar,
                                language: user.language || 'en',
                                initials: function() {
                                    var name = this.name;
                                    return name ? name.split(' ').map(function(n) { return n[0]; }).join('') : '';
                                }
                            };
                        } catch (e) {}
                    }
                }
            }
            // Fallback to default (minimal)
            return {
                id: null,
                name: null,
                email: null,
                department: null,
                avatar: null,
                language: 'en',
                initials: function() { return ''; }
            };
        }

        // Synchronous version for backward compatibility
        function getCurrentUserSync() {
            var storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    var user = JSON.parse(storedUser);
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        department: user.department,
                        avatar: user.avatar,
                        language: user.language || 'en',
                        initials: function() {
                            var name = this.name;
                            return name ? name.split(' ').map(function(n) { return n[0]; }).join('') : '';
                        }
                    };
                } catch (e) {}
            }
            return {
                id: null,
                name: null,
                email: null,
                department: null,
                avatar: null,
                language: 'en',
                initials: function() { return ''; }
            };
        }

  var user = null;     
async function loadUserProfile() {
        var user = null;
        // 1. Récupération utilisateur (sessionStorage, API, localStorage)
        var updatedUserData = sessionStorage.getItem('updatedUserData');
        if (updatedUserData) {
            try {
                var updatedUser = JSON.parse(updatedUserData);
                user = updatedUser;
                localStorage.setItem('currentUser', JSON.stringify(user));
            } catch (e) {
                console.error('Error parsing updated user data:', e);
            }
        }
        if (!user) {
            try {
                const response = await authAPI.getCurrentUser();
                if (response.success && response.data && response.data.user) {
                    user = response.data.user;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
            } catch (error) {
                console.error('Error loading user from API:', error);
            }
        }
        if (!user) {
            user = getCurrentUserSync();
        }

        // 2. Affichage profil et reviews UNIQUEMENT après récupération user
        function showProfileContent() {
            document.querySelector('.profile-header').classList.remove('profile-loading');
            document.querySelector('.tabs').classList.remove('profile-loading');
            document.querySelector('.tabs-container').classList.remove('profile-loading');
            document.body.classList.add('profile-loaded');
        }

        if (user && (user.id !== null && user.id !== undefined && user.id !== '')) {
            showProfileContent();

            // Met à jour le nom
            var profileName = document.querySelector('.profile-name');
            if (profileName) profileName.textContent = user.name || '';

            // Met à jour le département
            var profileMajor = document.querySelector('.profile-major');
            if (profileMajor) profileMajor.textContent = user.department || 'Non renseigné';

            // Met à jour la photo/avatar
            var profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) {
                if (user.avatar && user.avatar.startsWith('data:image')) {
                    profileAvatar.innerHTML = '<img src="' + user.avatar + '" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">';
                } else {
                    profileAvatar.textContent = user.name ? user.name.split(' ').map(function(n){return n[0];}).join('').toUpperCase() : '?';
                }
            }

            // Load ratings and reviews (async IIFE to use await)
            var userId = user.id;
            (async function(userId) {
                try {
                    const response = await reviewsAPI.get(userId);
                    var rating = 0;
                    var reviews = 0;
                    if (response.success && response.data) {
                        rating = response.data.rating.average || 0;
                        reviews = response.data.rating.count || 0;
                    } else {
                        console.warn('No rating data from API, using defaults');
                    }
                    var profileRating = document.getElementById('profileRating');
                    if (profileRating) {
                        profileRating.textContent = rating.toFixed(1);
                    } else {
                        console.warn('profileRating element not found!');
                    }
                    var profileReviews = document.getElementById('profileReviews');
                    if (profileReviews) {
                        var reviewsText = reviews === 0 ? '(no reviews yet)' : '(' + reviews + ' review' + (reviews !== 1 ? 's' : '') + ')';
                        profileReviews.textContent = reviewsText;
                        profileReviews.style.cursor = reviews > 0 ? 'pointer' : 'default';
                        profileReviews.style.textDecoration = reviews > 0 ? 'underline' : 'none';
                        profileReviews.style.color = reviews > 0 ? '#3b82f6' : 'inherit';
                            if (reviews > 0) {
                                profileReviews.onclick = function(e) {
                                    e.stopPropagation();
                                    openMyReviewsModal(userId);
                                };
                            } else {
                                profileReviews.onclick = null;
                            }
                    } else {
                        console.warn('profileReviews element not found!');
                    }
                    var starsContainer = document.getElementById('profileStars');
                    if (starsContainer) {
                        starsContainer.innerHTML = '';
                        var roundedRating = Math.round(rating);
                        for (var i = 1; i <= 5; i++) {
                            var star = document.createElement('span');
                            star.className = 'star' + (i <= roundedRating ? '' : ' empty');
                            star.textContent = '★';
                            starsContainer.appendChild(star);
                        }
                    } else {
                        console.warn('profileStars element not found!');
                    }
                } catch (error) {
                    console.error('Error loading user rating:', error);
                    var profileRating = document.getElementById('profileRating');
                    if (profileRating) {
                        profileRating.textContent = '0.0';
                    }
                    var profileReviews = document.getElementById('profileReviews');
                    if (profileReviews) {
                        profileReviews.textContent = '(no reviews yet)';
                    }
                    var starsContainer = document.getElementById('profileStars');
                    if (starsContainer) {
                        starsContainer.innerHTML = '';
                        for (var i = 1; i <= 5; i++) {
                            var star = document.createElement('span');
                            star.className = 'star empty';
                            star.textContent = '★';
                            starsContainer.appendChild(star);
                        }
                    }
                }
            })(userId);
        } else {
            showProfileContent();
            var profileName = document.querySelector('.profile-name');
            if (profileName) profileName.textContent = 'Profil non disponible';
            var profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) profileAvatar.textContent = '?';
            var profileRating = document.getElementById('profileRating');
            if (profileRating) profileRating.textContent = '0.0';
            var profileReviews = document.getElementById('profileReviews');
            if (profileReviews) profileReviews.textContent = '(no reviews yet)';
            var starsContainer = document.getElementById('profileStars');
            if (starsContainer) {
                starsContainer.innerHTML = '';
                for (var i = 1; i <= 5; i++) {
                    var star = document.createElement('span');
                    star.className = 'star empty';
                    star.textContent = '★';
                    starsContainer.appendChild(star);
                }
            }
        }
        


        async function loadPostedItems() {
            var postedItemsContainer = document.getElementById('postedItems');
            if (!postedItemsContainer) return;
            postedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';
            try {
                // Get user's items from API with filter
                const myItemsResponse = await fetch(`api/items.php?filter=my`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!myItemsResponse.ok) {
                    throw new Error('Failed to load user items');
                }
                const myItemsData = await myItemsResponse.json();
                var allPostedItems = [];
                if (myItemsData.success && myItemsData.data) {
                    // Ne garder que les posts non complétés
                    allPostedItems = myItemsData.data.filter(function(item) {
                        return item.status !== 'completed';
                    });
                }
                if (allPostedItems.length === 0) {
                    postedItemsContainer.classList.remove('has-items');
                    postedItemsContainer.innerHTML = 
                        '<div class="empty-state">' +
                            '<h3>No posts yet</h3>' +
                            '<p>Your posted items will appear here</p>' +
                        '</div>';
                } else {
                    postedItemsContainer.classList.add('has-items');
                    postedItemsContainer.innerHTML = '';
                    allPostedItems.forEach(function(item, index) {
                        var card = document.createElement('div');
                        card.className = 'item-card';
                        var typeClass = item.type === 'donation' ? 'donation' : 'exchange';
                        var typeText = item.type === 'donation' ? 'Donation' : 'Exchange';
                        card.innerHTML = 
                                '<div class="item-delete" onclick="deletePostedItem(event, ' + item.id + ', false)">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' +
                                    '<path d="M18 6L6 18M6 6l12 12"></path>' +
                                '</svg>' +
                            '</div>' +
                                '<img src="' + (item.image || '') + '" alt="' + item.title + '" class="item-image" onerror="this.style.display=\'none\'">' +
                                '<div class="item-info">' +
                            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
                                '<div class="item-type ' + typeClass + '">' + typeText + '</div>' +
                                '<p class="item-time" style="margin: 0; font-size: 0.75rem; color: #9ca3af;" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || 'just now')) + '</p>' +
                            '</div>' +
                                    '<h3>' + item.title + '</h3>' +
                                '</div>';
                        postedItemsContainer.appendChild(card);
                    });
                    // Start time updates for posted items
                    startProfileTimeUpdates();
                }
                // Update stat
                document.getElementById('postedCount').textContent = allPostedItems.length;
            } catch (error) {
                console.error('Error loading posted items:', error);
                postedItemsContainer.classList.remove('has-items');
                postedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>Error loading items</h3>' +
                        '<p>Please try again later</p>' +
                    '</div>';
            }
        }
        // Expose globally after definition
        window.loadPostedItems = loadPostedItems;

        async function deletePostedItem(event, itemId, isStatic) {
            event.stopPropagation();
            
            try {
                // Delete item via API
                const response = await itemsAPI.delete(itemId);
                
                if (response.success) {
                    showToast(t('itemDeletedSuccess'));
                    await loadPostedItems();
                } else {
                    throw new Error(response.message || t('failedToDeleteItem'));
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                showToast(t('errorDeletingItem'));
            }
        }
        window.deletePostedItem = deletePostedItem;

        // Helper function to translate a profile card's title and description
        async function translateProfileCardTitle(card, titleSelector, descSelector) {
            if (!card) return;
            
            var titleEl = card.querySelector(titleSelector);
            var descEl = descSelector ? card.querySelector(descSelector) : null;
            var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
            var currentUser = getCurrentUserSync ? getCurrentUserSync() : null;
            
            if (titleEl && titleEl.textContent) {
                try {
                    var translated = await autoTranslateText(titleEl.textContent, userLang);
                    if (translated && translated !== titleEl.textContent) {
                        titleEl.textContent = translated;
                    }
                } catch (error) {
                    console.warn('[translateProfileCardTitle] Title translation failed:', error);
                }
            }
            
            if (descEl && descEl.textContent) {
                try {
                    var translated = await autoTranslateText(descEl.textContent, userLang);
                    if (translated && translated !== descEl.textContent) {
                        descEl.textContent = translated;
                    }
                } catch (error) {
                    console.warn('[translateProfileCardTitle] Description translation failed:', error);
                }
            }
            
            // Also translate message preview if it exists (for requests and history)
            var msgPreviewSpan = card.querySelector('.request-message-preview span');
            if (msgPreviewSpan && msgPreviewSpan.textContent) {
                try {
                    var translated = await autoTranslateText(msgPreviewSpan.textContent, userLang);
                    if (translated && translated !== msgPreviewSpan.textContent) {
                        msgPreviewSpan.textContent = translated;
                    }
                } catch (error) {
                    console.warn('[translateProfileCardTitle] Message preview translation failed:', error);
                }
            }
        }
        window.translateProfileCardTitle = translateProfileCardTitle;

        async function loadInterestedItems() {
            var interestedItemsContainer = document.getElementById('interestedItems');
            if (!interestedItemsContainer) return;
            interestedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';
            
            try {
                // Get interested items from API
                const response = await interestedAPI.getAll();
                
                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to load interested items');
                }
                
                var interestedItems = response.data;
            
            if (interestedItems.length === 0) {
                interestedItemsContainer.classList.remove('has-items');
                interestedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<h3>' + t('noInterestedItems') + '</h3>' +
                        '<p>' + t('interestedItemsDesc') + '</p>' +
                    '</div>';
            } else {
                interestedItemsContainer.classList.add('has-items');
                interestedItemsContainer.innerHTML = ''; // Clear loading message
                interestedItems.forEach(function(item) {
                    var card = document.createElement('div');
                    card.className = 'item-card interested-card';
                    if (item.unavailable) {
                        card.classList.add('unavailable');
                    }
                    card.onclick = function() {
                        window.location.href = 'index.html';
                    };
                    
                    var typeClass = item.type === 'donation' ? 'donation' : 'exchange';
                    var typeText = item.type === 'donation' ? 'Donation' : 'Exchange';
                    
                    // User avatar initials
                    var userInitials = item.user ? item.user.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase() : 'U';
                    
                    // Item image or placeholder
                    var itemImage = item.image || '';
                    var itemColor = item.color || (item.type === 'donation' 
                        ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
                    
                    // Description preview
                    var description = item.description || '';
                    if (description.length > 80) {
                        description = description.substring(0, 80) + '...';
                    }
                    
                    card.innerHTML = 
                        '<div class="interested-card-header">' +
                            '<div class="interested-item-image" style="background: ' + itemColor + ';">' +
                                (itemImage ? '<img src="' + itemImage + '" alt="' + item.title + '" onerror="this.style.display=\'none\'">' : '') +
                            '</div>' +
                            '<div class="interested-card-info">' +
                                '<div class="interested-badges-row">' +
                                    '<span class="interested-type-badge ' + (item.type === 'donation' ? 'type-donation' : 'type-exchange') + '">' + typeText + '</span>' +
                                    (item.unavailable ? '<span class="interested-unavailable-badge">No longer available</span>' : '') +
                                '</div>' +
                                '<h3 class="interested-item-title">' + item.title + '</h3>' +
                            '</div>' +
                            '<div class="interested-delete" onclick="deleteInterestedItem(event, ' + item.id + ')">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' +
                                '<path d="M18 6L6 18M6 6l12 12"></path>' +
                            '</svg>' +
                        '</div>' +
                        '</div>' +
                        '<div class="interested-card-body">' +
                            (description ? '<p class="interested-description">' + description + '</p>' : '') +
                            '<div class="interested-user-info">' +
                                '<div class="interested-user-avatar" style="background: ' + itemColor + ';">' + userInitials + '</div>' +
                                '<div class="interested-user-details">' +
                                    '<p class="interested-user-name">' + item.user + '</p>' +
                                    '<p class="interested-user-department">' +
                                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                            '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>' +
                                        '</svg>' +
                                        item.department +
                                    '</p>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="interested-card-footer">' +
                            '<div class="interested-time" data-interested-at="' + (item.interested_at || '') + '">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                    '<circle cx="12" cy="12" r="10"></circle>' +
                                    '<polyline points="12 6 12 12 16 14"></polyline>' +
                                '</svg>' +
                                '<span>' + (item.interested_at ? formatDate(item.interested_at) : item.time) + '</span>' +
                            '</div>' +
                        '</div>';
                    
                    interestedItemsContainer.appendChild(card);
                    // Translate card content
                    translateProfileCardTitle(card, '.interested-item-title', '.interested-description');
                });
            }
            
            // Update stat
            document.getElementById('interestedCount').textContent = interestedItems.length;
            } catch (error) {
                console.error('Error loading interested items:', error);
                interestedItemsContainer.classList.remove('has-items');
                interestedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>' + t('errorLoadingItems') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
                    '</div>';
            }
        }

        window.loadInterestedItems = loadInterestedItems;


        async function deleteInterestedItem(event, itemId) {
            event.stopPropagation();
            
            try {
                const response = await interestedAPI.remove(itemId);
                
                if (response.success) {
                    showToast(t('interestedItemRemoved'));
                    await loadInterestedItems();
                } else {
                    throw new Error(response.message || t('failedToRemoveInterested'));
                }
            } catch (error) {
                console.error('Error deleting interested item:', error);
                showToast(t('errorRemovingInterested'));
            }
        }
        window.deleteInterestedItem = deleteInterestedItem;

        function switchTab(tabName, clickedElement) {
    // Trouve le bouton d'onglet cliqué si non fourni
    var clickedTab = clickedElement;
    if (!clickedTab) {
        var allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(function(tab) {
            if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes("'" + tabName + "'")) {
                clickedTab = tab;
            }
        });
    }

    // Retire la classe active de tous les onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Ajoute la classe active au bouton cliqué
    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    // Sections à afficher
    var activeSection = document.querySelector('.content-section.active');
    var newSection = document.getElementById(tabName);
    if (!newSection) return;

    // Si on change de section
    if (activeSection && activeSection !== newSection) {
        activeSection.style.opacity = '0';
        activeSection.style.transform = 'translateY(-10px)';
        setTimeout(function() {
            activeSection.classList.remove('active');
            newSection.classList.add('active');
            void newSection.offsetHeight;
            requestAnimationFrame(function() {
                newSection.style.opacity = '1';
                newSection.style.transform = 'translateY(0)';
            });
            // Recharge le contenu selon l'onglet
            if (tabName === 'interested') {
                loadInterestedItems();
            } else if (tabName === 'posted') {
                loadPostedItems();
            } else if (tabName === 'messages') {
                loadMessages();
            } else if (tabName === 'history') {
                loadHistory();
            }
        }, 300);
    } else {
        // Premier affichage ou même section
        document.querySelectorAll('.content-section').forEach(function(section) {
            section.classList.remove('active');
            section.style.opacity = '0';
            section.style.transform = 'translateY(10px)';
        });
        newSection.classList.add('active');
        void newSection.offsetHeight;
        requestAnimationFrame(function() {
            newSection.style.opacity = '1';
            newSection.style.transform = 'translateY(0)';
        });
        // Recharge le contenu selon l'onglet
        if (tabName === 'interested') {
            loadInterestedItems();
        } else if (tabName === 'posted') {
            loadPostedItems();
        } else if (tabName === 'messages') {
            loadMessages();
        } else if (tabName === 'history') {
            loadHistory();
        }
    }
        }

    // Expose switchTab globalement
    window.switchTab = switchTab;

        async function loadMessages() {
            var messagesList = document.getElementById('messagesList');
            if (!messagesList) {
                console.error('messagesList element not found!');
                return;
            }
            messagesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';
            
            try {
                const response = await messagesAPI.getAll();
                
                if (!response.success || !response.data) {
                    console.error('Invalid response:', response);
                    alert('Invalid response: ' + JSON.stringify(response));
                    throw new Error(response.message || 'Failed to load messages');
                }
                
                var userMessages = response.data;
                
                var statusPriority = { 'pending': 5, 'accepted': 4, 'partial_confirmed': 3, 'rejected': 2, 'completed': 1 };
                var conversationMap = {};
                userMessages.forEach(function(conv) {
                    var key = conv.id; // Use formatted ID as key (conv_itemId_otherUserId)
                    var currentStatus = String(conv.status || 'pending').toLowerCase().trim();
                    var currentPriority = statusPriority[currentStatus] || 0;
                    
                    if (!conversationMap[key]) {
                        conversationMap[key] = conv;
                    } else {
                        var existingStatus = String(conversationMap[key].status || 'pending').toLowerCase().trim();
                        var existingPriority = statusPriority[existingStatus] || 0;
                        
                        // Keep the conversation with higher priority status, or if same priority, keep the most recent (by dbId)
                        if (currentPriority > existingPriority || 
                            (currentPriority === existingPriority && conv.dbId > conversationMap[key].dbId)) {
                            conversationMap[key] = conv;
                        }
                    }
                });
                var deduplicatedMessages = Object.values(conversationMap);
                
                var requestMessages = deduplicatedMessages.filter(function(conversation) {
                    var status = String(conversation.status || 'pending').toLowerCase().trim();
                    return status === 'pending' || status === 'accepted' || status === 'partial_confirmed';
                });

                if (requestMessages.length === 0) {
                    messagesList.classList.remove('has-items');
                    messagesList.innerHTML = 
                        '<div class="empty-state">' +
                            '<h3>' + t('noRequestYet') + '</h3>' +
                            '<p>' + t('requestsDesc') + '</p>' +
                        '</div>';
                } else {
                    messagesList.classList.add('has-items');
                    messagesList.innerHTML = ''; // Clear loading message
                    requestMessages.forEach(function(conversation) {
                        var card = document.createElement('div');
                        card.className = 'item-card';
                        card.style.cursor = 'pointer';
                        card.onclick = function() {
                            openConversation(conversation);
                        };
                    
                    var currentUser = getCurrentUserSync();
                    var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);
                    var isOwner = conversation.isOwner;
                    
                    // Status badge with better styling
                    var statusBadge = '';
                    var statusClass = '';
                    if (conversation.status === 'pending') {
                        statusBadge = 'Pending';
                        statusClass = 'status-pending';
                    } else if (conversation.status === 'accepted') {
                        statusBadge = 'Accepted';
                        statusClass = 'status-accepted';
                    } else if (conversation.status === 'partial_confirmed') {
                        statusBadge = 'Awaiting Confirmation';
                        statusClass = 'status-partial';
                    } else if (conversation.status === 'completed') {
                        statusBadge = 'Completed';
                        statusClass = 'status-completed';
                    } else if (conversation.status === 'rejected') {
                        statusBadge = 'Rejected';
                        statusClass = 'status-rejected';
                    }
                    
                    // Last message preview
                    var lastMessage = conversation.lastMessage || 'No messages yet';
                    if (lastMessage.length > 60) {
                        lastMessage = lastMessage.substring(0, 60) + '...';
                    }
                    
                    // Item image or placeholder
                    var itemImage = conversation.itemImage || '';
                    var itemColor = conversation.itemColor || (conversation.itemType === 'donation' 
                        ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
                    
                    // User avatar initials
                    var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
                    
                    // Get user avatar
                    var otherUserAvatar = conversation.otherUserAvatar || conversation.avatar || null;
                    
                    var avatarContainerClass = 'request-user-avatar';
                    var userAvatarHtml = '';
                    if (otherUserAvatar) {
                        avatarContainerClass += ' has-image';
                        userAvatarHtml = '<img src="' + otherUserAvatar + '" alt="' + otherUser + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.classList.remove(\'has-image\'); this.parentNode.style.background=\'' + itemColor + '\'; this.parentNode.textContent=\'' + otherUserInitials + '\'; this.remove();">';
                    } else {
                        userAvatarHtml = otherUserInitials;
                    }
                    
                    // Unread indicator
                    var unreadIndicator = conversation.unreadCount > 0 
                        ? '<div class="request-unread-badge">' + conversation.unreadCount + '</div>' 
                        : '';
                    
                    card.innerHTML = 
                        '<div class="request-card-header">' +
                            '<div class="request-item-image" style="background: ' + itemColor + ';">' +
                                (itemImage ? '<img src="' + itemImage + '" alt="' + conversation.itemTitle + '" onerror="this.style.display=\'none\'">' : '') +
                            '</div>' +
                            '<div class="request-card-info">' +
                                '<div class="request-status-row">' +
                                    '<span class="request-status ' + statusClass + '">' + statusBadge + '</span>' +
                                    '<span class="request-type-badge ' + (conversation.itemType === 'donation' ? 'type-donation' : 'type-exchange') + '">' + 
                                        (conversation.itemType === 'donation' ? 'Donation' : 'Exchange') + 
                                    '</span>' +
                                '</div>' +
                                '<h3 class="request-item-title">' + conversation.itemTitle + '</h3>' +
                            '</div>' +
                        '</div>' +
                        '<div class="request-card-body">' +
                            '<div class="request-user-info">' +
                                '<div class="' + avatarContainerClass + '" style="background: ' + itemColor + ';">' + userAvatarHtml + '</div>' +
                                '<div class="request-user-details">' +
                                    '<p class="request-user-label">' + (isOwner ? 'Request from' : 'To') + '</p>' +
                                    '<p class="request-user-name">' + otherUser + '</p>' +
                                '</div>' +
                            '</div>' +
                            '<div class="request-message-preview">' +
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
                                '</svg>' +
                                '<span>' + lastMessage + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="request-card-footer">' +
                            '<div class="request-time">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                    '<circle cx="12" cy="12" r="10"></circle>' +
                                    '<polyline points="12 6 12 12 16 14"></polyline>' +
                                '</svg>' +
                                '<span>' + formatDate(conversation.lastUpdate) + '</span>' +
                            '</div>' +
                            unreadIndicator +
                        '</div>';
                    
                    messagesList.appendChild(card);
                    // Translate card content
                    translateProfileCardTitle(card, '.request-item-title', null);
                });
                }
            } catch (error) {
                console.error('Error loading messages:', error);
                messagesList.classList.remove('has-items');
                messagesList.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>' + t('errorLoadingMessages') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
                    '</div>';
            }
        }

        function formatDate(dateString) {
            window.formatDate = formatDate;
            var date = new Date(dateString);
            var now = new Date();
            var diff = now - date;
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return minutes + 'm ago';
            if (hours < 24) return hours + 'h ago';
            if (days < 7) return days + 'd ago';
            return date.toLocaleDateString();
        }

        var currentConversation = null;

        async function openConversation(conversation) {
            // Use universal modal for profile conversations
            await openUniversalConversationModal(conversation, {
                returnToMessagesList: false,
                backButtonText: 'Back to requests',
                onClose: closeConversation
            });
        }

        function closeConversation() {
            closeUniversalConversationModal();
        }
        
        // Expose functions globally for inline onclick
        window.closeConversation = closeConversation;
        window.deleteConversation = deleteConversation;
        }

        function loadConversationMessages(conversation) {
            var messagesContainer = document.getElementById('conversationMessages');
            if (!messagesContainer) return;
            messagesContainer.innerHTML = '';
            
            var messages = conversation.messages || [];
            var currentUser = getCurrentUserSync();
            
            if (messages.length === 0) {
                messagesContainer.innerHTML = 
                    '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' +
                        '<p>No messages yet</p>' +
                    '</div>';
                return;
            }
            
            var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
            
            // Display all messages immediately with original text
            var messageElements = [];
            messages.forEach(function(message, index) {
                var messageDiv = document.createElement('div');
                // Use multiple methods to determine if message is sent by current user
                var isSent = message.is_sent || 
                            (message.from_user_id && currentUser.id && message.from_user_id === currentUser.id) ||
                            (message.senderId && currentUser.id && message.senderId === currentUser.id) ||
                            (message.from && currentUser.name && message.from === currentUser.name);
                            
                messageDiv.className = 'message ' + (isSent ? 'message-sent' : 'message-received');
                
                // Show timestamp only if it's the first message or if there's a significant time gap (5 minutes)
                var showTime = index === 0;
                if (index > 0) {
                    var prevMessage = messages[index - 1];
                    var currentTime = new Date(message.timestamp || message.created_at);
                    var prevTime = new Date(prevMessage.timestamp || prevMessage.created_at);
                    var timeDiff = currentTime - prevTime;
                    showTime = timeDiff > 300000; // 5 minutes
                }
                
                var timeDisplay = showTime ? '<span class="message-time">' + window.formatDate(message.timestamp || message.created_at) + '</span>' : '';
                
                // Read receipt for sent messages (same as main messages)
                var readReceipt = '';
                if (isSent) {
                    if (message.read && message.read_at) {
                        readReceipt = '<span class="read-receipt read" title="Read at ' + window.formatDate(message.read_at) + '">✓✓</span>';
                    } else if (message.read) {
                        readReceipt = '<span class="read-receipt sent" title="Sent">✓</span>';
                    } else {
                        readReceipt = '<span class="read-receipt pending" title="Pending">⏱</span>';
                    }
                }
                
                // Display with original text first
                messageDiv.innerHTML =
                    '<div class="message-content">' +
                        '<p class="message-text">' + (message.text ? message.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '') + '</p>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem;">' +
                            timeDisplay +
                            (isSent ? '<div style="margin-left: auto;">' + readReceipt + '</div>' : '') +
                        '</div>' +
                    '</div>';
                messagesContainer.appendChild(messageDiv);
                
                // Store for later translation
                messageElements.push({
                    element: messageDiv,
                    message: message,
                    isSent: isSent,
                    index: index
                });
            });
            
            // Scroll to bottom
            setTimeout(function() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
            
            // Now translate messages and update them one by one
            messageElements.forEach(function(item) {
                if (!item.isSent && item.message.text) {
                    autoTranslateText(item.message.text, userLang).then(function(translated) {
                        console.log('[loadConversationMessages] Translated message', item.index, ':', {
                            original: item.message.text.substring(0, 50),
                            translated: translated.substring(0, 50)
                        });
                        
                        var textEl = item.element.querySelector('.message-text');
                        if (textEl && translated && translated !== item.message.text) {
                            textEl.textContent = translated;
                        }
                    }).catch(function(error) {
                        console.warn('Message translation failed:', error);
                    });
                }
            });
        }

        async function loadConversationActions(conversation) {
            var actionsContainer = document.getElementById('conversationActions');
            if (!actionsContainer) return;
            actionsContainer.innerHTML = '';
            
            var currentUser = getCurrentUserSync();
            var isOwner = conversation.isOwner || (conversation.owner === currentUser.name);
            var itemType = conversation.itemType || 'exchange'; // Default to exchange if not specified
            
            if (isOwner && conversation.status === 'pending') {
                actionsContainer.innerHTML = 
                    '<div class="conversation-buttons">' +
                        '<button class="btn-accept" onclick="acceptRequest()">Accept Request</button>' +
                        '<button class="btn-reject" onclick="rejectRequest()">Reject</button>' +
                    '</div>';
                    
            } else if (conversation.status === 'accepted') {
                if (itemType === 'donation') {
                    // Donation: Only requester can confirm
                    if (!isOwner) {
                        actionsContainer.innerHTML = 
                            '<div class="conversation-buttons">' +
                                '<button class="btn-confirm" onclick="confirmReceived()">Confirm Item Received</button>' +
                            '</div>';
                    }
                } else {
                    // Exchange: Both can confirm
                    actionsContainer.innerHTML = 
                        '<div class="conversation-buttons">' +
                            '<button class="btn-confirm" onclick="confirmExchange()">Confirm Exchange Completed</button>' +
                        '</div>';
                }
                
            } else if (conversation.status === 'partial_confirmed') {
                // Exchange partially confirmed - show who confirmed and allow other to confirm
                var ownerConfirmed = conversation.ownerConfirmedAt;
                var requesterConfirmed = conversation.requesterConfirmedAt;
                var waitingFor = '';
                
                if (ownerConfirmed && !requesterConfirmed) {
                    waitingFor = isOwner ? 'Waiting for other party to confirm...' : 'Please confirm exchange completion';
                } else if (requesterConfirmed && !ownerConfirmed) {
                    waitingFor = isOwner ? 'Please confirm exchange completion' : 'Waiting for other party to confirm...';
                }
                
                if ((isOwner && !ownerConfirmed) || (!isOwner && !requesterConfirmed)) {
                    actionsContainer.innerHTML = 
                        '<div class="conversation-buttons">' +
                            '<button class="btn-confirm" onclick="confirmExchange()">Confirm Exchange Completed</button>' +
                            '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center; margin-top: 0.5rem;">' + waitingFor + '</p>' +
                        '</div>';
                } else {
                    actionsContainer.innerHTML = 
                        '<div class="conversation-buttons">' +
                            '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center; padding: 0.5rem;">' + waitingFor + '</p>' +
                        '</div>';
                }
                
            } else if (conversation.status === 'completed') {
                // Show review options based on item type
                await loadReviewActions(conversation, currentUser, isOwner, itemType);
            }
        }
        
        async function loadReviewActions(conversation, currentUser, isOwner, itemType) {
            var actionsContainer = document.getElementById('conversationActions');
            var conversationId = conversation.dbId || conversation.id || null;
            
            if (itemType === 'donation') {
                // Donation: Only requester can review owner
                if (!isOwner && conversationId && currentUser.id) {
                    var hasReviewed = await checkIfUserReviewedConversation(conversationId, currentUser.id, conversation.ownerId);
                    
                    if (!hasReviewed) {
                        actionsContainer.innerHTML = 
                            '<div class="conversation-buttons">' +
                                '<button class="btn-review" onclick="openReviewModal()">Leave a Review</button>' +
                            '</div>';
                    } else {
                        actionsContainer.innerHTML = 
                            '<div class="conversation-buttons">' +
                                '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center; padding: 0.5rem;">Review already submitted</p>' +
                            '</div>';
                    }
                }
            } else {
                // Exchange: Both can review each other
                if (conversationId && currentUser.id) {
                    var targetUserId = isOwner ? conversation.requesterId : conversation.ownerId;
                    var hasReviewed = await checkIfUserReviewedConversation(conversationId, currentUser.id, targetUserId);
                    
                    if (!hasReviewed) {
                        actionsContainer.innerHTML = 
                            '<div class="conversation-buttons">' +
                                '<button class="btn-review" onclick="openReviewModal()">Leave a Review</button>' +
                            '</div>';
                    } else {
                        actionsContainer.innerHTML = 
                            '<div class="conversation-buttons">' +
                                '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center; padding: 0.5rem;">Review already submitted</p>' +
                            '</div>';
                    }
                }
            }
        }
        
        async function checkIfUserReviewedConversation(conversationId, reviewerId, targetUserId) {
            try {
                const reviewsResponse = await reviewsAPI.get(targetUserId);
                if (reviewsResponse.success && reviewsResponse.data && reviewsResponse.data.reviews) {
                    return reviewsResponse.data.reviews.some(function(review) {
                        return review.reviewerId === reviewerId && 
                               review.conversationId === conversationId;
                    });
                }
                return false;
            } catch (error) {
                console.error('Error checking existing review:', error);
                return false; // Show button anyway if error
            }
        }

        async function reloadConversation() {
            if (!currentConversation) return;
            
            try {
                var convId = currentConversation.id;
                const response = await conversationsAPI.get(convId);
                
                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to reload conversation');
                }
                
                var convData = response.data;
                var conversationData = convData.conversation;
                var messages = convData.messages;
                
                // Update current conversation with full data
                currentConversation = {
                    ...currentConversation,
                    ...conversationData,
                    dbId: conversationData.dbId || currentConversation.dbId || currentConversation.id, // Preserve dbId
                    messages: messages
                };
                
                // Update messages and actions in existing modal
                loadConversationMessages(currentConversation);
                await loadConversationActions(currentConversation);
            } catch (error) {
                console.error('Error reloading conversation:', error);
                showToast(t('errorReloadingConversation'), 'error');
            }
        }

        async function sendConversationMessage() {
        if (!currentConversation) return;
        var input = document.getElementById('conversationInput');
        if (!input) return;
        var messageText = input.value.trim();
        if (!messageText) return;
        try {
            var conversationId = currentConversation.id;
            const response = await conversationsAPI.sendMessage(conversationId, messageText);
            if (response.success) {
                input.value = '';
                // Reload conversation to get updated messages (without recreating modal)
                await reloadConversation();
                await loadMessages(); // Refresh messages list
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast(t('errorSendingMessage'), 'error');
        }
    }
    // Expose sendConversationMessage globally for inline onclick
    window.sendConversationMessage = sendConversationMessage;

        async function acceptRequest() {
            if (!currentConversation) return;
            
            try {
                var conversationId = currentConversation.id;
                const response = await conversationsAPI.updateStatus(conversationId, 'accepted');
                
                if (response.success) {
                    showToast(t('requestAccepted'));
                    currentConversation.status = 'accepted';
                    await loadConversationActions(currentConversation);
                    await loadMessages();
                    if (typeof loadPostedItems === 'function') {
                        await loadPostedItems(); // Rafraichir la liste des articles publiés
                    }
                } else {
                    throw new Error(response.message || t('errorAcceptingRequest'));
                }
            } catch (error) {
                console.error('Error accepting request:', error);
                showToast(t('errorAcceptingRequest'));
            }
        }

        function rejectRequest() {
            if (!currentConversation) return;
            showConfirmationModal(
                'Reject Request',
                'Are you sure you want to reject this request? This action cannot be undone.',
                async function() {
                    try {
                        var conversationId = currentConversation.id;
                        const response = await conversationsAPI.updateStatus(conversationId, 'rejected');
                        
                        if (response.success) {
                            showToast('Request rejected.');
                            closeConversation();
                            await loadMessages();
                        } else {
                            throw new Error(response.message || 'Failed to reject request');
                        }
                    } catch (error) {
                        console.error('Error rejecting request:', error);
                        showToast('Error rejecting request. Please try again.');
                    }
                }
            );
        }

    // Confirmation Modal Functions
    function showConfirmationModal(title, message, onConfirm) {
        var modal = document.getElementById('confirmationModal');
        var titleEl = document.getElementById('confirmationTitle');
        var messageEl = document.getElementById('confirmationMessage');
        var confirmBtn = document.getElementById('confirmActionBtn');
        
        if (modal && titleEl && messageEl && confirmBtn) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            // Remove previous event listeners by cloning
            var newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.onclick = function() {
                closeConfirmationModal();
                if (onConfirm) onConfirm();
            };
            
            modal.style.display = 'flex';
            requestAnimationFrame(function() {
                modal.classList.add('active');
            });
        }
    }
    
    function closeConfirmationModal() {
        var modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(function() {
                modal.style.display = 'none';
            }, 300);
        }
    }
    window.closeConfirmationModal = closeConfirmationModal;

    async function deleteConversation() {
        // Use globalCurrentConversation if it's set (from universal modal), otherwise use local currentConversation
        var conversationToDelete = globalCurrentConversation || currentConversation;
        if (!conversationToDelete) return;
        
        // Use the universal delete confirmation modal from conversation-modal.js
        if (typeof deleteUniversalConversation === 'function') {
            // Set global conversation for the universal system
            globalCurrentConversation = conversationToDelete;
            deleteUniversalConversation();
        } else {
            // Fallback to basic confirm if universal system not available
            if (confirm('Are you sure you want to delete this conversation? This will only hide it for you.')) {
                await confirmDeleteConversation();
            }
        }
    }
    
    async function confirmDeleteConversation() {
        if (!currentConversation) return;
        
        try {
            var conversationId = currentConversation.id;
            const response = await conversationsAPI.deleteConversation(conversationId);
            
            if (response.success) {
                showToast('Conversation deleted.');
                closeConversation();
                await loadMessages(); // Refresh list to hide it
                await loadHistory(); // Refresh history too
            } else {
                throw new Error(response.message || 'Failed to delete conversation');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showToast('Error deleting conversation. Please try again.');
        }
    }
    
    // Alias for backward compatibility
    async function deleteConversationForUser() {
        return deleteConversation();
    }
    
    // Open modal to display reviews received by the user
    async function openMyReviewsModal(userId) {
        try {
            // Always use the logged-in user's ID for their own reviews
            var currentUser = getCurrentUserSync();
            var targetUserId = (currentUser && currentUser.id) ? currentUser.id : userId;
            if (!targetUserId) {
                showToast('Please log in to view reviews');
                return;
            }
            // Load reviews
            const response = await reviewsAPI.get(targetUserId);
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Failed to load reviews');
            }
            var reviewsData = response.data;
            var reviews = reviewsData.reviews || [];
            var rating = reviewsData.rating || { average: 0, count: 0 };
            // Create modal
            var modal = document.createElement('div');
            modal.className = 'reviews-modal';
            modal.id = 'myReviewsModal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            var modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; border-radius: 12px; padding: 1.5rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); scrollbar-width: none; -ms-overflow-style: none;';
            modalContent.classList.add('modal-content-scrollable');
            var reviewsHTML = '';
            if (reviews.length === 0) {
                reviewsHTML = '<div style="text-align: center; padding: 3rem; color: #9ca3af;"><p>No reviews yet</p></div>';
            } else {
                reviews.forEach(function(review) {
                    var starsHTML = '';
                    for (var i = 1; i <= 5; i++) {
                        starsHTML += '<span style="color: ' + (i <= review.rating ? '#fbbf24' : '#d1d5db') + '; font-size: 1.2rem;">★</span>';
                    }
                    var reviewerAvatar = review.reviewerAvatar 
                        ? '<img src="' + review.reviewerAvatar + '" alt="' + review.reviewer + '" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">'
                        : '<div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.875rem;">' + (review.reviewer ? review.reviewer.charAt(0).toUpperCase() : 'U') + '</div>';
                    reviewsHTML += 
                        '<div style="border-bottom: 1px solid #e5e7eb; padding: 1rem 0;">' +
                            '<div style="display: flex; gap: 0.75rem; margin-bottom: 0.5rem;">' +
                                reviewerAvatar +
                                '<div style="flex: 1;">' +
                                    '<div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem; font-size: 0.9375rem;">' + (review.reviewer || 'Anonymous') + '</div>' +
                                    '<div style="color: #6b7280; font-size: 0.8125rem; margin-bottom: 0.375rem;">' + review.date + '</div>' +
                                    '<div style="margin-bottom: 0.375rem;">' + starsHTML + '</div>' +
                                '</div>' +
                            '</div>' +
                            (review.text ? '<p style="color: #374151; line-height: 1.5; margin: 0; font-size: 0.875rem;">' + review.text + '</p>' : '') +
                        '</div>';
                });
            }
            modalContent.innerHTML = 
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">' +
                    '<h2 style="margin: 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">My Reviews</h2>' +
                    '<button onclick="closeMyReviewsModal()" style="background: none; border: none; font-size: 1.25rem; color: #6b7280; cursor: pointer; padding: 0.25rem 0.5rem; line-height: 1;">✕</button>' +
                '</div>' +
                '<div style="background: #f9fafb; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; text-align: center;">' +
                    '<div style="font-size: 1.75rem; font-weight: 700; color: #1f2937; margin-bottom: 0.25rem;">' + rating.average.toFixed(1) + '</div>' +
                    '<div style="color: #6b7280; font-size: 0.8125rem;">' + rating.count + ' review' + (rating.count !== 1 ? 's' : '') + '</div>' +
                '</div>' +
                '<div>' + reviewsHTML + '</div>';
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');
            // Prevent scroll on modal backdrop
            modal.addEventListener('wheel', function(e) {
                if (e.target === modal) {
                    e.preventDefault();
                }
            });
            modal.addEventListener('touchmove', function(e) {
                if (e.target === modal) {
                    e.preventDefault();
                }
            });
            // Prevent scroll propagation from modal content
            modalContent.addEventListener('wheel', function(e) {
                var atTop = modalContent.scrollTop === 0;
                var atBottom = modalContent.scrollTop + modalContent.clientHeight >= modalContent.scrollHeight;
                if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                    e.preventDefault();
                }
                e.stopPropagation();
            });
            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeMyReviewsModal();
                }
            });
        } catch (error) {
            console.error('Error loading reviews:', error);
            showToast('Error loading reviews. Please try again.');
        }
    }
    
    function closeMyReviewsModal() {
        var modal = document.getElementById('myReviewsModal');
        if (modal) {
            modal.remove();
        }
        document.body.classList.remove('modal-open');
    }

        async function confirmReceived() {
            if (!currentConversation) return;
            
            try {
                var conversationId = currentConversation.id;
                const response = await conversationsAPI.updateStatus(conversationId, 'completed');
                
                if (response.success) {
            showToast('Item received confirmed! You can now leave a review.');
                    currentConversation.status = 'completed';
                    await loadConversationActions(currentConversation);
                    await loadMessages();
                } else {
                    throw new Error(response.message || 'Failed to confirm receipt');
                }
            } catch (error) {
                console.error('Error confirming receipt:', error);
                showToast('Error confirming receipt. Please try again.');
            }
        }

        async function confirmExchange() {
            if (!currentConversation) return;
            
            try {
                var conversationId = currentConversation.id;
                const response = await conversationsAPI.updateStatus(conversationId, 'completed');
                
                if (response.success) {
                    // Reload conversation to get updated status
                    await reloadConversation();
                    
                    if (currentConversation.status === 'completed') {
                        showToast('Exchange completed! You can now leave a review.');
                    } else if (currentConversation.status === 'partial_confirmed') {
                        showToast('Confirmation recorded. Waiting for the other party to confirm.');
                    }
                } else {
                    throw new Error(response.message || 'Failed to confirm exchange');
                }
            } catch (error) {
                console.error('Error confirming exchange:', error);
                showToast('Error confirming exchange. Please try again.');
            }
        }

        var selectedRating = 0;
        var reviewedUserId = null;
        var reviewConversationId = null;

        function openReviewModal() {
            if (!currentConversation) return;
            
            var currentUser = getCurrentUserSync();
            var isOwner = currentConversation.isOwner || (currentConversation.owner === currentUser.name);
            
            if (isOwner) {
                showToast('You cannot review yourself');
                return;
            }
            
            reviewedUserId = currentConversation.ownerId || null;
            reviewConversationId = currentConversation.dbId || 
                                   (typeof currentConversation.id === 'number' ? currentConversation.id : null) ||
                                   null;
            
            if (!reviewedUserId) {
                showToast('Error: Could not determine user to review');
                return;
            }
            
            if (!reviewConversationId) {
                console.error('Error: reviewConversationId is null. currentConversation:', currentConversation);
                showToast('Error: Could not determine conversation ID');
                return;
            }
            
            // Close conversation modal first
            closeConversation();
            
            // Small delay to ensure conversation modal is closed
            setTimeout(function() {
                selectedRating = 0;
                var reviewTextEl = document.getElementById('reviewText');
                if (reviewTextEl) {
                    reviewTextEl.value = '';
                }
                updateStarDisplay();
                
                var modal = document.getElementById('reviewModal');
                if (modal) {
                    modal.classList.add('active');
                    document.body.classList.add('modal-open');
                    
                    // Prevent scroll on modal backdrop
                    modal.addEventListener('wheel', function(e) {
                        if (e.target === modal) {
                            e.preventDefault();
                        }
                    });
                    
                    modal.addEventListener('touchmove', function(e) {
                        if (e.target === modal) {
                            e.preventDefault();
                        }
                    });
                }
            }, 100);
        }

        function closeReviewModal() {
            var modal = document.getElementById('reviewModal');
            if (modal) {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
            selectedRating = 0;
            reviewedUserId = null;
            reviewConversationId = null;
        }

        function updateStarDisplay() {
            var stars = document.querySelectorAll('#starRating .star');
            var ratingText = document.getElementById('ratingText');
            
            stars.forEach(function(star) {
                var rating = parseInt(star.getAttribute('data-rating'));
                if (rating <= selectedRating) {
                    star.classList.add('active');
                    star.classList.remove('empty');
                } else {
                    star.classList.remove('active');
                    star.classList.add('empty');
                }
            });
            
            var ratingMessages = {
                0: 'Select a rating',
                1: 'Poor',
                2: 'Fair',
                3: 'Good',
                4: 'Very Good',
                5: 'Excellent'
            };
            
            if (ratingText) {
                ratingText.textContent = ratingMessages[selectedRating] || 'Select a rating';
            }
        }

        function initStarRating() {
            var stars = document.querySelectorAll('#starRating .star');
            stars.forEach(function(star) {
                star.addEventListener('click', function() {
                    selectedRating = parseInt(star.getAttribute('data-rating'));
                    updateStarDisplay();
                });
                
                star.addEventListener('mouseenter', function() {
                    var hoverRating = parseInt(star.getAttribute('data-rating'));
                    var tempStars = document.querySelectorAll('#starRating .star');
                    tempStars.forEach(function(s) {
                        var sRating = parseInt(s.getAttribute('data-rating'));
                        if (sRating <= hoverRating) {
                            s.style.opacity = '1';
                        } else {
                            s.style.opacity = '0.5';
                        }
                    });
                });
            });
            
            var starContainer = document.getElementById('starRating');
            if (starContainer) {
                starContainer.addEventListener('mouseleave', function() {
                    updateStarDisplay();
                });
            }
        }

        async function submitReview() {
            if (!reviewedUserId || !reviewConversationId) {
                console.error('Missing data - reviewedUserId:', reviewedUserId, 'reviewConversationId:', reviewConversationId);
                showToast('Error: User or conversation information missing');
                return;
            }
            
            if (selectedRating === 0) {
                showToast('Please select a rating');
                return;
            }
            
            var reviewTextEl = document.getElementById('reviewText');
            var reviewText = reviewTextEl ? reviewTextEl.value.trim() : '';
            
            try {
                const response = await reviewsAPI.create(reviewedUserId, reviewConversationId, selectedRating, reviewText);
                
                // Check if response is null (API error)
                if (!response) {
                    showToast('Error submitting review. Please try again.');
                    console.error('Review API returned null response');
                    return;
                }
                
                if (response.success) {
                    showToast('Review submitted successfully!');
                    closeReviewModal();
                    // Reload messages list to update UI
                    await loadMessages();
                    // Reload history if it's open
                    var historyTab = document.querySelector('.tab[onclick*="history"]');
                    if (historyTab && historyTab.classList.contains('active')) {
                        await loadHistory();
                    }
                } else {
                    // Show the actual error message from the API
                    var errorMessage = response.message || 'Failed to submit review';
                    if (errorMessage.includes('already reviewed')) {
                        showToast('You have already reviewed this exchange');
                        closeReviewModal();
                    } else {
                        showToast(errorMessage);
                        console.error('Review submission error:', errorMessage);
                    }
                }
            } catch (error) {
                console.error('Error submitting review:', error);
                // Show more detailed error message
                var errorMsg = error.message || 'Error submitting review. Please try again.';
                if (errorMsg.includes('conversation_id') || errorMsg.includes('Unknown column')) {
                    errorMsg = 'Database migration required. Please run the migration script to add conversation_id column.';
                }
                showToast(errorMsg);
            }
        }

        async function loadHistory() {
            var historyContainer = document.getElementById('historyList');
            if (!historyContainer) return;

            historyContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';

            try {
                const response = await messagesAPI.getAll();

                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to load history');
                }

                var conversations = response.data;
                // Show only completed conversations in history
                var historyConversations = conversations.filter(function(conv) {
                    var status = String(conv.status || '').toLowerCase().trim();
                    return status === 'completed';
                });

                // Met à jour le nombre d'échanges réalisés
                var exchangesDoneCount = document.getElementById('exchangesDoneCount');
                if (exchangesDoneCount) exchangesDoneCount.textContent = historyConversations.length;

                if (historyConversations.length === 0) {
                    historyContainer.classList.remove('has-items');
                    historyContainer.innerHTML =
                        '<div class="empty-state">' +    
                            '<h3>' + t('noHistoryYet') + '</h3>' +
                            '<p>' + t('historyDesc') + '</p>' +
                        '</div>';
                } else {
                    historyContainer.classList.add('has-items');
                    historyContainer.innerHTML = '';
                    historyConversations.forEach(function(conversation) {
                        var card = document.createElement('div');
                        card.className = 'request-card';
                        card.onclick = function() {
                            openConversation(conversation);
                        };
                        
                        var currentUser = getCurrentUserSync();
                        var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);
                        var isOwner = conversation.isOwner;
                        
                        var itemImage = conversation.itemImage || '';
                        var itemColor = conversation.itemColor || (conversation.itemType === 'donation'
                            ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                            : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
                        
                        var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
                        var otherUserAvatar = conversation.otherUserAvatar || null;
                        
                        // Build avatar HTML - use image if available, otherwise initials
                        var avatarHtml = '';
                        if (otherUserAvatar) {
                            avatarHtml = '<div class="request-user-avatar has-image"><img src="' + otherUserAvatar + '" alt="' + otherUser + '" onerror="this.parentNode.classList.remove(\'has-image\'); this.parentNode.style.background=\'' + itemColor + '\'; this.parentNode.textContent=\'' + otherUserInitials + '\'; this.remove();"></div>';
                        } else {
                            avatarHtml = '<div class="request-user-avatar" style="background: ' + itemColor + ';">' + otherUserInitials + '</div>';
                        }
                        
                        card.innerHTML =
                            '<div class="request-card-header">' +
                                '<div class="request-item-image" style="background: ' + itemColor + ';">' +
                                    (itemImage ? '<img src="' + itemImage + '" alt="' + conversation.itemTitle + '" onerror="this.style.display=\'none\'">' : '') +
                                '</div>' +
                                '<div class="request-card-info">' +
                                    '<div class="request-status-row">' +
                                        '<span class="request-status status-' + conversation.status + '">' + 
                                            (conversation.status === 'completed' ? 'Completed' : 
                                             conversation.status === 'accepted' ? 'Accepted' : 
                                             conversation.status === 'rejected' ? 'Rejected' : 
                                             conversation.status === 'cancelled' ? 'Item No Longer Available' : conversation.status) +
                                        '</span>' +
                                        '<span class="request-type-badge ' + (conversation.itemType === 'donation' ? 'type-donation' : 'type-exchange') + '">' +
                                            (conversation.itemType === 'donation' ? 'Donation' : 'Exchange') +
                                        '</span>' +
                                    '</div>' +
                                    '<h3 class="request-item-title">' + conversation.itemTitle + '</h3>' +
                                '</div>' +
                            '</div>' +
                            '<div class="request-card-body">' +
                                '<div class="request-user-info">' +
                                    avatarHtml +
                                    '<div class="request-user-details">' +
                                        '<p class="request-user-label">' + (isOwner ? 'Exchanged with' : 'Received from') + '</p>' +
                                        '<p class="request-user-name">' + otherUser + '</p>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="request-card-footer">' +
                                '<div class="request-time">' +
                                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                        '<circle cx="12" cy="12" r="10"></circle>' +
                                        '<polyline points="12 6 12 12 16 14"></polyline>' +
                                    '</svg>' +
                                    '<span>' + formatDate(conversation.lastUpdate) + '</span>' +
                                '</div>' +
                            '</div>';
                        
                        historyContainer.appendChild(card);
                        // Translate card content
                        translateProfileCardTitle(card, '.request-item-title', null);
                    });
                }
            } catch (error) {
                console.error('Error loading history:', error);
                historyContainer.classList.remove('has-items');
                historyContainer.innerHTML =
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>Error loading history</h3>' +
                        '<p>Please try again later</p>' +
                    '</div>';
            }
        }

        function notifyInterestedUsers(itemId) {
            // Mark item as unavailable for interested users
            var unavailableItems = JSON.parse(localStorage.getItem('unavailableItems') || '[]');
            if (unavailableItems.indexOf(itemId) === -1) {
                unavailableItems.push(itemId);
                localStorage.setItem('unavailableItems', JSON.stringify(unavailableItems));
            }
        }

        // Listen for profile updates from settings page
        // Listen for profile updates from settings page
        window.addEventListener('userProfileUpdated', async function(event) {
            if (event.detail) {
                // Update localStorage with new data
                localStorage.setItem('currentUser', JSON.stringify(event.detail));
                // Force refresh from API to ensure we have latest data
                await getCurrentUser(true);
                // Refresh profile display
                await loadUserProfile();
            }
        });
        
        // Listen specifically for privacy setting changes
        window.addEventListener('privacySettingUpdated', async function(event) {
            if (event.detail && event.detail.userData) {
                // Update localStorage with new user data
                var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                Object.keys(event.detail.userData).forEach(function(key) {
                    if (event.detail.userData[key] !== undefined) {
                        currentUser[key] = event.detail.userData[key];
                    }
                });
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // Force refresh from API and reload profile
                await getCurrentUser(true);
                await loadUserProfile();
            }
        });
        
        // Also listen for focus event (when user comes back to this tab)
        window.addEventListener('focus', async function() {
            // Check if profile was updated while away
            var profileJustUpdated = sessionStorage.getItem('userProfileJustUpdated');
            if (profileJustUpdated === 'true') {
                await getCurrentUser(true);
                await loadUserProfile();
                sessionStorage.removeItem('userProfileJustUpdated');
                sessionStorage.removeItem('updatedUserData');
            }
        });
        
        // IMMEDIATE AUTH CHECK - Runs as soon as script loads
        // This MUST run synchronously to prevent page from loading
        (async function immediateAuthCheck() {
            // Clear localStorage user data first to force fresh API check
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            try {
                const isAuth = await checkAuth();
                if (!isAuth) {
                    localStorage.clear();
                    sessionStorage.clear();
                    // Use replace to prevent back button
                    window.location.replace('login.html?nocache=' + Date.now());
                    // Stop execution
                    throw new Error('Not authenticated');
                }
            } catch (error) {
                // If check fails or returns false, clear everything and redirect
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('login.html?nocache=' + Date.now());
                // Prevent any further code execution
                throw error;
            }
        })().catch(function(error) {
        });
        
        // Check authentication before loading profile
        async function checkAuthentication() {
            try {
                // Force a fresh check by clearing any cached user data
                const isAuth = await checkAuth();
                if (!isAuth) {
                    // User is not authenticated, clear everything and redirect to login
                    localStorage.clear();
                    sessionStorage.clear();
                    // Use replace with timestamp to bypass cache
                    window.location.replace('login.html?nocache=' + Date.now());
                    return false;
                }
                return true;
            } catch (error) {
                console.error('Auth check error:', error);
                // On error, assume not authenticated
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('login.html?nocache=' + Date.now());
                return false;
            }
        }
        
        // Load items on page load
        window.addEventListener('load', async function() {
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                return; // Redirect already happened
            }
            
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
            if (typeof applyTranslations === 'function') {
                applyTranslations();
            }
            
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
            
            localStorage.removeItem('currentUser');
            await getCurrentUser(true);
            
            // If profile was just updated, use sessionStorage data (more recent than API)
            if (profileJustUpdated === 'true') {
                var updatedUserData = sessionStorage.getItem('updatedUserData');
                if (updatedUserData) {
                    try {
                        var updatedUser = JSON.parse(updatedUserData);
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    } catch (e) {
                        console.error('Error parsing updated user data:', e);
                    }
                }
            }
            
            await loadUserProfile();
            
            // Only remove sessionStorage after successful load
            if (profileJustUpdated === 'true') {
                sessionStorage.removeItem('userProfileJustUpdated');
                sessionStorage.removeItem('updatedUserData');
            }
            
            await loadPostedItems();
            await loadInterestedItems();
            
            // Load messages if the messages tab is active (shouldn't be by default, but just in case)
            var activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.getAttribute('onclick') && activeTab.getAttribute('onclick').includes("'messages'")) {
                await loadMessages();
            }
            
            // Initialize star rating for review modal
            initStarRating();
            
            // Listen for browser back/forward button (popstate event)
            window.addEventListener('popstate', async function(event) {
                // When user navigates back/forward, check auth again
                const stillAuthenticated = await checkAuthentication();
                if (!stillAuthenticated) {
                    return; // Redirect already happened
                }
            });
            
            // Also check on focus (when user switches tabs and comes back)
            window.addEventListener('focus', async function() {
                const stillAuthenticated = await checkAuthentication();
                if (!stillAuthenticated) {
                    return; // Redirect already happened
                }
            });
        });

        // Use the enhanced showToast from utils.js
        // function showToast is now available globally with improved styling

        // Format time ago (same as main.js)
        function formatTimeAgo(dateString) {
            if (!dateString) return 'just now';
            
            var date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.error('Invalid date string:', dateString);
                return 'just now';
            }
            
            var now = new Date();
            var diff = now - date;
            var seconds = Math.floor(diff / 1000);
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            // More precise time display for recent items
            if (seconds < 10) return 'just now';
            if (seconds < 60) return seconds + 's';
            if (minutes < 60) return minutes + 'm';
            if (hours < 24) return hours + 'h';
            if (days < 7) return days + 'd';
            
            // For older dates, show month and day
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Update time displays periodically for profile page
        var profileTimeUpdateInterval = null;
        function startProfileTimeUpdates() {
            updateProfileItemTimes(); // Update immediately
            
            // Clear existing interval if any
            if (profileTimeUpdateInterval) {
                clearInterval(profileTimeUpdateInterval);
            }
            
            // Update every 5 seconds for very responsive time display
            profileTimeUpdateInterval = setInterval(function() {
                updateProfileItemTimes();
            }, 5000); // Update every 5 seconds
        }

        function updateProfileItemTimes() {
            var timeElements = document.querySelectorAll('.item-time[data-created-at]');
            timeElements.forEach(function(el) {
                var createdAt = el.getAttribute('data-created-at');
                if (createdAt) {
                    var newTime = formatTimeAgo(createdAt);
                    var currentTime = el.textContent.trim();
                    // Only update if the time has actually changed
                    if (currentTime !== newTime) {
                        el.textContent = newTime;
                    }
                }
            });
        }
    
    

// Load user profile on page load (already handled in window.addEventListener('load')
