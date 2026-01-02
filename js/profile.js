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

        // User reviews - reviews are per user, not per item
        const userReviews = {
            "Fausat Akintoyesé": {
                rating: 4.9,
                reviews: [
                    { user: "John D.", rating: 5, date: "2 weeks ago", text: "Great person! Very helpful and always responds quickly." },
                    { user: "Sarah M.", rating: 5, date: "1 month ago", text: "Excellent communication and very reliable." },
                    { user: "Mike T.", rating: 4, date: "1 month ago", text: "Great person, very supportive." }
                ]
            },
            "Marie L.": {
                rating: 4.8,
                reviews: [
                    { user: "John D.", rating: 5, date: "2 weeks ago", text: "So generous! Marie helped me with textbooks and always responds quickly. True student solidarity!" },
                    { user: "Sarah M.", rating: 5, date: "1 month ago", text: "Excellent communication and very reliable. Marie is always ready to help fellow students. Highly recommend!" }
                ]
            }
        };

        // Load user profile from settings
        async function loadUserProfile() {
            var user = null;
            
            // First, check if we have updated data in sessionStorage (more recent)
            var updatedUserData = sessionStorage.getItem('updatedUserData');
            if (updatedUserData) {
                try {
                    var updatedUser = JSON.parse(updatedUserData);
                    console.log('loadUserProfile - Using updated user from sessionStorage:', updatedUser);
                    user = updatedUser;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } catch (e) {
                    console.error('Error parsing updated user data:', e);
                }
            }
            
            // If no sessionStorage data, force refresh from API
            if (!user) {
                try {
                    const response = await authAPI.getCurrentUser();
                    console.log('loadUserProfile - API response:', response);
                    if (response.success && response.data && response.data.user) {
                        user = response.data.user;
                        console.log('loadUserProfile - User data from API:', user);
                        // Update localStorage with fresh data
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } catch (error) {
                    console.error('Error loading user from API:', error);
                }
            }
            
            // If still no user, use cached data
            if (!user) {
                user = getCurrentUserSync();
                console.log('loadUserProfile - Using cached user:', user);
            }
            
            // Capture user value for use in ratings/reviews section (outside if blocks)
            var currentUserForReviews = user || null;
            
            if (user) {
                console.log('loadUserProfile - Updating profile with user:', user);
                
                // Update profile header - wait a bit for DOM to be ready
                await new Promise(resolve => setTimeout(resolve, 50));
                
            var profileAvatar = document.querySelector('.profile-avatar');
                console.log('loadUserProfile - profileAvatar element:', profileAvatar);
                if (profileAvatar) {
                    if (user.avatar) {
                        profileAvatar.innerHTML = '<img src="' + user.avatar + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
                        console.log('loadUserProfile - Avatar updated with image:', user.avatar);
                    } else {
                        var initials = user.name.split(' ').map(function(n) { return n[0]; }).join('');
                        profileAvatar.textContent = initials;
                        console.log('loadUserProfile - Avatar updated with initials:', initials);
                    }
                } else {
                    console.warn('loadUserProfile - profileAvatar element not found!');
                }
                
                var profileName = document.querySelector('.profile-name');
                console.log('loadUserProfile - profileName element:', profileName);
                if (profileName) {
                    profileName.textContent = user.name;
                    console.log('loadUserProfile - Name updated to:', user.name);
                } else {
                    console.warn('loadUserProfile - profileName element not found!');
                }
                
                var profileMajor = document.querySelector('.profile-major');
                console.log('loadUserProfile - profileMajor element:', profileMajor);
                if (profileMajor) {
                    // Check privacy setting: only show department if show_department is true
                    if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                        // Default to true if undefined/null (backward compatibility)
                        var departmentText = (user.department || 'Finance') + ' Major';
                        profileMajor.textContent = departmentText;
                        profileMajor.style.display = 'block';
                        console.log('loadUserProfile - Department updated to:', departmentText);
                    } else {
                        // Hide department if privacy setting is false
                        profileMajor.style.display = 'none';
                        console.log('loadUserProfile - Department hidden due to privacy settings');
                    }
                } else {
                    console.warn('loadUserProfile - profileMajor element not found!');
                }
                
                // Display university logo if available
                var universityLogoContainer = document.getElementById('universityLogoContainer');
                var universityLogo = document.getElementById('universityLogo');
                if (universityLogoContainer && universityLogo && user.university_logo) {
                    universityLogo.src = user.university_logo;
                    universityLogoContainer.style.display = 'block';
                    console.log('loadUserProfile - University logo updated:', user.university_logo);
                } else if (universityLogoContainer) {
                    universityLogoContainer.style.display = 'none';
                }
                
                // Retry if elements not found (DOM might not be ready)
                if (!profileAvatar || !profileName || !profileMajor) {
                    console.warn('Some elements not found, retrying after delay...');
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
                            console.error('Error loading user stats:', statsError);
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
                    profileAvatar.textContent = user.initials();
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
                    profileMajor.textContent = (user.department || 'Finance') + ' Major';
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
            }
            var currentUserForReviews = getCurrentUserSync();      
            // Load ratings and reviews (async IIFE to use await)
            // Use the captured user value from earlier in the function
            if (currentUserForReviews && currentUserForReviews.id) {
                // Capture user.id in closure to avoid scope issues
                var userId = currentUserForReviews.id;
                (async function(userId) {
                    try {
                        console.log('Loading reviews for user ID:', userId);
                        const response = await reviewsAPI.get(userId);
                    console.log('Reviews API response:', response);
                    
                    var rating = 0;
                    var reviews = 0;
                    
                    if (response.success && response.data) {
                        rating = response.data.rating.average || 0;
                        reviews = response.data.rating.count || 0;
                        console.log('Rating:', rating, 'Reviews:', reviews);
                    } else {
                        console.warn('No rating data from API, using defaults');
                    }
                    
                    // Update rating display
                    var profileRating = document.getElementById('profileRating');
                    if (profileRating) {
                        profileRating.textContent = rating.toFixed(1);
                        console.log('Updated profileRating to:', rating.toFixed(1));
                    } else {
                        console.warn('profileRating element not found!');
                    }
                    
                    // Update reviews count and make it clickable
                    var profileReviews = document.getElementById('profileReviews');
                    if (profileReviews) {
                        var reviewsText = reviews === 0 ? '(no reviews yet)' : '(' + reviews + ' review' + (reviews !== 1 ? 's' : '') + ')';
                        profileReviews.textContent = reviewsText;
                        profileReviews.style.cursor = reviews > 0 ? 'pointer' : 'default';
                        profileReviews.style.textDecoration = reviews > 0 ? 'underline' : 'none';
                        profileReviews.style.color = reviews > 0 ? '#3b82f6' : 'inherit';
                        profileReviews.onclick = reviews > 0 ? function() { openMyReviewsModal(userId); } : null;
                        console.log('Updated profileReviews to:', reviewsText);
                    } else {
                        console.warn('profileReviews element not found!');
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
                        console.log('Updated stars for rating:', roundedRating);
                    } else {
                        console.warn('profileStars element not found!');
                    }
                } catch (error) {
                    console.error('Error loading user rating:', error);
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
                console.warn('No user ID available for loading reviews');
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
        

        // Items data (same as in Test.html)
        const allItems = [
            {
                id: 1,
                title: "Financial Accounting Textbook",
                type: "donation",
                user: "Marie L.",
                department: "Finance",
                image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop",
                time: "2h",
                description: "Book in good condition, some pencil annotations",
                color: "linear-gradient(135deg, #60a5fa, #3b82f6)",
                large: true,
                rating: 4.8,
                reviews: 24
            },
            {
                id: 2,
                title: "Business Calculator",
                type: "exchange",
                user: "Thomas K.",
                department: "Accounting",
                image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&h=400&fit=crop",
                time: "5h",
                description: "Exchange for scientific calculator",
                color: "linear-gradient(135deg, #fb923c, #f97316)",
                rating: 4.5,
                reviews: 18
            },
            {
                id: 3,
                title: "Microeconomics Notes",
                type: "donation",
                user: "Sophie M.",
                department: "Marketing",
                image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=400&fit=crop",
                time: "1d",
                description: "Complete semester notes",
                color: "linear-gradient(135deg, #c084fc, #a855f7)",
                tall: true,
                rating: 5.0,
                reviews: 32
            },
            {
                id: 4,
                title: "Professional Briefcase",
                type: "donatio",
                user: "Alex B.",
                department: "Management",
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
                time: "1d",
                description: "Almost new, small repair",
                color: "linear-gradient(135deg, #4ade80, #22c55e)",
                rating: 4.2,
                reviews: 15
            },
            {
                id: 5,
                title: "Business Strategy Manual",
                type: "donation",
                user: "Lucas D.",
                department: "International Business",
                image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop",
                time: "2d",
                description: "Manual with solved exercises",
                color: "linear-gradient(135deg, #818cf8, #6366f1)",
                rating: 4.7,
                reviews: 28
            },
            {
                id: 6,
                title: "LED Desk Lamp",
                type: "exchange",
                user: "Emma R.",
                department: "Digital Marketing",
                image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
                time: "3d",
                description: "Exchange for storage",
                color: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                rating: 4.9,
                reviews: 21
            }
        ];

        // My posted items (different from main page items)
        const myPostedItems = [
            {
                id: 101,
                title: "Corporate Finance Textbook",
                type: "donation",
                image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=400&fit=crop",
                time: "3h",
                department: "Finance"
            },
            {
                id: 102,
                title: "Financial Modeling Guide",
                type: "donation",
                image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop",
                time: "1d",
                department: "Finance"
            },
            {
                id: 103,
                title: "Business Laptop Bag",
                type: "exchange",
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
                time: "2d",
                department: "Finance"
            }
        ];

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
                    allPostedItems = myItemsData.data;
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
                postedItemsContainer.innerHTML = ''; // Clear loading message
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
                        '<div class="item-type ' + typeClass + '">' + typeText + '</div>' +
                                '<h3>' + item.title + '</h3>' +
                                '<p class="item-time" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || 'just now')) + '</p>' +
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

        async function deletePostedItem(event, itemId, isStatic) {
            event.stopPropagation();
            
            try {
                // Delete item via API
                const response = await itemsAPI.delete(itemId);
                
                if (response.success) {
                    showToast('Item deleted successfully!');
                    // Reload items
                    await loadPostedItems();
            } else {
                    throw new Error(response.message || 'Failed to delete item');
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                showToast('Error deleting item. Please try again.');
            }
        }

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
                        '<h3>No interested items yet</h3>' +
                        '<p>Items you mark as interested will appear here</p>' +
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
                        window.location.href = 'Test.html';
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
                        '<h3>Error loading items</h3>' +
                        '<p>Please try again later</p>' +
                    '</div>';
            }
        }

        async function deleteInterestedItem(event, itemId) {
            event.stopPropagation();
            
            try {
                const response = await interestedAPI.remove(itemId);
                
                if (response.success) {
            showToast('Item removed from interested list!');
                    await loadInterestedItems();
                } else {
                    throw new Error(response.message || 'Failed to remove item');
                }
            } catch (error) {
                console.error('Error deleting interested item:', error);
                showToast('Error removing item. Please try again.');
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
                        loadPostedItems();
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
                loadPostedItems();
            } else if (tabName === 'messages') {
                loadMessages();
            } else if (tabName === 'history') {
                loadHistory();
            }
            }
        }

        async function loadMessages() {
            console.log('=== loadMessages() called ===');
            var messagesList = document.getElementById('messagesList');
            if (!messagesList) {
                console.error('messagesList element not found!');
                return;
            }
            messagesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading...</div>';
            
            try {
                console.log('Fetching conversations from API...');
                const response = await messagesAPI.getAll();
                console.log('API response:', response);
                console.log('API response success:', response.success);
                console.log('API response data:', response.data);
                
                if (!response.success || !response.data) {
                    console.error('Invalid response:', response);
                    alert('Invalid response: ' + JSON.stringify(response));
                    throw new Error(response.message || 'Failed to load messages');
                }
                
                var userMessages = response.data;
                console.log('Total conversations received:', userMessages.length);
                console.log('All conversations:', JSON.stringify(userMessages, null, 2));
                
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
                console.log('After deduplication:', deduplicatedMessages.length, 'conversations');
                
                // Keep only pending and accepted in the main list; move completed/rejected/cancelled to history
                var activeMessages = deduplicatedMessages.filter(function(conversation) {
                    var status = String(conversation.status || 'pending').toLowerCase().trim();
                    var isActive = status === 'pending' || status === 'accepted';
                    console.log('Filtering conversation ID:', conversation.id, 'dbId:', conversation.dbId, '- status:', status, '- isActive:', isActive);
                    if (!isActive) {
                        console.log('FILTERED OUT TO HISTORY:', conversation.id, 'dbId:', conversation.dbId, 'with status:', status);
                    }
                    return isActive;
                });
                
                console.log('=== FILTERING RESULTS ===');
                console.log('Total conversations (after dedup):', deduplicatedMessages.length);
                console.log('Pending conversations (active):', activeMessages.length);
                console.log('Filtered out:', deduplicatedMessages.length - activeMessages.length);
                console.log('Active messages:', JSON.stringify(activeMessages, null, 2));
            
            if (activeMessages.length === 0) {
                messagesList.classList.remove('has-items');
                messagesList.innerHTML = 
                    '<div class="empty-state">' +
                        '<h3>No request yet</h3>' +
                        '<p>Your requests will appear here</p>' +
                    '</div>';
            } else {
                messagesList.classList.add('has-items');
                messagesList.innerHTML = ''; // Clear loading message
                activeMessages.forEach(function(conversation) {
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
                                '<div class="request-user-avatar" style="background: ' + itemColor + ';">' + otherUserInitials + '</div>' +
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
                });
                }
            } catch (error) {
                console.error('Error loading messages:', error);
                messagesList.classList.remove('has-items');
                messagesList.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">⚠️</div>' +
                        '<h3>Error loading messages</h3>' +
                        '<p>Please try again later</p>' +
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
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return minutes + 'm ago';
            if (hours < 24) return hours + 'h ago';
            if (days < 7) return days + 'd ago';
            return date.toLocaleDateString();
        }

        var currentConversation = null;

        async function openConversation(conversation) {
            currentConversation = conversation;
            var currentUser = getCurrentUserSync();
            
            // Close existing modal if any
            var existingModal = document.getElementById('conversationModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Get conversation details from API
            try {
                // Use the formatted ID (conv_itemId_userId) for API calls, not dbId
                var convId = conversation.id || (conversation.dbId ? 'conv_' + conversation.itemId + '_' + (conversation.isOwner ? conversation.requesterId : conversation.ownerId) : null);
                if (!convId) {
                    throw new Error('Invalid conversation ID');
                }
                const response = await conversationsAPI.get(convId);
                
                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to load conversation');
                }
                
                var convData = response.data;
                var conversationData = convData.conversation;
                var messages = convData.messages;
                
                // Update current conversation with full data
                // Keep the original formatted ID for future API calls
                currentConversation = {
                    ...conversation,
                    ...conversationData,
                    id: conversation.id || conversationData.id, // Keep formatted ID for API calls
                    dbId: conversationData.dbId || conversation.dbId, // Store dbId explicitly
                    messages: messages
                };
            
            // Create conversation modal
            var modal = document.createElement('div');
            modal.className = 'conversation-modal';
            modal.id = 'conversationModal';
                
                var otherUser = conversationData.otherUser || (conversationData.isOwner ? conversationData.requester : conversationData.owner);
                var isOwner = conversationData.isOwner;
                
            modal.innerHTML = 
                '<div class="conversation-content">' +
                    '<div style="display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 1rem;">' +
                        '<button class="modal-close" onclick="closeConversation()" style="margin: 0;">✕</button>' +
                    '</div>' +
                    '<div class="conversation-header" style="position: relative;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
                            '<div style="flex: 1;">' +
                                '<h2 style="margin-bottom: 0.5rem;">' + conversationData.itemTitle + '</h2>' +
                                '<p style="color: #9ca3af; font-size: 0.875rem;">' + 
                                    (isOwner ? 'Request from: ' : 'To: ') + otherUser +
                                '</p>' +
                            '</div>' +
                            '<button class="modal-delete" onclick="deleteConversation()" style="background: red; border: 3px;margin-right: -6px; border-radius: 50%; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 0.25rem; margin-top: 20px; opacity: 0.7; transition: opacity 0.2s; align-self: flex-start;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.7\'" title="Delete conversation">🗑️</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="conversation-messages" id="conversationMessages"></div>' +
                    '<div class="conversation-actions" id="conversationActions"></div>' +
                    '<div class="conversation-input-container">' +
                            '<input type="text" class="conversation-input" id="conversationInput" placeholder="Type a message..." onkeypress="if(event.key===\'Enter\') sendConversationMessage()">' +
                            '<button class="conversation-send" onclick="sendConversationMessage()">Send</button>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(modal);
            modal.classList.add('active');
            
            // Close modal when clicking outside (on backdrop)
            modal.addEventListener('click', function(event) {
                if (event.target === modal) {
                    closeConversation();
                }
            });
            
                loadConversationMessages(currentConversation);
                await loadConversationActions(currentConversation);
            } catch (error) {
                console.error('Error opening conversation:', error);
                showToast('Error loading conversation. Please try again.');
            }
        }

        function closeConversation() {
            var modal = document.getElementById('conversationModal');
            if (modal) {
                modal.remove();
            }
            currentConversation = null;
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
            
            messages.forEach(function(message) {
                var messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + (message.from === currentUser.name ? 'message-sent' : 'message-received');
                var timestamp = message.timestamp || message.created_at || new Date().toISOString();
                messageDiv.innerHTML = 
                    '<div class="message-content">' +
                        '<p>' + message.text + '</p>' +
                        '<span class="message-time">' + formatDate(timestamp) + '</span>' +
                    '</div>';
                messagesContainer.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            setTimeout(function() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }

        async function loadConversationActions(conversation) {
            var actionsContainer = document.getElementById('conversationActions');
            if (!actionsContainer) return;
            actionsContainer.innerHTML = '';
            
            var currentUser = getCurrentUserSync();
            var isOwner = conversation.isOwner || (conversation.owner === currentUser.name);
            
            if (isOwner && conversation.status === 'pending') {
                actionsContainer.innerHTML = 
                    '<div class="conversation-buttons">' +
                        '<button class="btn-accept" onclick="acceptRequest()">Accept Request</button>' +
                        '<button class="btn-reject" onclick="rejectRequest()">Reject</button>' +
                    '</div>';
            } else if (conversation.status === 'accepted' && !isOwner) {
                actionsContainer.innerHTML = 
                    '<div class="conversation-buttons">' +
                        '<button class="btn-confirm" onclick="confirmReceived()">Confirm Item Received</button>' +
                    '</div>';
            } else if (conversation.status === 'completed' && !isOwner) {
                // Check if user has already left a review for this specific conversation
                // Use dbId (database ID) if available, otherwise use id
                var conversationId = conversation.dbId || conversation.id || null;
                var hasAlreadyReviewed = false;
                
                if (conversationId && currentUser.id) {
                    try {
                        var ownerId = conversation.ownerId || null;
                        if (ownerId) {
                            const reviewsResponse = await reviewsAPI.get(ownerId);
                            if (reviewsResponse.success && reviewsResponse.data && reviewsResponse.data.reviews) {
                                // Check if current user has already reviewed this specific conversation
                                hasAlreadyReviewed = reviewsResponse.data.reviews.some(function(review) {
                                    // Compare conversation IDs (both should be database IDs)
                                    var reviewConvId = review.conversationId;
                                    return review.reviewerId === currentUser.id && 
                                           reviewConvId && 
                                           reviewConvId === conversationId;
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error checking existing review:', error);
                        // If error, show button anyway (API will prevent duplicate)
                    }
                }
                
                if (!hasAlreadyReviewed) {
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
                showToast('Error reloading conversation. Please try again.');
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
                showToast('Error sending message. Please try again.');
            }
        }

        async function acceptRequest() {
            if (!currentConversation) return;
            
            try {
                var conversationId = currentConversation.id;
                const response = await conversationsAPI.updateStatus(conversationId, 'accepted');
                
                if (response.success) {
            showToast('Request accepted! Item will be removed from feed.');
                    currentConversation.status = 'accepted';
                    await loadConversationActions(currentConversation);
                    await loadMessages();
                } else {
                    throw new Error(response.message || 'Failed to accept request');
                }
            } catch (error) {
                console.error('Error accepting request:', error);
                showToast('Error accepting request. Please try again.');
            }
        }

        async function rejectRequest() {
            if (!currentConversation) return;
            
            if (!confirm('Are you sure you want to reject this request?')) return;
            
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

    function showDeleteConfirmationModal() {
        if (!currentConversation) return;
        
        // Create modal backdrop
        var modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        // Create modal content
        var modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
        
        modalContent.innerHTML = 
            '<h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">Delete Conversation</h3>' +
            '<p style="margin: 0 0 1.5rem 0; color: #6b7280; line-height: 1.6;">Are you sure you want to delete this conversation? This will only hide it for you. The other person will still be able to see it.</p>' +
            '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
                '<button id="cancelDeleteBtn" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; border-radius: 8px; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'">Cancel</button>' +
                '<button id="confirmDeleteBtn" style="padding: 0.75rem 1.5rem; border: none; background: #ef4444; border-radius: 8px; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">Delete</button>' +
            '</div>';
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Cancel button
        document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
            modal.remove();
        });
        
        // Confirm button
        document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
            modal.remove();
            await confirmDeleteConversation();
        });
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
    
    async function deleteConversation() {
        showDeleteConfirmationModal();
    }
    
    // Alias for backward compatibility
    async function deleteConversationForUser() {
        return deleteConversation();
    }
    
    // Open modal to display reviews received by the user
    async function openMyReviewsModal(userId) {
        try {
            // Get current user to check if viewing own reviews
            var currentUser = getCurrentUserSync();
            if (!currentUser || !currentUser.id) {
                showToast('Please log in to view reviews');
                return;
            }
            
            // Load reviews
            const response = await reviewsAPI.get(userId);
            
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
            modalContent.style.cssText = 'background: white; border-radius: 12px; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            
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
                        ? '<img src="' + review.reviewerAvatar + '" alt="' + review.reviewer + '" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">'
                        : '<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + (review.reviewer ? review.reviewer.charAt(0).toUpperCase() : 'U') + '</div>';
                    
                    reviewsHTML += 
                        '<div style="border-bottom: 1px solid #e5e7eb; padding: 1.5rem 0;">' +
                            '<div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">' +
                                reviewerAvatar +
                                '<div style="flex: 1;">' +
                                    '<div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">' + (review.reviewer || 'Anonymous') + '</div>' +
                                    '<div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">' + review.date + '</div>' +
                                    '<div style="margin-bottom: 0.5rem;">' + starsHTML + '</div>' +
                                '</div>' +
                            '</div>' +
                            (review.text ? '<p style="color: #374151; line-height: 1.6; margin: 0;">' + review.text + '</p>' : '') +
                        '</div>';
                });
            }
            
            modalContent.innerHTML = 
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">' +
                    '<h2 style="margin: 0; color: #1f2937; font-size: 1.5rem; font-weight: 600;">My Reviews</h2>' +
                    '<button onclick="closeMyReviewsModal()" style="background: none; border: none; font-size: 1.5rem; color: #6b7280; cursor: pointer; padding: 0.25rem 0.5rem; line-height: 1;">✕</button>' +
                '</div>' +
                '<div style="background: #f9fafb; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">' +
                    '<div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 0.25rem;">' + rating.average.toFixed(1) + '</div>' +
                    '<div style="color: #6b7280; font-size: 0.875rem;">' + rating.count + ' review' + (rating.count !== 1 ? 's' : '') + '</div>' +
                '</div>' +
                '<div>' + reviewsHTML + '</div>';
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
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
            // Use dbId (database ID) if available, otherwise use id
            // Make sure we get a numeric ID, not a formatted string like 'conv_5_3'
            reviewConversationId = currentConversation.dbId || 
                                   (typeof currentConversation.id === 'number' ? currentConversation.id : null) ||
                                   null;
            
            // Debug log
            console.log('Review modal - currentConversation:', currentConversation);
            console.log('Review modal - reviewConversationId:', reviewConversationId);
            console.log('Review modal - reviewedUserId:', reviewedUserId);
            
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
                }
            }, 100);
        }

        function closeReviewModal() {
            var modal = document.getElementById('reviewModal');
            if (modal) {
                modal.classList.remove('active');
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
            // Debug log
            console.log('Submit review - reviewedUserId:', reviewedUserId);
            console.log('Submit review - reviewConversationId:', reviewConversationId);
            console.log('Submit review - selectedRating:', selectedRating);
            
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
                console.log('Calling reviewsAPI.create with:', {
                    reviewedUserId: reviewedUserId,
                    conversationId: reviewConversationId,
                    rating: selectedRating,
                    reviewText: reviewText
                });
                const response = await reviewsAPI.create(reviewedUserId, reviewConversationId, selectedRating, reviewText);
                
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
                // Show completed, accepted, rejected, and cancelled conversations in history
                var historyConversations = conversations.filter(function(conv) {
                    var status = String(conv.status || '').toLowerCase().trim();
                    return status === 'completed' || status === 'accepted' || status === 'rejected' || status === 'cancelled';
                });
                
                if (historyConversations.length === 0) {
                    historyContainer.classList.remove('has-items');
                    historyContainer.innerHTML =
                        '<div class="empty-state">' +    
                            '<h3>No history yet</h3>' +
                            '<p>Your completed exchanges will appear here</p>' +
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
                                    '<div class="request-user-avatar" style="background: ' + itemColor + ';">' + otherUserInitials + '</div>' +
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
            console.log('Profile updated event received:', event.detail);
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
            console.log('Privacy setting updated event received:', event.detail);
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
                console.log('Profile was updated, refreshing...');
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
            // Silently catch to prevent console errors, redirect is already happening
            console.log('Redirecting to login...');
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
            console.log('Profile page loaded');
            
            // Check authentication first
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                return; // Redirect already happened
            }
            
            // Check if profile was just updated (from settings page)
            var profileJustUpdated = sessionStorage.getItem('userProfileJustUpdated');
            console.log('Profile just updated?', profileJustUpdated);
            if (profileJustUpdated === 'true') {
                // Get updated data from sessionStorage
                var updatedUserData = sessionStorage.getItem('updatedUserData');
                if (updatedUserData) {
                    try {
                        var updatedUser = JSON.parse(updatedUserData);
                        console.log('Loading updated user from sessionStorage:', updatedUser);
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        sessionStorage.removeItem('userProfileJustUpdated');
                        sessionStorage.removeItem('updatedUserData');
                    } catch (e) {
                        console.error('Error parsing updated user data:', e);
                    }
                }
            }
            
            // Force refresh user data from API first - but only after auth check passed
            console.log('Forcing refresh from API...');
            
            // Clear localStorage first to force fresh API call
            localStorage.removeItem('currentUser');
            await getCurrentUser(true);
            
            // If profile was just updated, use sessionStorage data (more recent than API)
            if (profileJustUpdated === 'true') {
                var updatedUserData = sessionStorage.getItem('updatedUserData');
                if (updatedUserData) {
                    try {
                        var updatedUser = JSON.parse(updatedUserData);
                        console.log('Using updated user from sessionStorage:', updatedUser);
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    } catch (e) {
                        console.error('Error parsing updated user data:', e);
                    }
                }
            }
            
            console.log('Loading user profile...');
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

        // Load user profile on page load (already handled in window.addEventListener('load'))
