// Messages and Conversations Management
// ====================================

// Current conversation being viewed
var currentMainConversation = null;

// Conversation polling for typing indicators and new messages
var conversationPollInterval = null;

// Messages list polling interval
var messagesListPollInterval = null;

// Typing indicator management
var typingTimeout = null;
var isTyping = false;

// Messages modal functions
function openMessagesModal() {
    try {
        var modal = document.getElementById('messagesModal');
        if (!modal) {
            console.error('Messages modal not found!');
            return;
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        
        // Show modal with flex display
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        if (typeof showMessagesList === 'function') {
            showMessagesList();
        } else {
            console.error('showMessagesList function does not exist!');
            loadMessagesList().catch(function(error) {
                console.error('Error loading messages directly:', error);
            });
        }
        
        // Start polling for new messages while modal is open
        startMessagesListPolling();
    } catch (error) {
        console.error('Error in openMessagesModal:', error);
        console.error('Stack trace:', error.stack);
    }
}

function closeMessagesModal() {
    // Stop polling when modal closes
    stopMessagesListPolling();
    
    var modal = document.getElementById('messagesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    document.body.classList.remove('modal-open');
    document.body.style.overflow = ''; // Restore body scroll
}

// Start polling messages list for real-time updates
function startMessagesListPolling() {
    stopMessagesListPolling(); // Clear any existing interval
    
    messagesListPollInterval = setInterval(function() {
        var modal = document.getElementById('messagesModal');
        // Only refresh if modal is open and no conversation is currently open
        if (modal && modal.classList.contains('active') && !document.querySelector('.universal-conversation-modal')) {
            silentRefreshMessagesList().catch(function(error) {
                console.error('Error polling messages list:', error);
            });
        }
    }, 5000); // Poll every 5 seconds
}

// Silent refresh - only updates what changed, no flicker
async function silentRefreshMessagesList() {
    try {
        const response = await messagesAPI.getAll();
        if (!response.success || !response.data) return;
        
        var conversations = response.data;
        
        // Process conversations
        var statusPriority = { 'pending': 5, 'accepted': 4, 'partial_confirmed': 3, 'rejected': 2, 'completed': 1 };
        var conversationMap = {};
        conversations.forEach(function(conv) {
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
        var deduplicatedConversations = Object.values(conversationMap);
        
        var visibleConversations = deduplicatedConversations.filter(function(conv) {
            var status = String(conv.status || 'pending').toLowerCase().trim();
            return status === 'pending' || status === 'accepted' || status === 'partial_confirmed';
        });
        
        // Check if anything changed
        var currentItems = document.querySelectorAll('.conversation-list-item');
        var hasChanges = currentItems.length !== visibleConversations.length;
        
        if (!hasChanges) {
            // Check individual items for changes
            visibleConversations.forEach(function(conv, index) {
                var item = currentItems[index];
                if (item) {
                    var storedId = item.getAttribute('data-conv-id');
                    var storedUnread = parseInt(item.getAttribute('data-unread') || '0');
                    var storedLastMsg = item.getAttribute('data-last-msg');
                    
                    if (storedId !== conv.id || storedUnread !== conv.unreadCount || storedLastMsg !== conv.lastMessage) {
                        hasChanges = true;
                    }
                }
            });
        }
        
        // Only rebuild if something changed
        if (hasChanges) {
            await loadMessagesList();
        }
        
        // Always update badge silently
        if (typeof updateMessageBadge === 'function') {
            updateMessageBadge();
        }
    } catch (error) {
        console.error('Silent refresh error:', error);
    }
}

// Stop polling messages list
function stopMessagesListPolling() {
    if (messagesListPollInterval) {
        clearInterval(messagesListPollInterval);
        messagesListPollInterval = null;
    }
}

function showMessagesList() {
    try {
        var listView = document.getElementById('messagesListView');
        
        if (!listView) {
            console.error('messagesListView not found!');
            return;
        }
        
        // Stop conversation polling if active
        if (typeof stopConversationPolling === 'function') {
            stopConversationPolling();
        }
        currentMainConversation = null;
        
        listView.style.display = 'flex';
        
        loadMessagesList().catch(function(error) {
            console.error('Error in loadMessagesList:', error);
        });
    } catch (error) {
        console.error('Error in showMessagesList:', error);
    }
}

// Load messages list from API
async function loadMessagesList() {
    var messagesListContainer = document.getElementById('messagesListMain');
    if (!messagesListContainer) {
        console.error('messagesListMain container not found!');
        return;
    }
    
    messagesListContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading conversations...</div>';
    
    try {
        const response = await messagesAPI.getAll();
        
        if (!response.success || !response.data) {
            console.error('Invalid response:', response);
            throw new Error(response.message || 'Failed to load conversations');
        }
        
        var conversations = response.data;
        
        var statusPriority = { 'pending': 5, 'accepted': 4, 'partial_confirmed': 3, 'rejected': 2, 'completed': 1 };
        var conversationMap = {};
        conversations.forEach(function(conv) {
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
        var deduplicatedConversations = Object.values(conversationMap);
        
        var visibleConversations = deduplicatedConversations.filter(function(conv) {
            var status = String(conv.status || 'pending').toLowerCase().trim();
            var isVisible = status === 'pending' || status === 'accepted' || status === 'partial_confirmed';
            return isVisible;
        });

        if (visibleConversations.length === 0) {
            messagesListContainer.innerHTML = 
                '<div style="text-align: center; padding: 3rem; color: #9ca3af;">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 1rem; opacity: 0.5;">' +
                        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
                    '</svg>' +
                    '<p style="font-size: 1rem; margin-bottom: 0.5rem;">' + t('noMessages') + '</p>' +
                    '<p style="font-size: 0.875rem; opacity: 0.7;">' + t('conversationsWillAppear') + '</p>' +
                '</div>';
            return;
        }

        messagesListContainer.innerHTML = '';

        visibleConversations.forEach(function(conversation, index) {
            var card = document.createElement('div');
            card.className = 'conversation-list-item';
            // Add data attributes for silent refresh comparison
            card.setAttribute('data-conv-id', conversation.id || conversation.dbId);
            card.setAttribute('data-unread', conversation.unreadCount || 0);
            card.setAttribute('data-last-msg', conversation.lastMessage || '');
            var hasUnread = conversation.unreadCount > 0;
            card.onmouseover = function() {
                this.style.background = hasUnread ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.03)';
            };
            card.onmouseout = function() {
                this.style.background = hasUnread ? 'rgba(59, 130, 246, 0.08)' : 'transparent';
            };
            card.onclick = function() {
                // Use universal modal directly
                openUniversalConversationModal(conversation, {
                    returnToMessagesList: true,
                    backButtonText: t('backToMessages') ,
                    onClose: showMessagesList
                });
            };

            var currentUser = getCurrentUserSync();
            var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);

            // Last message preview
            var lastMessage = conversation.lastMessage || t('noMessagesYet');
            if (lastMessage.length > 50) {
                lastMessage = lastMessage.substring(0, 50) + '...';
            }

            // User avatar color
            var itemColor = conversation.itemColor || (conversation.itemType === t('donation')
                ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                : 'linear-gradient(135deg, #60a5fa, #3b82f6)');

            // User avatar initials
            var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();

            // Try to get avatar (photo) from conversation.otherUserAvatar or conversation.avatar
            var otherUserAvatar = conversation.otherUserAvatar || conversation.avatar || null;
            
            // Debug log
            console.log('Conversation:', conversation.otherUser, 'unreadCount:', conversation.unreadCount);
            
            var unreadIndicator = conversation.unreadCount > 0
                ? '<div style="background: #3b82f6; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; padding: 0 5px;">' + (conversation.unreadCount > 99 ? '99+' : conversation.unreadCount) + '</div>'
                : '';

            // Message style - bold for unread
            var messageStyle = conversation.unreadCount > 0
                ? 'font-weight: 600; color: #1f2937;'
                : 'font-weight: 400; color: #6b7280;';
            
            // Card background for unread
            var cardBg = conversation.unreadCount > 0
                ? 'background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6;'
                : 'background: transparent; border-left: 3px solid transparent;';

            var avatarHtml = '';
            if (otherUserAvatar) {
                avatarHtml = '<img src="' + otherUserAvatar + '" alt="' + otherUser + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block;background:' + itemColor + ';">';
            } else {
                avatarHtml = '<div style="width: 56px; height: 56px; border-radius: 50%; background: ' + itemColor + '; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.125rem; color: white; flex-shrink: 0;">' + otherUserInitials + '</div>';
            }
            
            // Apply background style to card
            card.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(0, 0, 0, 0.05); border-radius: 0.5rem; margin-bottom: 0.25rem; ' + cardBg;
            
            // Item title
            var itemTitle = conversation.itemTitle || '';
            if (itemTitle.length > 30) {
                itemTitle = itemTitle.substring(0, 30) + '...';
            }

            card.innerHTML =
                '<div style="display: flex; align-items: center; gap: 0.75rem;">' +
                    avatarHtml +
                    '<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;">' +
                        '<div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">' +
                            '<span style="font-size: 0.9375rem; font-weight: 600; color: #20ad0b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + otherUser + '</span>' +
                            '<span style="font-size: 0.7rem; color: #9ca3af; flex-shrink: 0;">' + formatConversationTime(conversation.lastUpdate) + '</span>' +
                        '</div>' +
                        '<div style="font-size: 0.75rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" class="conv-item-title">' + itemTitle + '</div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; overflow: hidden;">' +
                            '<span style="font-size: 0.8125rem; ' + messageStyle + ' overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" class="conv-last-message">' + lastMessage + '</span>' +
                            unreadIndicator +
                        '</div>' +
                    '</div>' +
                '</div>';

            messagesListContainer.appendChild(card);
            
            // Translate title and last message preview
            (async function() {
                var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
                
                // Translate title
                var titleEl = card.querySelector('.conv-item-title');
                if (titleEl && titleEl.textContent) {
                    try {
                        var translated = await autoTranslateText(titleEl.textContent, userLang);
                        if (translated && translated !== titleEl.textContent) {
                            titleEl.textContent = translated;
                        }
                    } catch (error) {
                        console.warn('[messages.js] Title translation failed:', error);
                    }
                }
                
                // Translate last message preview
                var msgEl = card.querySelector('.conv-last-message');
                if (msgEl && msgEl.textContent) {
                    try {
                        var translated = await autoTranslateText(msgEl.textContent, userLang);
                        if (translated && translated !== msgEl.textContent) {
                            msgEl.textContent = translated;
                        }
                    } catch (error) {
                        console.warn('[messages.js] Message translation failed:', error);
                    }
                }
            })();
        });
        
        // Update badge after loading
        await updateMessageBadge();
    } catch (error) {
        console.error('Error loading messages list:', error);
        messagesListContainer.innerHTML = 
            '<div style="text-align: center; padding: 3rem; color: #ef4444;">' +
                '<p>' + t('errorLoadingMessages') + '. ' + t('tryAgain') + '.</p>' +
            '</div>';
    }
}

function formatConversationTime(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diff = now - date;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
        return 'Just now';
    } else if (minutes < 60) {
        return minutes + 'm ago';
    } else if (hours < 24) {
        return hours + 'h ago';
    } else if (days < 7) {
        return days + 'd ago';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Conversation polling functions (kept for compatibility)
function startConversationPolling() {
    if (conversationPollInterval) {
        clearInterval(conversationPollInterval);
    }
    
    conversationPollInterval = setInterval(async function() {
        if (!currentMainConversation || !currentMainConversation.id) {
            stopConversationPolling();
            return;
        }
        
        try {
            // Reload conversation to get typing indicators, new messages, and online status
            const response = await conversationsAPI.get(currentMainConversation.id);
            if (response.success && response.data) {
                var convData = response.data;
                
                // Update online status
                if (convData.conversation && convData.conversation.otherUserIsOnline !== undefined) {
                    var onlineStatusEl = document.querySelector('.online-status');
                    if (onlineStatusEl) {
                        var isOnline = convData.conversation.otherUserIsOnline;
                        onlineStatusEl.className = 'online-status ' + (isOnline ? 'online' : 'offline');
                        onlineStatusEl.title = isOnline ? 'Online' : 'Offline';
                    }
                }
                
                // Update typing indicators
                if (convData.typing_users && convData.typing_users.length > 0) {
                    var typingIndicator = document.getElementById('typingIndicator');
                    if (!typingIndicator) {
                        var messagesContainer = document.getElementById('mainConversationMessages');
                        if (messagesContainer) {
                            typingIndicator = document.createElement('div');
                            typingIndicator.className = 'typing-indicator';
                            typingIndicator.id = 'typingIndicator';
                            typingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div><span style="color: #6b7280; font-size: 0.875rem; margin-left: 0.5rem;">typing...</span>';
                            messagesContainer.appendChild(typingIndicator);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    }
                } else {
                    var typingIndicator = document.getElementById('typingIndicator');
                    if (typingIndicator) {
                        typingIndicator.remove();
                    }
                }
                
                // Check for new messages
                var newMessages = convData.messages || [];
                var currentMessages = currentMainConversation.messages || [];
                if (newMessages.length > currentMessages.length) {
                    // Reload conversation to show new messages
                    await loadMainConversation(currentMainConversation);
                }
            }
        } catch (error) {
            console.error('Error polling conversation:', error);
        }
    }, 2000); // Poll every 2 seconds
}

function stopConversationPolling() {
    if (conversationPollInterval) {
        clearInterval(conversationPollInterval);
        conversationPollInterval = null;
    }
}

// Initialize messages modal event listener
if (document.getElementById('messagesModal')) {
    document.getElementById('messagesModal').addEventListener('click', function(e) {
        if (e.target.id === 'messagesModal') {
            closeMessagesModal();
        }
    });
}

