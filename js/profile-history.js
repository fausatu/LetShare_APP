// ==========================================
// PROFILE HISTORY MODULE
// Handles the History tab (completed/rejected/cancelled)
// ==========================================

import { getCurrentUserSync, translateConversationTitle, formatDate, showToast } from './profile-utils.js';

export async function loadHistory() {
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
                '<div class="empty-state-icon">\u26A0\uFE0F</div>' +
                '<h3>' + t('errorLoadingHistory') + '</h3>' +
                '<p>' + t('pleaseTryAgainLater') + '</p>' +
            '</div>';
    }
}

export function notifyInterestedUsers(itemId) {
    // Mark item as unavailable for interested users
    var unavailableItems = JSON.parse(localStorage.getItem('unavailableItems') || '[]');
    if (unavailableItems.indexOf(itemId) === -1) {
        unavailableItems.push(itemId);
        localStorage.setItem('unavailableItems', JSON.stringify(unavailableItems));
    }
}
