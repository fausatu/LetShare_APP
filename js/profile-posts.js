// ==========================================
// PROFILE POSTS MODULE
// Handles posted items + interested items tabs
// ==========================================

import { getCurrentUserSync, translateCardElements, formatTimeAgo, formatDate, startProfileTimeUpdates, showToast } from './profile-utils.js';

export async function loadPostedItems() {
    var postedItemsContainer = document.getElementById('postedItems');
    if (!postedItemsContainer) return;
    postedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';

    try {
        const myItemsResponse = await fetch('api/items.php?filter=my', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
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
            postedItemsContainer.innerHTML = '';
            allPostedItems.forEach(function(item) {
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

            translateCardElements(postedItemsContainer, allPostedItems, { titleSelector: 'h3' });
            startProfileTimeUpdates();
        }

        document.getElementById('postedCount').textContent = allPostedItems.length;
    } catch (error) {
        postedItemsContainer.classList.remove('has-items');
        postedItemsContainer.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-state-icon">\u26A0\uFE0F</div>' +
                '<h3>' + t('errorLoadingItems') + '</h3>' +
                '<p>' + t('pleaseTryAgainLater') + '</p>' +
            '</div>';
    }
}

export async function deletePostedItem(event, itemId, isStatic) {
    event.stopPropagation();
    try {
        const response = await itemsAPI.delete(itemId);
        if (response.success) {
            showToast(t('itemDeletedSuccess'));
            await loadPostedItems();
        } else {
            throw new Error(response.message || 'Failed to delete item');
        }
    } catch (error) {
        showToast(t('errorDeletingItem'));
    }
}

export async function loadInterestedItems() {
    var interestedItemsContainer = document.getElementById('interestedItems');
    if (!interestedItemsContainer) return;
    interestedItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';

    try {
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
            interestedItemsContainer.innerHTML = '';
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
                var userInitials = item.user ? item.user.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase() : 'U';
                var itemImage = item.image || '';
                var itemColor = item.color || (item.type === 'donation'
                    ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                    : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
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

            translateCardElements(interestedItemsContainer, interestedItems, {
                titleSelector: '.interested-item-title',
                descSelector: '.interested-description',
                maxDescLength: 80
            });
        }

        document.getElementById('interestedCount').textContent = interestedItems.length;
    } catch (error) {
        interestedItemsContainer.classList.remove('has-items');
        interestedItemsContainer.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-state-icon">\u26A0\uFE0F</div>' +
                '<h3>' + t('errorLoadingItems') + '</h3>' +
                '<p>' + t('pleaseTryAgainLater') + '</p>' +
            '</div>';
    }
}

export async function deleteInterestedItem(event, itemId) {
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
