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
            
            // Fallback to default
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

        /**
         * Translate card elements (title, description) inside a container.
         * @param {HTMLElement} container - Parent container with cards
         * @param {Array} items - Array of items with id, title, user_id, description
         * @param {Object} options - { titleSelector, descSelector, skipOwnItems, maxDescLength }
         */
        function translateCardElements(container, items, options) {
            if (typeof autoTranslateText !== 'function') return;
            var opts = options || {};
            var titleSel = opts.titleSelector || 'h3';
            var descSel = opts.descSelector || null;
            var skipOwn = opts.skipOwnItems !== false;
            var maxDesc = opts.maxDescLength || 0;
            var currentUser = skipOwn ? getCurrentUserSync() : null;
            var userLang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'fr';

            items.forEach(function(item) {
                if (skipOwn && currentUser && currentUser.id && item.user_id && Number(currentUser.id) === Number(item.user_id)) return;
                var card = container.querySelector('[data-item-id="' + item.id + '"]');
                if (!card) return;

                var titleEl = card.querySelector(titleSel);
                if (titleEl && titleEl.textContent) {
                    autoTranslateText(titleEl.textContent, userLang).then(function(translated) {
                        if (translated && translated !== titleEl.textContent) titleEl.textContent = translated;
                    }).catch(function() {});
                }

                if (descSel) {
                    var descEl = card.querySelector(descSel);
                    if (descEl && descEl.textContent) {
                        autoTranslateText(descEl.textContent, userLang).then(function(translated) {
                            if (translated && translated !== descEl.textContent) {
                                descEl.textContent = maxDesc && translated.length > maxDesc ? translated.substring(0, maxDesc) + '...' : translated;
                            }
                        }).catch(function() {});
                    }
                }
            });
        }

        /**
         * Translate a single conversation card's item title.
         */
        function translateConversationTitle(card, itemTitle) {
            if (typeof autoTranslateText !== 'function' || !itemTitle) return;
            var titleEl = card.querySelector('.request-item-title');
            if (!titleEl) return;
            var userLang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'fr';
            autoTranslateText(itemTitle, userLang).then(function(translated) {
                if (translated) titleEl.textContent = translated;
            }).catch(function() {});
        }

        // Public profile support
        var _profileUrlParams = new URLSearchParams(window.location.search);
        var _viewUserId = _profileUrlParams.get('user_id') ? parseInt(_profileUrlParams.get('user_id')) : null;
        var isOwnProfile = true;
        var publicProfileUserId = null;

        // Load user profile from settings
        async function loadUserProfile() {
            // Check if viewing another user's profile
            if (_viewUserId) {
                var currentUser = getCurrentUserSync();
                if (!currentUser || !currentUser.id || _viewUserId !== parseInt(currentUser.id)) {
                    isOwnProfile = false;
                    publicProfileUserId = _viewUserId;
                    await loadPublicProfile(_viewUserId);
                    return;
                }
            }

            var user = null;
            
            // First, check if we have updated data in sessionStorage (more recent)
            var updatedUserData = sessionStorage.getItem('updatedUserData');
            if (updatedUserData) {
                try {
                    var updatedUser = JSON.parse(updatedUserData);
                    user = updatedUser;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } catch (e) {
                }
            }
            
            // If no sessionStorage data, force refresh from API
            if (!user) {
                try {
                    const response = await authAPI.getCurrentUser();
                    if (response.success && response.data && response.data.user) {
                        user = response.data.user;
                        // Update localStorage with fresh data
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } catch (error) {
                }
            }
            
            // If still no user, use cached data
            if (!user) {
                user = getCurrentUserSync();
            }
            
            // Capture user value for use in ratings/reviews section (outside if blocks)
            var currentUserForReviews = user || null;
            
            if (user) {
                
                // Update profile header - wait a bit for DOM to be ready
                await new Promise(resolve => setTimeout(resolve, 50));
                
            var profileAvatar = document.querySelector('.profile-avatar');
                if (profileAvatar) {
                    if (user.avatar) {
                        profileAvatar.innerHTML = '<img src="' + user.avatar + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
                    } else {
                        var initials = user.name.split(' ').map(function(n) { return n[0]; }).join('');
                        profileAvatar.textContent = initials;
                    }
                } else {
                }
                
                var profileName = document.querySelector('.profile-name');
                if (profileName) {
                    profileName.textContent = user.name;
                } else {
                }
                
                var profileMajor = document.querySelector('.profile-major');
                if (profileMajor) {
                    // Check privacy setting: only show department if show_department is true
                    if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                        // Default to true if undefined/null (backward compatibility)
                        var departmentText = (user.department || 'Finance') + ' ' + t('majorSuffix');
                        profileMajor.textContent = departmentText;
                        profileMajor.style.display = 'block';
                    } else {
                        // Hide department if privacy setting is false
                        profileMajor.style.display = 'none';
                    }
                } else {
                }
                
                // Display university logo if available
                var universityLogoContainer = document.getElementById('universityLogoContainer');
                var universityLogo = document.getElementById('universityLogo');
                if (universityLogoContainer && universityLogo && user.university_logo) {
                    universityLogo.src = user.university_logo;
                    universityLogoContainer.style.display = 'block';
                } else if (universityLogoContainer) {
                    universityLogoContainer.style.display = 'none';
                }
                
                // Make profile content visible now that header is loaded
                document.body.classList.add('profile-loaded');
                
                // Retry if elements not found (DOM might not be ready)
                if (!profileAvatar || !profileName || !profileMajor) {
                    setTimeout(async function() {
                        await loadUserProfile();
                    }, 500);
                    return;
                }
                    
                    // Load user stats (posted, interested, exchanges done)
                    if (user.id) {
                        try {
                            const statsResponse = await usersAPI.get(user.id);
                            if (statsResponse.success && statsResponse.data && statsResponse.data.stats) {
                                var stats = statsResponse.data.stats;
                                
                                // Update posted count
                                var postedCountEl = document.getElementById('postedCount');
                                if (postedCountEl) {
                                    postedCountEl.textContent = stats.posted || 0;
                                }
                                
                                // Update interested count (will be updated when items load)
                                // This is handled in loadInterestedItems()
                                
                                // Update exchanges done count
                                var exchangesDoneEl = document.getElementById('exchangesDoneCount');
                                if (exchangesDoneEl) {
                                    exchangesDoneEl.textContent = stats.exchanges_done || 0;
                                }
                            }
                        } catch (statsError) {
                        }
                    }
                } else {
                    // Fallback to cached data if no user
                    user = getCurrentUserSync();
                    
                    var profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) {
                if (user.avatar) {
                    profileAvatar.innerHTML = '<img src="' + user.avatar + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
                } else {
                    var initials = user.name.split(' ').map(function(n) { return n[0]; }).join('');
                    profileAvatar.textContent = initials;
                }
            }
            
            var profileName = document.querySelector('.profile-name');
            if (profileName) {
                profileName.textContent = user.name;
            }
            
            var profileMajor = document.querySelector('.profile-major');
            if (profileMajor) {
                // Check privacy setting: only show department if show_department is true
                if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                    // Default to true if undefined/null (backward compatibility)
                    profileMajor.textContent = (user.department || 'Finance') + ' ' + t('majorSuffix');
                    profileMajor.style.display = 'block';
                } else {
                    // Hide department if privacy setting is false
                    profileMajor.style.display = 'none';
                }
            }
            
            // Display university logo if available
            var universityLogoContainer = document.getElementById('universityLogoContainer');
            var universityLogo = document.getElementById('universityLogo');
            if (universityLogoContainer && universityLogo && user.university_logo) {
                universityLogo.src = user.university_logo;
                universityLogoContainer.style.display = 'block';
            } else if (universityLogoContainer) {
                universityLogoContainer.style.display = 'none';
            }
        }
            
            // Load ratings and reviews (async IIFE to use await)
            // Use the user value from earlier in the function
            if (user && user.id) {
                // Capture user.id in closure to avoid scope issues
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
                    }
                    
                    // Update rating display
                    var profileRating = document.getElementById('profileRating');
                    if (profileRating) {
                        profileRating.textContent = rating.toFixed(1);
                    } else {
                    }
                    
                    // Update reviews count and make it clickable
                    var profileReviews = document.getElementById('profileReviews');
                    if (profileReviews) {
                        var reviewsText = reviews === 0 ? t('noReviewsYet') : '(' + reviews + ' ' + (reviews !== 1 ? t('reviewCountPlural') : t('reviewCountSingular')) + ')';
                        profileReviews.textContent = reviewsText;
                        profileReviews.style.cursor = reviews > 0 ? 'pointer' : 'default';
                        profileReviews.style.textDecoration = reviews > 0 ? 'underline' : 'none';
                        profileReviews.style.color = reviews > 0 ? '#3b82f6' : 'inherit';
                        profileReviews.onclick = reviews > 0 ? function() { openReviewsModal(userId); } : null;
                    } else {
                    }
                    
                    // Generate stars
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
                    }
                } catch (error) {
                    // Set defaults on error
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
                // Set defaults if no user ID
                var profileRating = document.getElementById('profileRating');
                if (profileRating) {
                    profileRating.textContent = '0.0';
                }
                var profileReviews = document.getElementById('profileReviews');
                if (profileReviews) {
                    profileReviews.textContent = '(no reviews yet)';
                }
            }
        }

        async function loadPostedItems() {
            var postedItemsContainer = document.getElementById('postedItems');
            if (!postedItemsContainer) {
                return;
            }
            postedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';
            
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
                    allPostedItems = myItemsData.data;
            }
            
            if (allPostedItems.length === 0) {
                postedItemsContainer.classList.remove('has-items');
                postedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<h3>' + t('noPostsYet') + '</h3>' +
                        '<p>' + t('postedItemsDesc') + '</p>' +
                    '</div>';
            } else {
                postedItemsContainer.classList.add('has-items');
                postedItemsContainer.innerHTML = ''; // Clear loading message
                allPostedItems.forEach(function(item, index) {
                    var card = document.createElement('div');
                    card.className = 'item-card';
                    
                    var typeClass = item.type === 'donation' ? 'donation' : 'exchange';
                    var typeText = item.type === 'donation' ? t('donation') : t('exchange');
                    
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
                            '<p class="item-time" style="margin: 0; font-size: 0.75rem; color: #9ca3af;" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || t('justNow'))) + '</p>' +
                        '</div>' +
                                '<h3>' + item.title + '</h3>' +
                            '</div>';
                    
                    card.setAttribute('data-item-id', item.id);
                    card.setAttribute('data-original-title', item.title);
                    
                    postedItemsContainer.appendChild(card);
                });
                
                // Apply translations for posted items after rendering
                translateCardElements(postedItemsContainer, allPostedItems, { titleSelector: 'h3' });
                
                // Start time updates for posted items
                startProfileTimeUpdates();
            }
            
            // Update stat
            document.getElementById('postedCount').textContent = allPostedItems.length;
            } catch (error) {
                postedItemsContainer.classList.remove('has-items');
                postedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>' + t('errorLoadingItems') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
                    '</div>';
            }
        }

        async function deletePostedItem(event, itemId, isStatic) {
            event.stopPropagation();
            
            try {
                // Delete item via API
                const response = await itemsAPI.delete(itemId);
                
                if (response.success) {
                    showToast(t('itemDeletedSuccess'));
                    // Reload items
                    await loadPostedItems();
            } else {
                    throw new Error(response.message || 'Failed to delete item');
                }
            } catch (error) {
                showToast(t('errorDeletingItem'));
            }
        }

        async function loadInterestedItems() {
            var interestedItemsContainer = document.getElementById('interestedItems');
            if (!interestedItemsContainer) {
                return;
            }
            interestedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';
            
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
                    var typeText = item.type === 'donation' ? t('donation') : t('exchange');
                    
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
                                    (item.unavailable ? '<span class="interested-unavailable-badge">' + t('noLongerAvailable') + '</span>' : '') +
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
                    
                    card.setAttribute('data-item-id', item.id);
                    card.setAttribute('data-original-title', item.title);
                    card.setAttribute('data-original-description', item.description || '');
                    
                    interestedItemsContainer.appendChild(card);
                });
                
                // Apply translations for interested items after rendering
                translateCardElements(interestedItemsContainer, interestedItems, {
                    titleSelector: '.interested-item-title',
                    descSelector: '.interested-description',
                    maxDescLength: 80
                });
            }
            
            // Update stat
            document.getElementById('interestedCount').textContent = interestedItems.length;
            } catch (error) {
                interestedItemsContainer.classList.remove('has-items');
                interestedItemsContainer.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>' + t('errorLoadingItems') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
                    '</div>';
            }
        }

        async function deleteInterestedItem(event, itemId) {
            event.stopPropagation();
            
            try {
                const response = await interestedAPI.remove(itemId);
                
                if (response.success) {
            showToast(t('interestedItemRemoved'));
                    await loadInterestedItems();
                } else {
                    throw new Error(response.message || 'Failed to remove item');
                }
            } catch (error) {
                showToast(t('errorRemovingInterested'));
            }
        }

        function switchTab(tabName, clickedElement) {
            // Find the clicked tab button if not provided
            var clickedTab = clickedElement;
            if (!clickedTab) {
                // Find button by onclick attribute
                var allTabs = document.querySelectorAll('.tab');
                allTabs.forEach(function(tab) {
                    if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes("'" + tabName + "'")) {
                        clickedTab = tab;
                    }
                });
            }
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to clicked tab immediately
            if (clickedTab) {
                clickedTab.classList.add('active');
            }
            
            // Get sections
            var activeSection = document.querySelector('.content-section.active');
            var newSection = document.getElementById(tabName);
            
            if (!newSection) return;
            
            // If switching to a different section
            if (activeSection && activeSection !== newSection) {
                // Fade out current section
                activeSection.style.opacity = '0';
                activeSection.style.transform = 'translateY(-10px)';
                
                // Wait for fade out, then switch
                setTimeout(function() {
                    // Remove active from old section
                    activeSection.classList.remove('active');
                    
                    // Add active to new section
                    newSection.classList.add('active');
                    // Force reflow
                    void newSection.offsetHeight;
                    
                    // Fade in new section
                    requestAnimationFrame(function() {
                        newSection.style.opacity = '1';
                        newSection.style.transform = 'translateY(0)';
                    });
                    
                    // Reload items when switching tabs
                    if (tabName === 'interested') {
                        loadInterestedItems();
                    } else if (tabName === 'posted') {
                        if (isOwnProfile) loadPostedItems(); else loadPublicPostedItems(publicProfileUserId);
                    } else if (tabName === 'messages') {
                        loadMessages();
                    } else if (tabName === 'history') {
                        loadHistory();
                    }
                }, 300); // Match CSS transition duration (0.3s)
            } else {
                // First load or same section - show immediately
                document.querySelectorAll('.content-section').forEach(function(section) {
                section.classList.remove('active');
                    section.style.opacity = '0';
                    section.style.transform = 'translateY(10px)';
                });
                
                newSection.classList.add('active');
                // Force reflow
                void newSection.offsetHeight;
                
                // Fade in immediately
                requestAnimationFrame(function() {
                    newSection.style.opacity = '1';
                    newSection.style.transform = 'translateY(0)';
                });
            
            // Reload items when switching tabs
            if (tabName === 'interested') {
                loadInterestedItems();
            } else if (tabName === 'posted') {
                if (isOwnProfile) loadPostedItems(); else loadPublicPostedItems(publicProfileUserId);
            } else if (tabName === 'messages') {
                loadMessages();
            } else if (tabName === 'history') {
                loadHistory();
            }
            }
        }

        async function loadMessages() {
            var messagesList = document.getElementById('messagesList');
            if (!messagesList) {
                return;
            }
            messagesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';
            
            try {
                const response = await messagesAPI.getAll();
                
                if (!response.success || !response.data) {
                    alert('Invalid response: ' + JSON.stringify(response));
                    throw new Error(response.message || 'Failed to load messages');
                }
                
                var userMessages = response.data;
                
                // First, deduplicate conversations by formatted ID
                // Priority: pending > accepted > rejected > completed
                var statusPriority = { 'pending': 4, 'accepted': 3, 'rejected': 2, 'completed': 1 };
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
                
                // Keep only pending and accepted in the main list; move completed/rejected/cancelled to history
                var activeMessages = deduplicatedMessages.filter(function(conversation) {
                    var status = String(conversation.status || 'pending').toLowerCase().trim();
                    if (conversation.hidden) return false;
                    var isActive = status === 'pending' || status === 'accepted';
                    if (!isActive) {
                    }
                    return isActive;
                });
                
            
            if (activeMessages.length === 0) {
                messagesList.classList.remove('has-items');
                messagesList.innerHTML = 
                    '<div class="empty-state">' +
                        '<h3>' + t('noRequestYet') + '</h3>' +
                        '<p>' + t('requestsDesc') + '</p>' +
                    '</div>';
            } else {
                messagesList.classList.add('has-items');
                messagesList.innerHTML = ''; // Clear loading message
                activeMessages.forEach(function(conversation) {
                    var card = document.createElement('div');
                    card.className = 'item-card';
                    card.style.cursor = 'pointer';
                    card.onclick = function() {
                        openUniversalConversationModal(conversation);
                    };
                    
                    var currentUser = getCurrentUserSync();
                    var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);
                    var isOwner = conversation.isOwner;
                    
                    // Status badge with better styling
                    var statusBadge = '';
                    var statusClass = '';
                    if (conversation.status === 'pending') {
                        statusBadge = t('statusPending');
                        statusClass = 'status-pending';
                    } else if (conversation.status === 'accepted') {
                        statusBadge = t('statusAccepted');
                        statusClass = 'status-accepted';
                    } else if (conversation.status === 'completed') {
                        statusBadge = t('statusCompleted');
                        statusClass = 'status-completed';
                    } else if (conversation.status === 'rejected') {
                        statusBadge = t('statusRejected');
                        statusClass = 'status-rejected';
                    }
                    
                    // Last message preview
                    var lastMessage = conversation.lastMessage || t('noMessagesYet');
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
                                        (conversation.itemType === 'donation' ? t('donation') : t('exchange')) + 
                                    '</span>' +
                                '</div>' +
                                '<h3 class="request-item-title">' + conversation.itemTitle + '</h3>' +
                            '</div>' +
                        '</div>' +
                        '<div class="request-card-body">' +
                            '<div class="request-user-info">' +
                                '<div class="request-user-avatar" style="background: ' + itemColor + ';">' + otherUserInitials + '</div>' +
                                '<div class="request-user-details">' +
                                    '<p class="request-user-label">' + (isOwner ? t('requestFromLabel') : t('toLabel')) + '</p>' +
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
                    
                    translateConversationTitle(card, conversation.itemTitle);
                });
                }
            } catch (error) {
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
            var date = new Date(dateString);
            var now = new Date();
            var diff = now - date;
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return t('justNow');
            if (minutes < 60) return minutes + t('timeMinAgo');
            if (hours < 24) return hours + t('timeHourAgo');
            if (days < 7) return days + t('timeDayAgo');
            return date.toLocaleDateString();
        }

        var selectedRating = 0;
        var reviewedUserId = null;
        var reviewConversationId = null;

        function openReviewModal() {
            if (!currentConversation) return;
            
            var currentUser = getCurrentUserSync();
            var isOwner = currentConversation.isOwner || (currentConversation.owner === currentUser.name);
            
            if (isOwner) {
                showToast(t('cannotReviewSelf'));
                return;
            }
            
            reviewedUserId = currentConversation.ownerId || null;
            // Use dbId (database ID) if available, otherwise use id
            // Make sure we get a numeric ID, not a formatted string like 'conv_5_3'
            reviewConversationId = currentConversation.dbId || 
                                   (typeof currentConversation.id === 'number' ? currentConversation.id : null) ||
                                   null;
            
            // Debug log
            
            if (!reviewedUserId) {
                showToast(t('errorDetermineUser'));
                return;
            }
            
            if (!reviewConversationId) {
                showToast(t('errorDetermineConversation'));
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
                0: t('selectRating'),
                1: t('ratingPoor'),
                2: t('ratingFair'),
                3: t('ratingGood'),
                4: t('ratingVeryGood'),
                5: t('ratingExcellent')
            };
            
            if (ratingText) {
                ratingText.textContent = ratingMessages[selectedRating] || t('selectRating');
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
            // Debug log
            
            if (!reviewedUserId || !reviewConversationId) {
                showToast(t('errorUserInfoMissing'));
                return;
            }
            
            if (selectedRating === 0) {
                showToast(t('pleaseSelectRating'));
                return;
            }
            
            var reviewTextEl = document.getElementById('reviewText');
            var reviewText = reviewTextEl ? reviewTextEl.value.trim() : '';
            
            try {
                const response = await reviewsAPI.create(reviewedUserId, reviewConversationId, selectedRating, reviewText);
                
                if (response.success) {
                    showToast(t('reviewSubmittedSuccess'));
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
                        showToast(t('alreadyReviewed'));
                        closeReviewModal();
                    } else {
                        showToast(errorMessage);
                    }
                }
            } catch (error) {
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
            
            historyContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';
            
            try {
                const response = await messagesAPI.getAll();
                
                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to load history');
                }
                
                var conversations = response.data;
                // Show only completed, rejected, and cancelled conversations in history
                var historyConversations = conversations.filter(function(conv) {
                    var status = String(conv.status || '').toLowerCase().trim();
                    return status === 'completed' || status === 'rejected' || status === 'cancelled';
                });
                
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
                            openUniversalConversationModal(conversation);
                        };
                        
                        var currentUser = getCurrentUserSync();
                        var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);
                        var isOwner = conversation.isOwner;
                        
                        var itemImage = conversation.itemImage || '';
                        var itemColor = conversation.itemColor || (conversation.itemType === 'donation'
                            ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                            : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
                        
                        var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
                        
                        card.innerHTML =
                            '<div class="request-card-header">' +
                                '<div class="request-item-image" style="background: ' + itemColor + ';">' +
                                    (itemImage ? '<img src="' + itemImage + '" alt="' + conversation.itemTitle + '" onerror="this.style.display=\'none\'">' : '') +
                                '</div>' +
                                '<div class="request-card-info">' +
                                    '<div class="request-status-row">' +
                                        '<span class="request-status status-' + conversation.status + '">' + 
                                            (conversation.status === 'completed' ? t('statusCompleted') : 
                                             conversation.status === 'accepted' ? t('statusAccepted') : 
                                             conversation.status === 'rejected' ? t('statusRejected') : 
                                             conversation.status === 'cancelled' ? t('itemNoLongerAvailable') : conversation.status) +
                                        '</span>' +
                                        '<span class="request-type-badge ' + (conversation.itemType === 'donation' ? 'type-donation' : 'type-exchange') + '">' + 
                                            (conversation.itemType === 'donation' ? t('donation') : t('exchange')) + 
                                        '</span>' +
                                    '</div>' +
                                    '<h3 class="request-item-title">' + conversation.itemTitle + '</h3>' +
                                '</div>' +
                            '</div>' +
                            '<div class="request-card-body">' +
                                '<div class="request-user-info">' +
                                    '<div class="request-user-avatar" style="background: ' + itemColor + ';">' + otherUserInitials + '</div>' +
                                    '<div class="request-user-details">' +
                                        '<p class="request-user-label">' + (isOwner ? t('exchangedWith') : t('receivedFrom')) + '</p>' +
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
                        
                        translateConversationTitle(card, conversation.itemTitle);
                    });
                }
            } catch (error) {
                historyContainer.classList.remove('has-items');
                historyContainer.innerHTML =
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>' + t('errorLoadingHistory') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
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
                    // Preserve language setting
                    let lang = null;
                    try {
                        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                        if (settings.language) lang = settings.language;
                    } catch (e) {}
                    localStorage.clear();
                    sessionStorage.clear();
                    if (lang) {
                        localStorage.setItem('userSettings', JSON.stringify({ language: lang }));
                    }
                    // Use replace to prevent back button
                    window.location.replace('login.html?nocache=' + Date.now());
                    // Stop execution
                    throw new Error('Not authenticated');
                }
            } catch (error) {
                // If check fails or returns false, clear everything and redirect
                // Preserve language setting
                let lang = null;
                try {
                    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                    if (settings.language) lang = settings.language;
                } catch (e) {}
                localStorage.clear();
                sessionStorage.clear();
                if (lang) {
                    localStorage.setItem('userSettings', JSON.stringify({ language: lang }));
                }
                window.location.replace('login.html?nocache=' + Date.now());
                // Prevent any further code execution
                throw error;
            }
        })().catch(function(error) {
            // Silently catch to prevent console errors, redirect is already happening
        });
        
        // Check authentication before loading profile
        async function checkAuthentication() {
            try {
                // Force a fresh check by clearing any cached user data
                const isAuth = await checkAuth();
                if (!isAuth) {
                    // Preserve language setting
                    let lang = null;
                    try {
                        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                        if (settings.language) lang = settings.language;
                    } catch (e) {}
                    localStorage.clear();
                    sessionStorage.clear();
                    if (lang) {
                        localStorage.setItem('userSettings', JSON.stringify({ language: lang }));
                    }
                    // Use replace with timestamp to bypass cache
                    window.location.replace('login.html?nocache=' + Date.now());
                    return false;
                }
                return true;
            } catch (error) {
                // On error, assume not authenticated
                // Preserve language setting
                let lang = null;
                try {
                    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                    if (settings.language) lang = settings.language;
                } catch (e) {}
                localStorage.clear();
                sessionStorage.clear();
                if (lang) {
                    localStorage.setItem('userSettings', JSON.stringify({ language: lang }));
                }
                window.location.replace('login.html?nocache=' + Date.now());
                return false;
            }
        }
        
        // Load items on page load
        window.addEventListener('load', async function() {
            
            // Check authentication first
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
                    }
                }
            }
            
            // Force refresh user data from API first - but only after auth check passed
            
            // Clear localStorage first to force fresh API call
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
                    }
                }
            }
            
            await loadUserProfile();
            
            // Only remove sessionStorage after successful load
            if (profileJustUpdated === 'true') {
                sessionStorage.removeItem('userProfileJustUpdated');
                sessionStorage.removeItem('updatedUserData');
            }
            
            // Only load own items/interested if viewing own profile
            if (isOwnProfile) {
                await loadPostedItems();
                await loadInterestedItems();
            }
            
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

        function showToast(message) {
            var toast = document.getElementById('toast');
            var toastMessage = document.getElementById('toastMessage');
            toastMessage.textContent = message;
            toast.classList.add('show');
            
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }

        // Format time ago (same as main.js)
        function formatTimeAgo(dateString) {
            if (!dateString) return t('justNow');
            
            var date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return t('justNow');
            }
            
            var now = new Date();
            var diff = now - date;
            var seconds = Math.floor(diff / 1000);
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            // More precise time display for recent items
            if (seconds < 10) return t('justNow');
            if (seconds < 60) return seconds + t('timeSecShort');
            if (minutes < 60) return minutes + t('timeMinShort');
            if (hours < 24) return hours + t('timeHourShort');
            if (days < 7) return days + t('timeDayShort');
            
            // For older dates, show month and day
            var lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'en';
            var locale = lang === 'fr' ? 'fr-FR' : 'en-US';
            return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
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

        // Load user profile on page load (already handled in window.addEventListener('load'))

        // ==========================================
        // PUBLIC PROFILE FUNCTIONS
        // ==========================================

        async function loadPublicProfile(targetUserId) {
            try {
                const response = await usersAPI.get(targetUserId);
                if (!response.success || !response.data) {
                    showToast(t('userNotFound'));
                    window.location.href = 'index.html';
                    return;
                }

                var user = response.data;

                // Update page title
                document.title = user.name + ' - LetShare';

                // Hide own-profile elements
                var settingsLink = document.getElementById('settingsLink');
                if (settingsLink) settingsLink.style.display = 'none';

                // Hide interested stat (private data)
                var statInterested = document.getElementById('statInterested');
                if (statInterested) statInterested.style.display = 'none';

                // Update stats grid to 2 columns
                var statsGrid = document.querySelector('.profile-stats');
                if (statsGrid) statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';

                // Update profile header
                var profileAvatar = document.querySelector('.profile-avatar');
                if (profileAvatar) {
                    if (user.avatar) {
                        profileAvatar.innerHTML = '<img src="' + user.avatar + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
                    } else {
                        var initials = user.name.split(' ').map(function(n) { return n[0]; }).join('');
                        profileAvatar.textContent = initials;
                    }
                }

                var profileName = document.querySelector('.profile-name');
                if (profileName) profileName.textContent = user.name;

                var profileMajor = document.querySelector('.profile-major');
                if (profileMajor) {
                    if ((user.show_department === true || user.show_department === undefined || user.show_department === null) && user.department) {
                        profileMajor.textContent = user.department + ' ' + t('majorSuffix');
                        profileMajor.style.display = 'block';
                    } else {
                        profileMajor.style.display = 'none';
                    }
                }

                // University logo
                var univContainer = document.getElementById('universityLogoContainer');
                var univLogo = document.getElementById('universityLogo');
                if (univContainer && univLogo && user.university_logo) {
                    univLogo.src = user.university_logo;
                    univContainer.style.display = 'block';
                } else if (univContainer) {
                    univContainer.style.display = 'none';
                }

                // Stats
                if (user.stats) {
                    var postedCountEl = document.getElementById('postedCount');
                    if (postedCountEl) postedCountEl.textContent = user.stats.posted || 0;

                    var exchangesEl = document.getElementById('exchangesDoneCount');
                    if (exchangesEl) exchangesEl.textContent = user.stats.exchanges_done || 0;
                }

                // Rating
                if (user.rating) {
                    var rating = user.rating.average || 0;
                    var reviewCount = user.rating.count || 0;

                    var profileRating = document.getElementById('profileRating');
                    if (profileRating) profileRating.textContent = rating.toFixed(1);

                    var profileReviews = document.getElementById('profileReviews');
                    if (profileReviews) {
                        var text = reviewCount === 0 ? '(no reviews yet)' : '(' + reviewCount + ' review' + (reviewCount !== 1 ? 's' : '') + ')';
                        profileReviews.textContent = text;
                        profileReviews.style.cursor = reviewCount > 0 ? 'pointer' : 'default';
                        profileReviews.style.textDecoration = reviewCount > 0 ? 'underline' : 'none';
                        profileReviews.style.color = reviewCount > 0 ? '#3b82f6' : 'inherit';
                        profileReviews.onclick = reviewCount > 0 ? function() { openReviewsModal(targetUserId); } : null;
                    }

                    var starsContainer = document.getElementById('profileStars');
                    if (starsContainer) {
                        starsContainer.innerHTML = '';
                        var roundedRating = Math.round(rating);
                        for (var i = 1; i <= 5; i++) {
                            var star = document.createElement('span');
                            star.className = 'star' + (i <= roundedRating ? '' : ' empty');
                            star.textContent = '\u2605';
                            starsContainer.appendChild(star);
                        }
                    }
                }

                // Setup public tabs: show Posts and Reviews, hide Interested/Messages/History
                setupPublicTabs();

                // Add block/unblock button
                await addBlockButton(targetUserId);

                // Make profile visible
                document.body.classList.add('profile-loaded');

                // Load posted items for this user
                await loadPublicPostedItems(targetUserId);

            } catch (error) {
                showToast(t('errorLoadingProfile'));
            }
        }

        async function addBlockButton(targetUserId) {
            // Check if user is already blocked
            var isBlocked = false;
            try {
                isBlocked = await blockedAPI.isBlocked(targetUserId);
            } catch (e) {
            }

            // Remove existing block button if any
            var existing = document.getElementById('blockUserBtn');
            if (existing) existing.remove();

            // Create block button
            var btn = document.createElement('button');
            btn.id = 'blockUserBtn';
            btn.style.cssText = 'display: block; margin: 1rem auto; padding: 0.75rem 2rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; border: 2px solid ' + (isBlocked ? '#10b981' : '#ef4444') + '; background: ' + (isBlocked ? '#f0fdf4' : '#fef2f2') + '; color: ' + (isBlocked ? '#10b981' : '#ef4444') + ';';
            btn.textContent = isBlocked ? (t('unblockUser') || 'Unblock User') : (t('blockUser') || 'Block User');

            btn.onclick = async function() {
                if (isBlocked) {
                    // Unblock
                    var result = await blockedAPI.unblock(targetUserId);
                    if (result.success) {
                        showToast(t('userUnblocked') || 'User unblocked');
                        isBlocked = false;
                        btn.textContent = t('blockUser') || 'Block User';
                        btn.style.borderColor = '#ef4444';
                        btn.style.background = '#fef2f2';
                        btn.style.color = '#ef4444';
                        await loadPublicPostedItems(targetUserId);
                    } else {
                        showToast(result.message || (t('tryAgain') || 'Please try again'));
                    }
                } else {
                    // Show styled confirmation modal before blocking
                    var modal = document.createElement('div');
                    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px);';

                    var blockTitle = t('blockUserTitle') || 'Block User';
                    var blockConfirm = t('confirmBlockUser') || 'Are you sure you want to block this user?';
                    var blockWarning = t('blockUserWarning') || 'This action can be undone from Settings';
                    var blockConsequences = t('blockUserConsequences') || 'This user will no longer be able to see your items or send you messages.';
                    var cancelText = t('cancel') || 'Cancel';
                    var blockBtnText = t('confirmBlockBtn') || 'Block User';

                    var content = document.createElement('div');
                    content.style.cssText = 'background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.2s ease-out;';
                    content.innerHTML =
                        '<div style="text-align: center; margin-bottom: 1.5rem;">' +
                            '<div style="width: 56px; height: 56px; background: rgba(245, 158, 11, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">' +
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">' +
                                    '<circle cx="12" cy="12" r="10"></circle>' +
                                    '<path d="M4.93 4.93l14.14 14.14"></path>' +
                                '</svg>' +
                            '</div>' +
                            '<h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.375rem; font-weight: 600;">' + blockTitle + '</h3>' +
                            '<p style="margin: 0; color: #6b7280; font-size: 0.9375rem; line-height: 1.5;">' + blockConfirm + '</p>' +
                        '</div>' +
                        '<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">' +
                            '<div style="display: flex; align-items: flex-start; gap: 0.75rem;">' +
                                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">' +
                                    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
                                    '<line x1="12" y1="9" x2="12" y2="13"></line>' +
                                    '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
                                '</svg>' +
                                '<div>' +
                                    '<p style="margin: 0 0 0.25rem 0; color: #92400e; font-size: 0.875rem; font-weight: 500;">' + blockWarning + '</p>' +
                                    '<p style="margin: 0; color: #b45309; font-size: 0.8125rem; line-height: 1.4;">' + blockConsequences + '</p>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
                            '<button id="profileCancelBlockBtn" style="padding: 0.875rem 1.75rem; border: 1px solid #d1d5db; background: white; border-radius: 0.75rem; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;">' + cancelText + '</button>' +
                            '<button id="profileConfirmBlockBtn" style="padding: 0.875rem 1.75rem; border: none; background: #f59e0b; border-radius: 0.75rem; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;">' + blockBtnText + '</button>' +
                        '</div>';

                    modal.appendChild(content);
                    document.body.appendChild(modal);

                    modal.addEventListener('click', function(e) {
                        if (e.target === modal) modal.remove();
                    });

                    function handleEsc(e) {
                        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', handleEsc); }
                    }
                    document.addEventListener('keydown', handleEsc);

                    document.getElementById('profileCancelBlockBtn').addEventListener('click', function() {
                        modal.remove();
                        document.removeEventListener('keydown', handleEsc);
                    });

                    document.getElementById('profileConfirmBlockBtn').addEventListener('click', async function() {
                        modal.remove();
                        document.removeEventListener('keydown', handleEsc);
                        var result = await blockedAPI.block(targetUserId);
                        if (result.success) {
                            showToast(t('userBlocked') || 'User blocked');
                            isBlocked = true;
                            btn.textContent = t('unblockUser') || 'Unblock User';
                            btn.style.borderColor = '#10b981';
                            btn.style.background = '#f0fdf4';
                            btn.style.color = '#10b981';
                            await loadPublicPostedItems(targetUserId);
                        } else {
                            showToast(result.message || (t('tryAgain') || 'Please try again'));
                        }
                    });
                }
            };

            // Insert after profile-rating section or profile-stats
            var ratingSection = document.querySelector('.profile-rating');
            var statsSection = document.querySelector('.profile-stats');
            var insertAfter = ratingSection || statsSection;
            if (insertAfter && insertAfter.parentNode) {
                insertAfter.parentNode.insertBefore(btn, insertAfter.nextSibling);
            }
        }

        function setupPublicTabs() {
            // Change "My Posts" to "Posts"
            var tabPosts = document.getElementById('tabPosts');
            if (tabPosts) tabPosts.textContent = t('posts') || 'Posts';

            // Hide private tabs
            var tabInterested = document.getElementById('tabInterested');
            if (tabInterested) tabInterested.style.display = 'none';

            var tabMessages = document.getElementById('tabMessages');
            if (tabMessages) tabMessages.style.display = 'none';

            var tabHistory = document.getElementById('tabHistory');
            if (tabHistory) tabHistory.style.display = 'none';

        }

        async function loadPublicPostedItems(userId) {
            var container = document.getElementById('postedItems');
            if (!container) return;

            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';

            try {
                const response = await itemsAPI.getAll('all', { poster_id: userId });
                if (!response.success || !response.data) {
                    throw new Error('Failed to load items');
                }

                var items = response.data;

                if (items.length === 0) {
                    container.classList.remove('has-items');
                    container.innerHTML =
                        '<div class="empty-state">' +
                            '<h3>' + (t('noPostsYet') || 'No posts yet') + '</h3>' +
                            '<p>' + (t('noPostsDesc') || 'This user hasn\'t posted any items') + '</p>' +
                        '</div>';
                    return;
                }

                container.classList.add('has-items');
                container.innerHTML = '';

                items.forEach(function(item) {
                    var card = document.createElement('div');
                    card.className = 'item-card';

                    var typeClass = item.type === 'donation' ? 'donation' : 'exchange';
                    var typeText = item.type === 'donation' ? t('donation') : t('exchange');

                    card.innerHTML =
                        '<img src="' + escapeHtml(item.image || '') + '" alt="' + escapeHtml(item.title) + '" class="item-image" onerror="this.style.display=\'none\'">' +
                        '<div class="item-info">' +
                            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
                                '<div class="item-type ' + typeClass + '">' + typeText + '</div>' +
                                '<p class="item-time" style="margin: 0; font-size: 0.75rem; color: #9ca3af;" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || t('justNow'))) + '</p>' +
                            '</div>' +
                            '<h3>' + escapeHtml(item.title) + '</h3>' +
                            (item.description ? '<p class="public-item-desc" style="color: #6b7280; font-size: 0.8125rem; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(item.description) + '</p>' : '') +
                        '</div>';

                    card.setAttribute('data-item-id', item.id);
                    container.appendChild(card);
                });

                // Translate item titles and descriptions
                translateCardElements(container, items, {
                    titleSelector: 'h3',
                    descSelector: '.public-item-desc',
                    skipOwnItems: false
                });

                startProfileTimeUpdates();
            } catch (error) {
                container.classList.remove('has-items');
                container.innerHTML =
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">\u26A0\uFE0F</div>' +
                        '<h3>' + t('errorLoadingItems') + '</h3>' +
                        '<p>' + t('pleaseTryAgainLater') + '</p>' +
                    '</div>';
            }
        }

        // Expose profile reload functions globally for conversation-modal.js
        window.profileLoadMessages = typeof loadMessages === 'function' ? loadMessages : null;
        window.profileLoadHistory = typeof loadHistory === 'function' ? loadHistory : null;
