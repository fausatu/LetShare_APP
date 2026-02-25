// Modals Management
// ================

// Import dependencies (these will be available globally from other modules)
// formatTimeAgo, showToast from utils.js
// t from translations.js
// getCurrentUserSync from auth.js
// reviewsAPI, messagesAPI from api.js

// Current item being viewed in modal
var currentItem = null;

// Image carousel state
var currentImageIndex = 0;
var modalImages = [];

// User reviews - reviews are per user, not per item
const userReviews = {
    "Marie L.": {
        rating: 4.8,
        reviews: [
            { user: "John D.", rating: 5, date: "2 weeks ago", text: "So generous! Marie helped me with textbooks and always responds quickly. True student solidarity!" },
            { user: "Sarah M.", rating: 5, date: "1 month ago", text: "Excellent communication and very reliable. Marie is always ready to help fellow students. Highly recommend!" },
            { user: "Mike T.", rating: 4, date: "1 month ago", text: "Great person, very supportive. Sometimes takes a bit to respond but always acts in good faith." },
            { user: "Alex P.", rating: 5, date: "2 months ago", text: "Amazing person! Very helpful and honest. Student mutual aid at its best!" },
            { user: "Emma R.", rating: 4, date: "2 months ago", text: "Great communication and punctual. Descriptions always match reality." }
        ]
    },
    "Thomas K.": {
        rating: 4.5,
        reviews: [
            { user: "Lisa P.", rating: 5, date: "3 weeks ago", text: "Very fair exchange! Thomas is easy to reach and the exchange went smoothly. Great classmate!" },
            { user: "David R.", rating: 4, date: "1 month ago", text: "Reliable person for exchanges. Always acts in good faith and ready to help." },
            { user: "Sophie M.", rating: 5, date: "2 months ago", text: "Excellent exchange partner! Very satisfied with all our interactions. Highly recommend!" }
        ]
    },
    "Sophie M.": {
        rating: 5.0,
        reviews: [
            { user: "Emma W.", rating: 5, date: "1 week ago", text: "The best! Sophie always shares quality materials and is super organized. A real help for students!" },
            { user: "James K.", rating: 5, date: "2 weeks ago", text: "Sophie is amazing! Very generous and always willing to help. A wonderful person in our community!" },
            { user: "Olivia B.", rating: 5, date: "3 weeks ago", text: "Perfect! Very detailed, helpful and always quality. Student mutual aid at its best!" },
            { user: "Noah T.", rating: 5, date: "1 month ago", text: "Excellent person! Very reliable and always goes the extra mile to help classmates." }
        ]
    },
    "Alex B.": {
        rating: 4.2,
        reviews: [
            { user: "Robert H.", rating: 4, date: "2 weeks ago", text: "Good person, descriptions are usually accurate. Communication could be better sometimes." },
            { user: "Anna L.", rating: 5, date: "3 weeks ago", text: "Very reliable and professional. Great to work with in the spirit of mutual aid!" },
            { user: "Tom F.", rating: 4, date: "1 month ago", text: "Decent person, fair exchanges. Items are generally in good condition." }
        ]
    },
    "Lucas D.": {
        rating: 4.7,
        reviews: [
            { user: "Chris M.", rating: 5, date: "1 week ago", text: "Excellent! Lucas is very knowledgeable and always shares great study materials. A real support!" },
            { user: "Nina S.", rating: 4, date: "2 weeks ago", text: "Good person, reliable and helpful. Materials are well-organized." },
            { user: "Tom F.", rating: 5, date: "3 weeks ago", text: "Great person! Very helpful and always shares quality materials." },
            { user: "Sarah K.", rating: 5, date: "1 month ago", text: "Fantastic! Very organized and always keeps promises. Perfect student mutual aid!" }
        ]
    },
    "Emma R.": {
        rating: 4.9,
        reviews: [
            { user: "Paul G.", rating: 5, date: "1 week ago", text: "Perfect exchange partner! Emma is very fair and easy to contact. Smooth exchanges every time!" },
            { user: "Maya K.", rating: 5, date: "2 weeks ago", text: "Excellent person to exchange with! Very reliable and always satisfied with our exchanges." },
            { user: "John D.", rating: 4, date: "3 weeks ago", text: "Good partner, fair exchanges. Items are usually in good condition." }
        ]
    }
};

// Item Detail Modal
async function openModal(item) {
    currentItem = item;
    currentImageIndex = 0;
    
    modalImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
    
    // Display images in carousel
    var carouselContainer = document.getElementById('carouselImages');
    var indicatorsContainer = document.getElementById('carouselIndicators');
    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');
    
    if (carouselContainer) {
        carouselContainer.innerHTML = '';
        
        if (modalImages.length === 0) {
            carouselContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #9ca3af;">No image available</div>';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (indicatorsContainer) indicatorsContainer.innerHTML = '';
        } else {
            // Display all images
            modalImages.forEach(function(imgUrl, index) {
                var imgDiv = document.createElement('div');
                imgDiv.className = 'carousel-image' + (index === 0 ? ' active' : '');
                imgDiv.style.display = index === 0 ? 'block' : 'none';
                var img = document.createElement('img');
                img.src = imgUrl;
                img.alt = item.title + ' - Image ' + (index + 1);
                img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 1.5rem;';
                img.onerror = function() {
                    imgDiv.style.display = 'none';
                };
                imgDiv.appendChild(img);
                carouselContainer.appendChild(imgDiv);
            });
            
            // Show/hide navigation buttons
            if (prevBtn) prevBtn.style.display = modalImages.length > 1 ? 'flex' : 'none';
            if (nextBtn) nextBtn.style.display = modalImages.length > 1 ? 'flex' : 'none';
            
            // Create indicators
            if (indicatorsContainer) {
                indicatorsContainer.innerHTML = '';
                if (modalImages.length > 1) {
                    modalImages.forEach(function(img, index) {
                        var indicator = document.createElement('span');
                        indicator.className = 'carousel-indicator' + (index === 0 ? ' active' : '');
                        indicator.onclick = function() {
                            currentImageIndex = index;
                            updateCarousel();
                        };
                        indicatorsContainer.appendChild(indicator);
                    });
                }
            }
        }
    }
    
    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalDesc').textContent = item.description;
    
    // Major / department (fallback if empty)
    var modalDepartmentEl = document.getElementById('modalDepartment');
    if (modalDepartmentEl) {
        // Try item.department first, then user_department as fallback
        var dept = (item.department && item.department.trim()) || (item.user_department && item.user_department.trim()) || '';
        if (!dept || dept.trim() === '') {
            modalDepartmentEl.textContent = 'Not specified';
        } else {
            modalDepartmentEl.textContent = dept;
        }
    }
    var modalTimeEl = document.getElementById('modalTime');
    if (modalTimeEl) {
        if (item.created_at) {
            modalTimeEl.setAttribute('data-created-at', item.created_at);
            modalTimeEl.textContent = formatTimeAgo(item.created_at);
        } else {
            modalTimeEl.textContent = item.time;
        }
    }
    
    // User profile info (avatar + initials)
    var userInitials = item.user.split(' ').map(function(n) { return n[0]; }).join('');
    var userAvatar = document.getElementById('modalUserAvatar');
    
    if (userAvatar) {
        // Reset content
        userAvatar.innerHTML = '';
        
        if (item.user_avatar) {
            // Show profile picture
            userAvatar.classList.add('has-image');
            var img = document.createElement('img');
            img.src = item.user_avatar;
            img.alt = item.user;
            img.onerror = function() {
                // Fallback to initials if image fails
                userAvatar.classList.remove('has-image');
                userAvatar.textContent = userInitials;
                userAvatar.style.background = item.color;
            };
            userAvatar.appendChild(img);
        } else {
            // Fallback: initials with colored background
            userAvatar.classList.remove('has-image');
            userAvatar.textContent = userInitials;
            userAvatar.style.background = item.color;
        }
    }
    
    document.getElementById('modalUserName').textContent = item.user;
    
    // Display university if available
    var modalUniversity = document.getElementById('modalUniversity');
    var modalUniversityLogo = document.getElementById('modalUniversityLogo');
    var modalUniversityName = document.getElementById('modalUniversityName');
    
    if (modalUniversity && modalUniversityLogo && modalUniversityName) {
        if (item.university_name) {
            modalUniversity.style.display = 'flex';
            modalUniversityName.textContent = item.university_name;
            
            if (item.university_logo) {
                modalUniversityLogo.src = item.university_logo;
                modalUniversityLogo.style.display = 'block';
            } else {
                modalUniversityLogo.style.display = 'none';
            }
        } else {
            modalUniversity.style.display = 'none';
        }
    }
    
    // Check if user already sent a request for this item
    var btnContact = document.getElementById('btnContact');
    
    // Reset button state first
    if (btnContact) {
        btnContact.disabled = false;
        btnContact.style.opacity = '1';
        btnContact.style.cursor = 'pointer';
        btnContact.onclick = requestItem; // Restore onclick handler
        btnContact.removeAttribute('disabled');
    }
    
    // Check for existing request
    var hasExistingRequest = await checkExistingRequest(item.id);
    
    if (hasExistingRequest) {
        if (btnContact) {
            btnContact.textContent = t('requestAlreadySent') || 'Request Already Sent';
            btnContact.disabled = true;
            btnContact.style.opacity = '0.6';
            btnContact.style.cursor = 'not-allowed';
            btnContact.onclick = null; // Remove onclick handler
            btnContact.setAttribute('disabled', 'disabled');
        }
    } else {
        if (btnContact) {
            btnContact.textContent = t('iWantThis');
        }
    }
    
    // Rating and stars - fetch from API if userId is available
    var rating = 0;
    var reviews = 0;
    
    if (item.userId) {
        // Fetch rating from API
        (async function() {
            try {
                const response = await reviewsAPI.get(item.userId);
                if (response.success && response.data) {
                    rating = response.data.rating.average || 0;
                    reviews = response.data.rating.count || 0;
                } else {
                    // Fallback to static data
                    var userReviewData = userReviews[item.user];
                    rating = userReviewData ? userReviewData.rating : 0;
                    reviews = userReviewData && userReviewData.reviews ? userReviewData.reviews.length : 0;
                }
            } catch (error) {
                console.error('Error loading rating:', error);
                // Fallback to static data
                var userReviewData = userReviews[item.user];
                rating = userReviewData ? userReviewData.rating : 0;
                reviews = userReviewData && userReviewData.reviews ? userReviewData.reviews.length : 0;
            }
            
            document.getElementById('modalRating').textContent = rating.toFixed(1);
            document.getElementById('modalReviews').textContent = '(' + reviews + ' review' + (reviews !== 1 ? 's' : '') + ')';
            
            // Generate stars
            var starsContainer = document.getElementById('modalStars');
            starsContainer.innerHTML = '';
            for (var i = 1; i <= 5; i++) {
                var star = document.createElement('span');
                star.className = 'star' + (i <= Math.round(rating) ? '' : ' empty');
                star.textContent = '★';
                starsContainer.appendChild(star);
            }
        })();
    } else {
        // Fallback to static data if no userId
        var userReviewData = userReviews[item.user];
        rating = userReviewData ? userReviewData.rating : (item.rating || 0);
        reviews = userReviewData && userReviewData.reviews ? userReviewData.reviews.length : 0;
        document.getElementById('modalRating').textContent = rating.toFixed(1);
        document.getElementById('modalReviews').textContent = '(' + reviews + ' review' + (reviews !== 1 ? 's' : '') + ')';
        
        // Generate stars
        var starsContainer = document.getElementById('modalStars');
        starsContainer.innerHTML = '';
        for (var i = 1; i <= 5; i++) {
            var star = document.createElement('span');
            star.className = 'star' + (i <= Math.round(rating) ? '' : ' empty');
            star.textContent = '★';
            starsContainer.appendChild(star);
        }
    }
    
    // Open the modal
    document.getElementById('modal').classList.add('active');
    document.body.classList.add('modal-open');
    
    // Translate modal content if needed
    var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
    var currentUser = getCurrentUserSync ? getCurrentUserSync() : null;
    var isAuthor = currentUser && currentUser.id && item.user_id && currentUser.id === item.user_id;
    
    // Always translate for non-authors (Google Translate detects source language automatically)
    if (!isAuthor) {
        // Translate title
        if (item.title) {
            autoTranslateText(item.title, userLang).then(function(translated) {
                if (translated && translated !== item.title) {
                    document.getElementById('modalTitle').textContent = translated;
                }
            }).catch(function(error) {
                console.warn('[openModal] Title translation failed:', error);
            });
        }
        
        // Translate description
        if (item.description) {
            autoTranslateText(item.description, userLang).then(function(translated) {
                if (translated && translated !== item.description) {
                    document.getElementById('modalDesc').textContent = translated;
                }
            }).catch(function(error) {
                console.warn('[openModal] Description translation failed:', error);
            });
        }
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

// Carousel navigation functions
function changeImage(direction) {
    if (modalImages.length <= 1) return;
    
    currentImageIndex += direction;
    if (currentImageIndex < 0) {
        currentImageIndex = modalImages.length - 1;
    } else if (currentImageIndex >= modalImages.length) {
        currentImageIndex = 0;
    }
    
    updateCarousel();
}

function updateCarousel() {
    var carouselImages = document.querySelectorAll('.carousel-image');
    var indicators = document.querySelectorAll('.carousel-indicator');
    
    carouselImages.forEach(function(imgDiv, index) {
        if (index === currentImageIndex) {
            imgDiv.classList.add('active');
            imgDiv.style.display = 'block';
        } else {
            imgDiv.classList.remove('active');
            imgDiv.style.display = 'none';
        }
    });
    
    indicators.forEach(function(indicator, index) {
        if (index === currentImageIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Reviews Modal
async function openReviewsModal() {
    if (!currentItem) return;
    
    var reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div style="text-align: center; padding: 2rem; color:rgb(16, 66, 154);">Loading reviews...</div>';
    
    try {
        // Get user ID from item
        var itemUserId = currentItem.userId || currentItem.user_id;
        
        if (!itemUserId) {
            console.error('No userId found in currentItem:', currentItem);
            reviewsList.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">Error: User information not available.</p>';
            document.getElementById('reviewsModal').classList.add('active');
            document.body.classList.add('modal-open');
            return;
        }
        
        const response = await reviewsAPI.get(itemUserId);
        
        if (response.success && response.data) {
            var reviews = response.data.reviews || [];
            reviewsList.innerHTML = '';
            
            if (reviews.length === 0) {
                reviewsList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 2rem;">No reviews yet for ' + currentItem.user + '.</p>';
            } else {
                reviews.forEach(function(review) {
                    var reviewDiv = document.createElement('div');
                    reviewDiv.className = 'review-item';
                    
                    var starsHtml = '';
                    for (var i = 1; i <= 5; i++) {
                        starsHtml += '<span class="star' + (i <= review.rating ? '' : ' empty') + '">★</span>';
                    }
                    
                    // Get reviewer initials for avatar
                    var reviewerName = review.reviewer || 'User';
                    var reviewerInitials = reviewerName.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
                    
                    // Build review header with avatar (image or initials)
                    var headerDiv = document.createElement('div');
                    headerDiv.className = 'review-header';
                    
                    var userWrapper = document.createElement('div');
                    userWrapper.className = 'review-user';
                    userWrapper.style.display = 'flex';
                    userWrapper.style.alignItems = 'center';
                    userWrapper.style.gap = '0.75rem';
                    
                    var avatarDiv = document.createElement('div');
                    avatarDiv.className = 'user-avatar';
                    avatarDiv.style.flexShrink = '0';
                    
                    // Use reviewer_avatar if available (backend can send it later)
                    if (review.reviewer_avatar) {
                        avatarDiv.classList.add('has-image');
                        var img = document.createElement('img');
                        img.src = review.reviewer_avatar;
                        img.alt = reviewerName;
                        img.onerror = function() {
                            avatarDiv.classList.remove('has-image');
                            avatarDiv.textContent = reviewerInitials;
                        };
                        avatarDiv.appendChild(img);
                    } else {
                        avatarDiv.textContent = reviewerInitials;
                        // Same style as other initials avatars: solid green background + white text
                        avatarDiv.style.background = '#1a4109';
                        avatarDiv.style.color = '#ffffff';
                    }
                    
                    var nameSpan = document.createElement('span');
                    nameSpan.textContent = reviewerName;
                    
                    userWrapper.appendChild(avatarDiv);
                    userWrapper.appendChild(nameSpan);
                    
                    var dateDiv = document.createElement('div');
                    dateDiv.className = 'review-date';
                    dateDiv.textContent = review.date;
                    
                    headerDiv.appendChild(userWrapper);
                    headerDiv.appendChild(dateDiv);
                    
                    var starsDiv = document.createElement('div');
                    starsDiv.className = 'review-stars';
                    starsDiv.innerHTML = starsHtml;
                    
                    var textDiv = document.createElement('div');
                    textDiv.className = 'review-text';
                    textDiv.textContent = review.text || '';
                    
                    reviewDiv.appendChild(headerDiv);
                    reviewDiv.appendChild(starsDiv);
                    reviewDiv.appendChild(textDiv);
                    
                    reviewsList.appendChild(reviewDiv);
                });
            }
        } else {
            throw new Error(response.message || 'Failed to load reviews');
        }
        
        document.getElementById('reviewsModal').classList.add('active');
        document.body.classList.add('modal-open');
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">Error loading reviews. Please try again.</p>';
        document.getElementById('reviewsModal').classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeReviewsModal() {
    document.getElementById('reviewsModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

// Request Modal
function openRequestModal() {
    if (!currentItem) return;
    document.getElementById('requestUserName').textContent = currentItem.user;
    document.getElementById('requestModal').classList.add('active');
}

function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('active');
    document.getElementById('requestForm').reset();
}

// Check if user already has an existing request for an item
async function checkExistingRequest(itemId) {
    try {
        const response = await messagesAPI.getAll();
        if (response.success && response.data && Array.isArray(response.data)) {
            // Check if any conversation exists for this item (only pending or accepted, not rejected)
            var existingConv = response.data.find(function(conv) {
                // Compare as numbers to avoid type issues
                var convItemId = parseInt(conv.itemId || conv.item_id || 0);
                var checkItemId = parseInt(itemId);
                var status = conv.status || 'pending';
                var isMatch = convItemId === checkItemId;
                var isValidStatus = (status === 'pending' || status === 'accepted' || status === 'partial_confirmed');
                return isMatch && isValidStatus;
            });
            return !!existingConv;
        }
        return false;
    } catch (error) {
        console.error('Error checking existing request:', error);
        return false;
    }
}

// Request system
async function requestItem() {
    if (!currentItem) return;
    
    // Check if user is authenticated
    var currentUser = getCurrentUserSync();
    if (!currentUser || !currentUser.id) {
        // Redirect to login with item ID for redirect after login
        window.location.replace('login.html?redirect=item&id=' + currentItem.id);
        return;
    }
    
    // Check if current user is the owner
    if (currentItem.user === currentUser.name) {
        showToast(t('cantRequestOwn'));
        return;
    }
    
    // Check if request already exists
    var hasExistingRequest = await checkExistingRequest(currentItem.id);
    if (hasExistingRequest) {
        showToast(t('requestAlreadySent') || 'You have already sent a request for this item');
        // Update button state
        var btnContact = document.getElementById('btnContact');
        if (btnContact) {
            btnContact.textContent = t('requestAlreadySent') || 'Request Already Sent';
            btnContact.disabled = true;
            btnContact.style.opacity = '0.6';
            btnContact.style.cursor = 'not-allowed';
            btnContact.onclick = null; // Remove onclick handler to prevent clicks
            btnContact.setAttribute('disabled', 'disabled'); // Also set attribute
        }
        return;
    }
    
    // If donation, send automatic message
    if (currentItem.type === 'donation') {
        sendDonationRequest();
    } else {
        // If exchange, open modal to customize message
        openRequestModal();
    }
}

async function sendDonationRequest() {
    if (!currentItem) return;
    
    var message = "Hi! I'm interested in this item. When and where can we meet?";
    
    // Translate message to user's language (ALWAYS try translation)
    try {
        var userLang = getCurrentLanguage();
        if (userLang && userLang !== 'en') {
            // Pass 'en' as sourceLang since the message is in English
            var translatedMsg = await autoTranslateText(message, userLang, 'en');
            if (translatedMsg) {
                message = translatedMsg;
            }
        }
    } catch (error) {
        // Use original message if translation fails
    }
    
    try {
        await createMessage(currentItem, message);
        showToast(t('requestSent'));
        await updateMessageBadge();
        
        // Update button to show request already sent
        var btnContact = document.getElementById('btnContact');
        if (btnContact) {
            btnContact.textContent = t('requestAlreadySent') || 'Request Already Sent';
            btnContact.disabled = true;
            btnContact.style.opacity = '0.6';
            btnContact.style.cursor = 'not-allowed';
        }
        
        closeModal();
    } catch (error) {
        handleAPIError(error);
    }
}

async function sendExchangeRequest(event) {
    event.preventDefault();
    if (!currentItem) return;
    
    var message = document.getElementById('requestMessage').value;
    if (!message.trim()) {
        showToast(t('pleaseEnterMessage'));
        return;
    }
    
    try {
        await createMessage(currentItem, message);
        showToast(t('requestSent'));
        await updateMessageBadge();
        
        // Update button to show request already sent
        var btnContact = document.getElementById('btnContact');
        if (btnContact) {
            btnContact.textContent = t('requestAlreadySent') || 'Request Already Sent';
            btnContact.disabled = true;
            btnContact.style.opacity = '0.6';
            btnContact.style.cursor = 'not-allowed';
        }
        
        closeRequestModal();
        closeModal();
    } catch (error) {
        handleAPIError(error);
    }
}

async function createMessage(item, messageText) {
    try {
        const response = await messagesAPI.send(item.id, messageText);
        if (response.success) {
            // Message created successfully via API
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
}

// Initialize modal event listeners
if (document.getElementById('modal')) {
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target.id === 'modal') closeModal();
    });
}

if (document.getElementById('reviewsModal')) {
    document.getElementById('reviewsModal').addEventListener('click', function(e) {
        if (e.target.id === 'reviewsModal') closeReviewsModal();
    });
}

if (document.getElementById('requestModal')) {
    document.getElementById('requestModal').addEventListener('click', function(e) {
        if (e.target.id === 'requestModal') closeRequestModal();
    });
}

