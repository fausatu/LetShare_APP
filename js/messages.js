// Messages and Conversations Management
// ====================================

// Current conversation being viewed
var currentMainConversation = null;

// Conversation polling for typing indicators and new messages
var conversationPollInterval = null;

// Typing indicator management
var typingTimeout = null;
var isTyping = false;

// Messages modal functions
function openMessagesModal() {
    console.log('Opening messages modal...');
    try {
        var modal = document.getElementById('messagesModal');
        if (!modal) {
            console.error('Messages modal not found!');
            return;
        }
        modal.classList.add('active');
        console.log('Modal opened, showing messages list...');
        
        // Check if showMessagesList function exists
        if (typeof showMessagesList === 'function') {
            console.log('showMessagesList function exists, calling it...');
            showMessagesList();
        } else {
            console.error('showMessagesList function does not exist!');
            // Try to load messages directly
            console.log('Trying to load messages directly...');
            loadMessagesList().catch(function(error) {
                console.error('Error loading messages directly:', error);
            });
        }
    } catch (error) {
        console.error('Error in openMessagesModal:', error);
        console.error('Stack trace:', error.stack);
    }
}

function closeMessagesModal() {
    document.getElementById('messagesModal').classList.remove('active');
    showMessagesList(); // Reset to list view
}

function showMessagesList() {
    console.log('Showing messages list view...');
    try {
        var listView = document.getElementById('messagesListView');
        var conversationView = document.getElementById('conversationView');
        
        console.log('listView found:', !!listView);
        console.log('conversationView found:', !!conversationView);
        
        if (!listView) {
            console.error('messagesListView not found!');
            return;
        }
        if (!conversationView) {
            console.error('conversationView not found!');
            return;
        }
        
        // Stop conversation polling if active
        if (typeof stopConversationPolling === 'function') {
            stopConversationPolling();
        }
        currentMainConversation = null;
        
        listView.style.display = 'flex';
        conversationView.style.display = 'none';
        console.log('Views updated, loading messages list...');
        
        // Call loadMessagesList with error handling
        loadMessagesList().catch(function(error) {
            console.error('Error in loadMessagesList:', error);
        });
    } catch (error) {
        console.error('Error in showMessagesList:', error);
    }
}

function showConversation(conversation) {
    document.getElementById('messagesListView').style.display = 'none';
    var conversationView = document.getElementById('conversationView');
    conversationView.style.display = 'flex';
    conversationView.style.flexDirection = 'column';
    currentMainConversation = conversation;
    loadMainConversation(conversation);
}

// Load messages list from API
async function loadMessagesList() {
    console.log('Loading messages list...');
    var messagesListContainer = document.getElementById('messagesListMain');
    if (!messagesListContainer) {
        console.error('messagesListMain container not found!');
        return;
    }
    
    messagesListContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;">Loading conversations...</div>';
    
    try {
        console.log('Calling messagesAPI.getAll()...');
        const response = await messagesAPI.getAll();
        console.log('Messages API response:', response);
        
        if (!response.success || !response.data) {
            console.error('Invalid response:', response);
            throw new Error(response.message || 'Failed to load conversations');
        }
        
        var conversations = response.data;
        console.log('Conversations loaded:', conversations.length);
        console.log('All conversations before filtering:', JSON.stringify(conversations, null, 2));
        
        // First, deduplicate conversations by formatted ID
        // Priority: pending > accepted > rejected > completed
        var statusPriority = { 'pending': 4, 'accepted': 3, 'rejected': 2, 'completed': 1 };
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
        console.log('After deduplication:', deduplicatedConversations.length, 'conversations');
        
        // Filter conversations: only show pending in Requests tab
        // Accepted, rejected, cancelled, and completed will be shown in History tab (in profile page)
        var pendingConversations = deduplicatedConversations.filter(function(conv) {
            var status = String(conv.status || 'pending').toLowerCase().trim();
            var isPending = status === 'pending';
            console.log('Filtering conversation ID:', conv.id, 'dbId:', conv.dbId, '- status:', status, '- isPending:', isPending);
            if (!isPending) {
                console.log('Filtered out conversation:', conv.id, 'dbId:', conv.dbId, 'with status:', status);
            }
            return isPending;
        });
        
        console.log('Pending conversations:', pendingConversations.length);
        console.log('Filtered out (accepted/rejected/completed):', deduplicatedConversations.length - pendingConversations.length);
        
        if (pendingConversations.length === 0) {
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
        
        messagesListContainer.innerHTML = ''; // Clear loading message
        console.log('Rendering', pendingConversations.length, 'pending conversations...');
        
        pendingConversations.forEach(function(conversation, index) {
            console.log('Rendering conversation', index + 1, ':', conversation);
            var card = document.createElement('div');
            card.className = 'conversation-list-item';
            card.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255, 255, 255, 0.05);';
            card.onmouseover = function() {
                this.style.background = 'rgba(255, 255, 255, 0.05)';
            };
            card.onmouseout = function() {
                this.style.background = 'transparent';
            };
            card.onclick = function() {
                showConversation(conversation);
            };
            
            var currentUser = getCurrentUserSync();
            var otherUser = conversation.otherUser || (conversation.isOwner ? conversation.requester : conversation.owner);
            
            // Last message preview
            var lastMessage = conversation.lastMessage || 'No messages yet';
            if (lastMessage.length > 50) {
                lastMessage = lastMessage.substring(0, 50) + '...';
            }
            
            // User avatar color
            var itemColor = conversation.itemColor || (conversation.itemType === 'donation' 
                ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                : 'linear-gradient(135deg, #60a5fa, #3b82f6)');
            
            // User avatar initials
            var otherUserInitials = otherUser.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
            
            // Unread indicator
            var unreadIndicator = conversation.unreadCount > 0 
                ? '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 8px; height: 8px; flex-shrink: 0; margin-left: 0.5rem;"></div>' 
                : '';
            
            // Message style (bold if unread)
            var messageStyle = conversation.unreadCount > 0 
                ? 'font-weight: 600; color: white;' 
                : 'font-weight: 400; color: #9ca3af;';
            
            card.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 0.75rem;">' +
                    '<div style="width: 56px; height: 56px; border-radius: 50%; background: ' + itemColor + '; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.125rem; color: white; flex-shrink: 0;">' + otherUserInitials + '</div>' +
                    '<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem;">' +
                        '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                            '<span style="font-size: 0.9375rem; font-weight: 600; color: #20ad0b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + otherUser + '</span>' +
                            unreadIndicator +
                        '</div>' +
                        '<div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">' +
                            '<span style="font-size: 0.875rem; ' + messageStyle + ' overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">' + lastMessage + '</span>' +
                            '<span style="font-size: 0.75rem; color: #6b7280; flex-shrink: 0;">' + formatConversationTime(conversation.lastUpdate) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            messagesListContainer.appendChild(card);
        });
        
        // Update badge after loading
        await updateMessageBadge();
    } catch (error) {
        console.error('Error loading messages list:', error);
        messagesListContainer.innerHTML = 
            '<div style="text-align: center; padding: 3rem; color: #ef4444;">' +
                '<p>Error loading conversations. Please try again.</p>' +
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

async function loadMainConversation(conversation) {
    var conversationView = document.getElementById('conversationView');
    if (!conversationView) return;
    
    // Get conversation details from API
    try {
        var convId = conversation.id;
        const response = await conversationsAPI.get(convId);
        
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to load conversation');
        }
        
        var convData = response.data;
        var conversationData = convData.conversation;
        var messages = convData.messages;
        
        // Update current conversation with full data
        // Ensure isOwner is explicitly set from conversationData (most reliable source)
        var isOwnerFromAPI = conversationData.isOwner !== undefined ? Boolean(conversationData.isOwner) : false;
        var ownerIdFromAPI = conversationData.ownerId || null;
        var currentUser = getCurrentUserSync();
        
        // Double-check isOwner by comparing ownerId if available (this is the most reliable check)
        if (ownerIdFromAPI !== null && ownerIdFromAPI !== undefined && currentUser && currentUser.id) {
            var ownerIdNum = Number(ownerIdFromAPI);
            var currentUserIdNum = Number(currentUser.id);
            isOwnerFromAPI = (ownerIdNum === currentUserIdNum);
            console.log('Double-checking isOwner: ownerIdFromAPI', ownerIdFromAPI, '(num:', ownerIdNum, ') === currentUser.id', currentUser.id, '(num:', currentUserIdNum, ') =', isOwnerFromAPI);
        } else {
            console.log('Cannot double-check isOwner - ownerIdFromAPI:', ownerIdFromAPI, 'currentUser.id:', currentUser ? currentUser.id : 'NO USER');
        }
        
        currentMainConversation = {
            ...conversation,
            ...conversationData,
            messages: messages,
            status: String(conversationData.status || conversation.status || 'pending').toLowerCase().trim(), // Ensure status is set and normalized
            isOwner: isOwnerFromAPI, // Use explicitly determined isOwner
            ownerId: ownerIdFromAPI, // Ensure ownerId is set
            owner: conversationData.owner || conversation.owner || null // Ensure owner name is set
        };
        
        console.log('Updated currentMainConversation:', currentMainConversation);
        console.log('Status:', currentMainConversation.status);
        console.log('isOwner:', currentMainConversation.isOwner, '(type:', typeof currentMainConversation.isOwner, ')');
        console.log('ownerId:', currentMainConversation.ownerId);
        console.log('owner:', currentMainConversation.owner);
        console.log('conversationData.isOwner:', conversationData.isOwner);
        console.log('conversationData:', conversationData);
        
        var currentUser = getCurrentUserSync();
        var otherUser = conversationData.otherUser || (conversationData.isOwner ? conversationData.requester : conversationData.owner);
        var isOwner = conversationData.isOwner;
    
        // Get online status indicator
        var onlineStatusHtml = '';
        if (conversationData.otherUserIsOnline !== undefined) {
            var isOnline = conversationData.otherUserIsOnline;
            onlineStatusHtml = '<span class="online-status ' + (isOnline ? 'online' : 'offline') + '" title="' + (isOnline ? 'Online' : 'Offline') + '"></span>';
        }
        
        conversationView.innerHTML = 
        '<button onclick="showMessagesList()" style="background: none; border: none; color: black; cursor: pointer; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 0.5rem; transition: background 0.3s;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'transparent\'">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M19 12H5M12 19l-7-7 7-7"></path>' +
            '</svg>' +
                    t('backToMessages') +
        '</button>' +
        '<div class="conversation-header">' +
            '<h2 style="margin-bottom: 0.5rem; font-size: 1.25rem;">' + conversationData.itemTitle + '</h2>' +
            '<p style="color: #9ca3af; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">' + 
                        (isOwner ? t('requestFrom') + ' ' : t('to') + ' ') + '<strong style="color: green;">' + otherUser + '</strong>' + onlineStatusHtml +
            '</p>' +
        '</div>' +
        '<div class="conversation-messages" id="mainConversationMessages"></div>' +
        '<div class="conversation-actions" id="mainConversationActions"></div>' +
        '<div class="conversation-input-container">' +
            '<input type="text" class="conversation-input" id="mainConversationInput" placeholder="Type a message..." onkeypress="handleMainConversationKeyPress(event)" oninput="handleMainConversationTyping()">' +
            '<button class="conversation-send" onclick="sendMainMessage()">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>' +
                '</svg>' +
            '</button>' +
        '</div>';
    
        loadMainConversationMessages(currentMainConversation);
        
        // Small delay to ensure DOM is ready before loading actions
        setTimeout(function() {
            console.log('Calling loadMainConversationActions after delay...');
            loadMainConversationActions(currentMainConversation);
        }, 100);
        
        // Start polling for typing indicators and new messages
        startConversationPolling();
    } catch (error) {
        console.error('Error loading conversation:', error);
        handleAPIError(error);
    }
}

// Conversation polling for typing indicators and new messages
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

function loadMainConversationMessages(conversation) {
    var messagesContainer = document.getElementById('mainConversationMessages');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    
    if (!conversation.messages || conversation.messages.length === 0) {
        messagesContainer.innerHTML = 
            '<div style="text-align: center; padding: 2rem; color: #9ca3af;">' +
                        '<p>' + t('noMessagesYet') + '</p>' +
            '</div>';
        return;
    }
    
    var currentUser = getCurrentUserSync();
    conversation.messages.forEach(function(message, index) {
        var messageDiv = document.createElement('div');
        var isSent = message.is_sent || (message.from === currentUser.name || message.from_user_id === currentUser.id);
        messageDiv.className = 'message ' + (isSent ? 'message-sent' : 'message-received');
        
        // Show timestamp only if it's the first message or if there's a significant time gap (5 minutes)
        var showTime = index === 0;
        if (index > 0) {
            var prevMessage = conversation.messages[index - 1];
            var timeDiff = new Date(message.timestamp) - new Date(prevMessage.timestamp);
            showTime = timeDiff > 300000; // 5 minutes
        }
        
        var timeDisplay = showTime ? '<span class="message-time">' + formatMessageDate(message.timestamp) + '</span>' : '';
        
        // Read receipt for sent messages
        var readReceipt = '';
        if (isSent) {
            if (message.read && message.read_at) {
                // Double check (read)
                readReceipt = '<span class="read-receipt read" title="Read at ' + formatMessageDate(message.read_at) + '">✓✓</span>';
            } else if (message.read) {
                // Single check (sent)
                readReceipt = '<span class="read-receipt sent" title="Sent">✓</span>';
            } else {
                // Pending
                readReceipt = '<span class="read-receipt pending" title="Pending">⏱</span>';
            }
        }
        
        messageDiv.innerHTML = 
            '<div class="message-content">' +
                '<p>' + message.text + '</p>' +
                '<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem;">' +
                    timeDisplay +
                    (isSent ? '<div style="margin-left: auto;">' + readReceipt + '</div>' : '') +
                '</div>' +
            '</div>';
        messagesContainer.appendChild(messageDiv);
    });
    
    // Add typing indicator if available
    if (conversation.typing_users && conversation.typing_users.length > 0) {
        var typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div><span style="color: #6b7280; font-size: 0.875rem; margin-left: 0.5rem;">typing...</span>';
        messagesContainer.appendChild(typingDiv);
    }
    
    setTimeout(function() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

function loadMainConversationActions(conversation) {
    console.log('=== loadMainConversationActions START ===');
    console.log('loadMainConversationActions called with conversation:', conversation);
    var actionsContainer = document.getElementById('mainConversationActions');
    if (!actionsContainer) {
        console.error('mainConversationActions container not found!');
        return;
    }
    actionsContainer.innerHTML = '';
    
    var currentUser = getCurrentUserSync();
    console.log('Current user:', currentUser);
    console.log('Current user ID:', currentUser ? currentUser.id : 'NO ID');
    console.log('Current user name:', currentUser ? currentUser.name : 'NO NAME');
    
    // Determine isOwner: prioritize ownerId comparison (most reliable), then conversation.isOwner
    var isOwner = false;
    
    // First, check ownerId (most reliable method)
    if (conversation.ownerId !== undefined && conversation.ownerId !== null && currentUser && currentUser.id) {
        var ownerIdNum = Number(conversation.ownerId);
        var currentUserIdNum = Number(currentUser.id);
        isOwner = (ownerIdNum === currentUserIdNum);
        console.log('✓ Using conversation.ownerId comparison:', conversation.ownerId, '(num:', ownerIdNum, ') ===', currentUser.id, '(num:', currentUserIdNum, ') =', isOwner);
    } 
    // If ownerId not available, try conversation.isOwner
    else if (conversation.isOwner !== undefined && conversation.isOwner !== null) {
        isOwner = Boolean(conversation.isOwner);
        console.log('✓ Using conversation.isOwner (boolean):', isOwner);
    } 
    // Last resort: check owner name
    else if (conversation.owner && currentUser && currentUser.name) {
        isOwner = (String(conversation.owner).trim() === String(currentUser.name).trim());
        console.log('✓ Using conversation.owner name comparison:', conversation.owner, '===', currentUser.name, '=', isOwner);
    } else {
        console.warn('✗ Could not determine isOwner - all checks failed');
        console.warn('conversation.isOwner:', conversation.isOwner, '(type:', typeof conversation.isOwner, ')');
        console.warn('conversation.ownerId:', conversation.ownerId, '(type:', typeof conversation.ownerId, ')');
        console.warn('conversation.owner:', conversation.owner);
        console.warn('currentUser:', currentUser);
        isOwner = false; // Explicitly set to false if we can't determine
    }
    
    var status = String(conversation.status || 'pending').toLowerCase().trim();
    
    console.log('=== FINAL CHECK ===');
    console.log('Final isOwner:', isOwner, '(type:', typeof isOwner, ')');
    console.log('Final status:', status);
    console.log('Condition check: isOwner === true && status === "pending" =', (isOwner === true), '&&', status, '=== "pending" =', (isOwner === true && status === 'pending'));
    
    // Only show buttons for owner when status is pending
    if (isOwner === true && status === 'pending') {
        console.log('✓ Showing accept/reject buttons for owner');
        actionsContainer.innerHTML = 
            '<div class="conversation-buttons">' +
                        '<button class="btn-accept" onclick="acceptMainRequest()">' + t('acceptRequest') + '</button>' +
                        '<button class="btn-reject" onclick="rejectMainRequest()">' + t('reject') + '</button>' +
            '</div>';
    } else if (status === 'accepted' && !isOwner) {
        console.log('✓ Showing confirm received button for requester');
        actionsContainer.innerHTML = 
            '<div class="conversation-buttons">' +
                        '<button class="btn-confirm" onclick="confirmMainReceived()">' + t('confirmItemReceived') + '</button>' +
            '</div>';
    } else {
        console.log('✗ No actions to show - isOwner:', isOwner, 'status:', status);
        // No buttons to show - leave container empty
        actionsContainer.innerHTML = '';
    }
    console.log('=== loadMainConversationActions END ===');
}

// Typing indicator management
function handleMainConversationKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMainMessage();
    } else {
        handleMainConversationTyping();
    }
}

function handleMainConversationTyping() {
    if (!currentMainConversation) return;
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set typing indicator
    if (!isTyping) {
        isTyping = true;
        conversationsAPI.updateTyping(currentMainConversation.id, true).catch(function(err) {
            console.error('Error updating typing indicator:', err);
        });
    }
    
    // Clear typing indicator after 3 seconds of no typing
    typingTimeout = setTimeout(function() {
        isTyping = false;
        conversationsAPI.updateTyping(currentMainConversation.id, false).catch(function(err) {
            console.error('Error clearing typing indicator:', err);
        });
    }, 3000);
}

async function sendMainMessage() {
    if (!currentMainConversation) return;
    
    var input = document.getElementById('mainConversationInput');
    if (!input) return;
    var messageText = input.value.trim();
    if (!messageText) return;
    
    // Clear typing indicator
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    if (isTyping) {
        isTyping = false;
        conversationsAPI.updateTyping(currentMainConversation.id, false).catch(function(err) {
            console.error('Error clearing typing indicator:', err);
        });
    }
    
    try {
        var conversationId = currentMainConversation.id;
        const response = await conversationsAPI.sendMessage(conversationId, messageText);
        
        if (response.success) {
            input.value = '';
            // Reload conversation to get updated messages
            await loadMainConversation(currentMainConversation);
            await loadMessagesList();
            await updateMessageBadge();
        } else {
            throw new Error(response.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        handleAPIError(error);
    }
}

async function acceptMainRequest() {
    if (!currentMainConversation) return;
    
    try {
        var conversationId = currentMainConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'accepted');
        
        if (response.success) {
            showToast('Request accepted! Item will be removed from feed.');
            currentMainConversation.status = 'accepted';
            loadMainConversationActions(currentMainConversation);
            await loadMessagesList();
            updateMessageBadge();
            // Reload items to remove accepted item from feed
            await loadItems();
        } else {
            throw new Error(response.message || 'Failed to accept request');
        }
    } catch (error) {
        console.error('Error accepting request:', error);
        handleAPIError(error);
    }
}

async function rejectMainRequest() {
    if (!currentMainConversation) return;
    
    if (!confirm('Are you sure you want to reject this request?')) return;
    
    try {
        var conversationId = currentMainConversation.id;
        console.log('Rejecting conversation:', conversationId);
        const response = await conversationsAPI.updateStatus(conversationId, 'rejected');
        
        console.log('Reject response:', response);
        
        if (response.success) {
            showToast('Request rejected.');
            // Update conversation status locally
            if (currentMainConversation) {
                currentMainConversation.status = 'rejected';
            }
            // Go back to messages list (which will filter out rejected conversations)
            showMessagesList();
            await updateMessageBadge();
        } else {
            throw new Error(response.message || 'Failed to reject request');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        handleAPIError(error);
    }
}

async function confirmMainReceived() {
    if (!currentMainConversation) return;
    
    try {
        var conversationId = currentMainConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'completed');
        
        if (response.success) {
            currentMainConversation.status = 'completed';
            loadMainConversationActions(currentMainConversation);
            await loadMessagesList();
            updateMessageBadge();
            
            // Open feedback modal after marking as completed
            openFeedbackModal(currentMainConversation);
        } else {
            throw new Error(response.message || 'Failed to confirm receipt');
        }
    } catch (error) {
        console.error('Error confirming receipt:', error);
        handleAPIError(error);
    }
}

async function updateMessageBadge() {
    var badge = document.getElementById('messageBadge');
    if (!badge) return;
    
    try {
        // Get conversations from API
        const response = await messagesAPI.getAll();
        
        if (!response.success || !response.data) {
            badge.style.display = 'none';
            return;
        }
        
        var conversations = response.data;
        
        // Count total unread messages across all conversations
        var unreadCount = 0;
        conversations.forEach(function(conversation) {
            if (conversation.unreadCount && conversation.unreadCount > 0) {
                unreadCount += conversation.unreadCount;
            }
        });
        
        // Show or hide badge
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating message badge:', error);
        badge.style.display = 'none';
    }
}

// Initialize messages modal event listener
if (document.getElementById('messagesModal')) {
    document.getElementById('messagesModal').addEventListener('click', function(e) {
        if (e.target.id === 'messagesModal') closeMessagesModal();
    });
}

