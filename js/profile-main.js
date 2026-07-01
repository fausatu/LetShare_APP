// ==========================================
// PROFILE ORCHESTRATOR MODULE
// Main entry point — imports all sub-modules
// ==========================================

import { getCurrentUser, getCurrentUserSync, showToast } from './profile-utils.js';
import { loadPostedItems, deletePostedItem, loadInterestedItems, deleteInterestedItem } from './profile-posts.js';
import { loadMessages } from './profile-messages.js';
import { openReviewModal, closeReviewModal, initStarRating, submitReview } from './profile-reviews.js';
import { loadHistory, notifyInterestedUsers } from './profile-history.js';
import { loadPublicProfile, loadPublicPostedItems } from './profile-public.js';

// ---- URL params & state ----
var _profileUrlParams = new URLSearchParams(window.location.search);
var _viewUserId = _profileUrlParams.get('user_id') ? parseInt(_profileUrlParams.get('user_id')) : null;
var isOwnProfile = true;
var publicProfileUserId = null;

// ---- Expose functions for inline onclick handlers ----
window.switchTab = switchTab;
window.deletePostedItem = deletePostedItem;
window.deleteInterestedItem = deleteInterestedItem;
window.closeReviewModal = closeReviewModal;
window.submitReview = submitReview;
window.openReviewModal = openReviewModal;

// Expose reload functions for conversation-modal.js
window.profileLoadMessages = loadMessages;
window.profileLoadHistory = loadHistory;

// ---- Load user profile ----
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
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        } catch (error) {
        }
    }

    // If still no user, use cached data
    if (!user) {
        user = getCurrentUserSync();
    }

    // Capture user value for use in ratings/reviews section
    var currentUserForReviews = user || null;

    if (user) {
        // Update profile header - wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 50));

        var profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            if (user.avatar) {
                profileAvatar.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
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
            if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                var departmentText = (user.department || 'Finance') + ' ' + t('majorSuffix');
                profileMajor.textContent = departmentText;
                profileMajor.style.display = 'block';
            } else {
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

        // Make profile content visible now that header is loaded
        document.body.classList.add('profile-loaded');

        // Retry if elements not found (DOM might not be ready)
        if (!profileAvatar || !profileName || !profileMajor) {
            setTimeout(async function() {
                await loadUserProfile();
            }, 500);
            return;
        }

        // Load user stats
        if (user.id) {
            try {
                const statsResponse = await usersAPI.get(user.id);
                if (statsResponse.success && statsResponse.data && statsResponse.data.stats) {
                    var stats = statsResponse.data.stats;

                    var postedCountEl = document.getElementById('postedCount');
                    if (postedCountEl) {
                        postedCountEl.textContent = stats.posted || 0;
                    }

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
                profileAvatar.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
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
            if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                profileMajor.textContent = (user.department || 'Finance') + ' ' + t('majorSuffix');
                profileMajor.style.display = 'block';
            } else {
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

    // Load ratings and reviews
    if (user && user.id) {
        var userId = user.id;
        (async function(userId) {
            try {
                const response = await reviewsAPI.get(userId);

                var rating = 0;
                var reviews = 0;

                if (response.success && response.data) {
                    rating = response.data.rating.average || 0;
                    reviews = response.data.rating.count || 0;
                }

                var profileRating = document.getElementById('profileRating');
                if (profileRating) {
                    profileRating.textContent = rating.toFixed(1);
                }

                var profileReviews = document.getElementById('profileReviews');
                if (profileReviews) {
                    var reviewsText = reviews === 0 ? t('noReviewsYet') : '(' + reviews + ' ' + (reviews !== 1 ? t('reviewCountPlural') : t('reviewCountSingular')) + ')';
                    profileReviews.textContent = reviewsText;
                    profileReviews.style.cursor = reviews > 0 ? 'pointer' : 'default';
                    profileReviews.style.textDecoration = reviews > 0 ? 'underline' : 'none';
                    profileReviews.style.color = reviews > 0 ? '#3b82f6' : 'inherit';
                    profileReviews.onclick = reviews > 0 ? function() { openReviewsModal(userId); } : null;
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
            } catch (error) {
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
                        star.textContent = '\u2605';
                        starsContainer.appendChild(star);
                    }
                }
            }
        })(userId);
    } else {
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

// ---- Tab switching ----
function switchTab(tabName, clickedElement) {
    var clickedTab = clickedElement;
    if (!clickedTab) {
        var allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(function(tab) {
            if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes("'" + tabName + "'")) {
                clickedTab = tab;
            }
        });
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    var activeSection = document.querySelector('.content-section.active');
    var newSection = document.getElementById(tabName);

    if (!newSection) return;

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

            if (tabName === 'interested') {
                loadInterestedItems();
            } else if (tabName === 'posted') {
                if (isOwnProfile) loadPostedItems(); else loadPublicPostedItems(publicProfileUserId);
            } else if (tabName === 'messages') {
                loadMessages();
            } else if (tabName === 'history') {
                loadHistory();
            }
        }, 300);
    } else {
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

// ---- Event listeners ----
window.addEventListener('userProfileUpdated', async function(event) {
    if (event.detail) {
        localStorage.setItem('currentUser', JSON.stringify(event.detail));
        await getCurrentUser(true);
        await loadUserProfile();
    }
});

window.addEventListener('privacySettingUpdated', async function(event) {
    if (event.detail && event.detail.userData) {
        var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        Object.keys(event.detail.userData).forEach(function(key) {
            if (event.detail.userData[key] !== undefined) {
                currentUser[key] = event.detail.userData[key];
            }
        });
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        await getCurrentUser(true);
        await loadUserProfile();
    }
});

window.addEventListener('focus', async function() {
    var profileJustUpdated = sessionStorage.getItem('userProfileJustUpdated');
    if (profileJustUpdated === 'true') {
        await getCurrentUser(true);
        await loadUserProfile();
        sessionStorage.removeItem('userProfileJustUpdated');
        sessionStorage.removeItem('updatedUserData');
    }
});

// ---- Auth check ----

// Helper to clear localStorage while preserving persistent settings
function clearAuthLocalStorage() {
    var lang = null;
    var lastSeenVersion = localStorage.getItem('lastSeenVersion');
    try {
        var s = JSON.parse(localStorage.getItem('userSettings') || '{}');
        if (s.language) lang = s.language;
    } catch (e) {}
    localStorage.clear();
    if (lang) localStorage.setItem('userSettings', JSON.stringify({ language: lang }));
    if (lastSeenVersion) localStorage.setItem('lastSeenVersion', lastSeenVersion);
}

async function checkAuthentication() {
    try {
        const isAuth = await checkAuth();
        if (!isAuth) {
            clearAuthLocalStorage();
            sessionStorage.clear();
            window.location.replace('login.html?nocache=' + Date.now());
            return false;
        }
        return true;
    } catch (error) {
        clearAuthLocalStorage();
        sessionStorage.clear();
        window.location.replace('login.html?nocache=' + Date.now());
        return false;
    }
}

// ---- IMMEDIATE AUTH CHECK ----
(async function immediateAuthCheck() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');

    try {
        const isAuth = await checkAuth();
        if (!isAuth) {
            clearAuthLocalStorage();
            sessionStorage.clear();
            window.location.replace('login.html?nocache=' + Date.now());
            throw new Error('Not authenticated');
        }
    } catch (error) {
        clearAuthLocalStorage();
        sessionStorage.clear();
        window.location.replace('login.html?nocache=' + Date.now());
        throw error;
    }
})().catch(function(error) {
    // Silently catch - redirect is already happening
});

// ---- Page load ----
window.addEventListener('load', async function() {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
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

    // Force refresh user data from API
    localStorage.removeItem('currentUser');
    await getCurrentUser(true);

    // If profile was just updated, use sessionStorage data (more recent than API)
    if (profileJustUpdated === 'true') {
        var updatedUserData2 = sessionStorage.getItem('updatedUserData');
        if (updatedUserData2) {
            try {
                var updatedUser2 = JSON.parse(updatedUserData2);
                localStorage.setItem('currentUser', JSON.stringify(updatedUser2));
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

    // Only load own items if viewing own profile
    if (isOwnProfile) {
        await loadPostedItems();
        await loadInterestedItems();
    }

    // Load messages if the messages tab is active
    var activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.getAttribute('onclick') && activeTab.getAttribute('onclick').includes("'messages'")) {
        await loadMessages();
    }

    // Initialize star rating for review modal
    initStarRating();

    // Listen for browser back/forward button
    window.addEventListener('popstate', async function(event) {
        const stillAuthenticated = await checkAuthentication();
        if (!stillAuthenticated) {
            return;
        }
    });

    // Also check on focus
    window.addEventListener('focus', async function() {
        const stillAuthenticated = await checkAuthentication();
        if (!stillAuthenticated) {
            return;
        }
    });
});
