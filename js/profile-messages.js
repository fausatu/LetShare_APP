// ==========================================
// PROFILE MESSAGES MODULE
// Handles the Requests (messages) tab
// ==========================================

import { getCurrentUserSync, translateConversationTitle, formatDate, showToast } from './profile-utils.js';

export async function loadMessages() {
    var messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    messagesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' + t('loading') + '</div>';

    try {
        const response = await messagesAPI.getAll();
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to load messages');
        }

        var userMessages = response.data;

        // Deduplicate conversations by formatted ID
        var statusPriority = { 'pending': 4, 'accepted': 3, 'rejected': 2, 'completed': 1 };
        var conversationMap = {};
        userMessages.forEach(function(conv) {
            var key = conv.id;
            var currentStatus = String(conv.status || 'pending').toLowerCase().trim();
            var currentPriority = statusPriority[currentStatus] || 0;

            if (!conversationMap[key]) {
                conversationMap[key] = conv;
            } else {
                var existingStatus = String(conversationMap[key].status || 'pending').toLowerCase().trim();
                var existingPriority = statusPriority[existingStatus] || 0;
                if (currentPriority > existingPriority ||
                    (currentPriority === existingPriority && conv.dbId > conversationMap[key].dbId)) {
                    conversationMap[key] = conv;
                }
            }
        });
        var deduplicatedMessages = Object.values(conversationMap);

        // Keep only pending and accepted in the main list
        var activeMessages = deduplicatedMessages.filter(function(conversation) {
            var status = String(conversation.status || 'pending').toLowerCase().trim();
            if (conversation.hidden) return false;
            return status === 'pending' || status === 'accepted';
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
            messagesList.innerHTML = '';
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

                var lastMessage = conversation.lastMessage || t('noMessagesYet');
                if (lastMessage.length > 60) {
                    lastMessage = lastMessage.substring(0, 60) + '...';
                }

                var itemImage = conversation.itemImage || '';
                var itemColor = conversation.itemColor || (conversation.itemType === 'donation'
                    ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                    : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
                var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
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
                '<div class="empty-state-icon">\u26A0\uFE0F</div>' +
                '<h3>' + t('errorLoadingMessages') + '</h3>' +
                '<p>' + t('pleaseTryAgainLater') + '</p>' +
            '</div>';
    }
}
