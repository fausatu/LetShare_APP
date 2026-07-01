// ==========================================
// PROFILE PUBLIC MODULE
// Handles viewing another user's public profile
// ==========================================

import { showToast, translateCardElements, formatTimeAgo, startProfileTimeUpdates } from './profile-utils.js';

export async function loadPublicProfile(targetUserId) {
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
                profileAvatar.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
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

export async function loadPublicPostedItems(userId) {
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
