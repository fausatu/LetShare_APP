//Universal Conversation Modal
//============================

var globalCurrentConversation = null;

//Common function to open conversation modal (works for both profile and main app)
async function openUniversalConversationModal(conversation, options = {}) {
    globalCurrentConversation = conversation;
    var currentUser = getCurrentUserSync();
    
    //Close existing modals
    var existingModal = document.querySelector('.universal-conversation-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    //Close messages modal if it's open
    var messagesModal = document.getElementById('messagesModal');
    if (messagesModal && messagesModal.classList.contains('active')) {
        messagesModal.classList.remove('active');
        messagesModal.style.display = 'none';
    }
    
    //Prevent body scroll for the conversation modal
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    //Get conversation details from API
    try {
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
        globalCurrentConversation = {
            ...conversation,
            ...conversationData,
            messages: messages,
            status: String(conversationData.status || conversation.status || 'pending').toLowerCase().trim(),
            isOwner: Boolean(conversationData.isOwner),
            ownerId: conversationData.ownerId,
            requesterId: conversationData.requesterId,
            owner: conversationData.owner || conversation.owner || null,
            itemType: conversationData.itemType || conversation.itemType || 'exchange', // Add item type
            ownerConfirmedAt: conversationData.ownerConfirmedAt,
            requesterConfirmedAt: conversationData.requesterConfirmedAt,
            hasReviewed: conversationData.hasReviewed || false
        };
        
        var otherUser = conversationData.otherUser || (conversationData.isOwner ? conversationData.requester : conversationData.owner);
        var isOwner = conversationData.isOwner;
        var otherUserId = isOwner ? conversationData.requesterId : conversationData.ownerId;
        
        //Get online status indicator
        var onlineStatusHtml = '';
        if (conversationData.otherUserIsOnline !== undefined) {
            var isOnline = conversationData.otherUserIsOnline;
            onlineStatusHtml = '<span class="online-status ' + (isOnline ? 'online' : 'offline') + '" title="' + (isOnline ? 'Online' : 'Offline') + '"></span>';
        }
        
        //Create modal with smooth animation
        var modal = document.createElement('div');
        modal.className = 'universal-conversation-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(0px); opacity: 0; transition: opacity 0.3s ease, backdrop-filter 0.3s ease, background 0.3s ease;';
        
        //Define close action based on context
        var closeAction = options.onClose || function() {
            closeUniversalConversationModal();
        };
        
        //Add animation styles
        var styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes modalSlideIn {
                from {
                    transform: scale(0.9) translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes modalSlideOut {
                from {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: scale(0.9) translateY(-20px);
                    opacity: 0;
                }
            }
            
            .universal-conversation-modal.active .conversation-modal-content {
                animation: modalSlideIn 0.3s ease-out forwards;
            }
            
            .universal-conversation-modal.closing .conversation-modal-content {
                animation: modalSlideOut 0.25s ease-in forwards;
            }
        `;
        if (!document.querySelector('#universal-modal-animations')) {
            styleElement.id = 'universal-modal-animations';
            document.head.appendChild(styleElement);
        }
        
        modal.innerHTML = 
            '<div class="conversation-modal-content" style="background: white !important; border-radius: 1.25rem !important; padding: 0.5rem !important; max-width: 500px !important; width: 85% !important; max-height: 80vh !important; box-shadow: 0 25px 80px rgba(0,0,0,0.4) !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; position: relative !important; min-width: 320px !important; opacity: 0; transform: scale(0.9) translateY(-20px);">' +
                '<button onclick="deleteUniversalConversation()" style="position: absolute; top: 4.4rem; right: 1.5rem; background: none; border: none; color: #ef4444; cursor: pointer; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; z-index: 1;" onmouseover="this.style.background=\'rgba(239, 68, 68, 0.1)\'" onmouseout="this.style.background=\'none\'" title="Delete conversation">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M14 11v6M10 11v6"></path>' +
                    '</svg>' +
                '</button>' +
                '<button id="blockUserConvBtn" data-other-user-id="' + otherUserId + '" onclick="blockUserFromConversation(' + otherUserId + ')" style="position: absolute; top: 4.4rem; right: 3.5rem; background: none; border: none; color: #f59e0b; cursor: pointer; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; z-index: 1;" onmouseover="this.style.background=\'rgba(245, 158, 11, 0.1)\'" onmouseout="this.style.background=\'none\'" title="Block user">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<circle cx="12" cy="12" r="10"></circle>' +
                        '<path d="M4.93 4.93l14.14 14.14"></path>' +
                    '</svg>' +
                '</button>' +
                '<div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">' +
                    '<button id="convBackBtn" onclick="closeUniversalConversationModal()" style="background: none; border: none; color: #374151; cursor: pointer; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 0.5rem; transition: background 0.3s; align-self: flex-start;" onmouseover="this.style.background=\'rgba(0,0,0,0.05)\'" onmouseout="this.style.background=\'transparent\'">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<path d="M19 12H5M12 19l-7-7 7-7"></path>' +
                        '</svg>' +
                        (options.backButtonText || 'Back') +
                    '</button>' +
                    '<div class="conversation-header" style="margin-bottom: 1rem;">' +
                        '<h2 id="universalConversationTitle" style="margin-bottom: 0.5rem; font-size: 1.1rem; color: #1f2937;">' + conversationData.itemTitle + '</h2>' +
                        '<p style="color: #9ca3af; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">' + 
                            (isOwner ? (options.requestFromText || 'Request from: ') : (options.toText || 'To: ')) + '<a href="profile.html?user_id=' + otherUserId + '" style="color: #10b981; font-weight: bold; text-decoration: none;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">' + otherUser + '</a>' + onlineStatusHtml +
                        '</p>' +
                    '</div>' +
                    '<div class="conversation-messages" id="universalConversationMessages" style="flex: 1; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; scrollbar-width: thin; min-height: 80px; border: 1px solid rgba(0,0,0,0.1); border-radius: 0.75rem; background: rgba(0,0,0,0.02);"></div>' +
                    '<div class="conversation-actions" id="universalConversationActions" style="margin-bottom: 1rem; flex-shrink: 0;"></div>' +
                    '<div id="imagePreviewContainer" style="display: none; margin-bottom: 0.5rem; position: relative; flex-shrink: 0;"></div>' +
                    '<div class="conversation-input-container" style="display: flex; gap: 0.5rem; align-items: flex-end; flex-shrink: 0;">' +
                        '<input type="file" id="messageImageInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;" onchange="handleMessageImageSelect(this)">' +
                        '<button id="attachImageBtn" onclick="document.getElementById(\'messageImageInput\').click()" style="padding: 0.75rem; background: transparent; color: #6b7280; border: 1px solid rgba(0,0,0,0.2); border-radius: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 3rem; transition: all 0.3s;" onmouseover="this.style.background=\'rgba(0,0,0,0.05)\'; this.style.color=\'#3b82f6\'" onmouseout="this.style.background=\'transparent\'; this.style.color=\'#6b7280\'" title="' + (t('attachImage') || 'Attach image') + '">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' +
                                '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
                                '<polyline points="21 15 16 10 5 21"></polyline>' +
                            '</svg>' +
                        '</button>' +
                        '<input type="text" class="conversation-input" id="universalConversationInput" placeholder="Type a message..." onkeypress="if(event.key===\'Enter\') sendUniversalMessage()" style="flex: 1; padding: 0.75rem; border: 1px solid rgba(0,0,0,0.2); background: white; border-radius: 0.75rem; color: #1f2937; outline: none; transition: all 0.3s; font-size: 0.875rem;" onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'rgba(0,0,0,0.2)\'">' +
                        '<button class="conversation-send" onclick="sendUniversalMessage()" style="padding: 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 3rem; transition: background 0.3s;" onmouseover="this.style.background=\'#2563eb\'" onmouseout="this.style.background=\'#3b82f6\'">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>' +
                            '</svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        
        // Attach closeAction to Back button (returns to conversation list)
        var backBtn = document.getElementById('convBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function() { closeAction(); });
        }
        
        //Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        //Trigger animation after a brief delay to ensure CSS is applied
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                modal.style.opacity = '1';
                modal.style.background = 'rgba(0,0,0,0.5)';
                modal.style.backdropFilter = 'blur(4px)';
                modal.classList.add('active');
            });
        });
        
        //Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAction();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function handleEscapeKey(e) {
            if (e.key === 'Escape') {
                closeAction();
                document.removeEventListener('keydown', handleEscapeKey);
            }
        });
        
        loadUniversalConversationMessages(globalCurrentConversation);
        loadUniversalConversationActions(globalCurrentConversation);
        
        // Translate item title if needed and update global conversation
        (function() {
            var titleEl = document.getElementById('universalConversationTitle');
            if (titleEl && conversationData.itemTitle && typeof autoTranslateText === 'function') {
                var userLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'fr';
                var itemSourceLang = conversationData.userLang || conversationData.user_lang || conversationData.lang || 'fr';
                
                if (userLang !== itemSourceLang) {
                    autoTranslateText(conversationData.itemTitle, userLang, itemSourceLang).then(function(translated) {
                        if (translated && titleEl) {
                            titleEl.textContent = translated;
                            // Update global conversation so we use translated title in confirmations
                            globalCurrentConversation.itemTitle = translated;
                        }
                    }).catch(function(err) {
                    });
                }
            }
        })();
        
        // Subscribe to Pusher for real-time messages
        var dbConversationId = globalCurrentConversation.dbId || conversationData.dbId;
        if (dbConversationId && typeof subscribeToConversation === 'function') {
            await subscribeToConversation(dbConversationId, 
                // onMessage callback
                function(msgData) {
                    var currentUser = getCurrentUserSync();
                    // Don't add message if it's from current user (already added locally)
                    if (Number(msgData.from_user_id) === Number(currentUser.id)) {
                        return;
                    }
                    appendRealtimeMessage(msgData);
                    
                    // Mark incoming message as read immediately since we're viewing the conversation
                    var convId = globalCurrentConversation ? globalCurrentConversation.id : null;
                    if (convId && typeof conversationsAPI !== 'undefined') {
                        conversationsAPI.markRead(convId).catch(function(err) {
                        });
                    }
                },
                // onTyping callback
                null,
                // onStatusUpdate callback
                function(statusData) {
                    if (statusData.status) {
                        globalCurrentConversation.status = statusData.status;
                        loadUniversalConversationActions(globalCurrentConversation);
                    }
                }
            );
            
            // Listen for messages-read event to update sent message read receipts
            if (typeof currentChannel !== 'undefined' && currentChannel) {
                currentChannel.bind('messages-read', function(data) {
                    var currentUser = getCurrentUserSync();
                    // Only update if the OTHER user read our messages
                    if (Number(data.readByUserId) !== Number(currentUser.id)) {
                        updateAllSentReadReceipts(data.readAt);
                    }
                });
                
                // Listen for reaction updates
                currentChannel.bind('reaction-update', function(data) {
                    if (data.message_id && data.reactions) {
                        updateMessageReactions(data.message_id, data.reactions);
                    }
                });
            }
        }
        
    } catch (error) {
        showToast(t('errorLoadingConversation'), 'error');
    }
}

function closeUniversalConversationModal() {
    // Unsubscribe from Pusher channel
    if (typeof unsubscribeFromConversation === 'function') {
        unsubscribeFromConversation();
    }
    
    // Refresh unread badge since messages may have been read
    if (typeof updateMessageBadge === 'function') {
        updateMessageBadge();
    }
    // Refresh messages list if visible
    if (typeof loadMessagesList === 'function') {
        loadMessagesList();
    }
    
    var modal = document.querySelector('.universal-conversation-modal');
    if (modal) {
        // Add closing animation
        modal.classList.remove('active');
        modal.classList.add('closing');
        modal.style.opacity = '0';
        modal.style.background = 'rgba(0,0,0,0)';
        modal.style.backdropFilter = 'blur(0px)';
        
        // Remove modal after animation completes
        setTimeout(function() {
            modal.remove();
        }, 250);
    }
    
    // Check if we should return to messages list
    var messagesModal = document.getElementById('messagesModal');
    if (messagesModal) {
        // Reopen messages modal with proper scroll prevention
        messagesModal.classList.add('active');
        messagesModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        
        // Call showMessagesList to refresh the list
        if (typeof showMessagesList === 'function') {
            showMessagesList();
        }
    } else {
        // If no messages modal, restore normal scroll
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
    
    globalCurrentConversation = null;
}

/**
 * Append a real-time message to the conversation
 */
function appendRealtimeMessage(msgData) {
    var messagesContainer = document.getElementById('universalConversationMessages');
    if (!messagesContainer) return;
    
    var currentUser = getCurrentUserSync();
    var isSent = Number(msgData.from_user_id) === Number(currentUser.id);

    var messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (isSent ? 'message-sent' : 'message-received');
    messageDiv.style.animation = 'fadeInUp 0.3s ease';
    if (msgData.id) messageDiv.setAttribute('data-message-id', msgData.id);

    var timeDisplay = '<span class="message-time">' + (typeof formatDate === 'function' ? formatDate(msgData.timestamp) : 'Just now') + '</span>';

    // Add read receipt for sent messages
    var readReceipt = '';
    if (isSent) {
        if (msgData.read && msgData.read_at) {
            readReceipt = '<span class="read-receipt read" title="Read">✓✓</span>';
        } else {
            readReceipt = '<span class="read-receipt pending" title="Sent">✓</span>';
        }
    }

    var imageHtml = '';
    if (msgData.image) {
        imageHtml = '<div class="message-image-wrapper"><img src="' + escapeHtml(msgData.image) + '" class="message-image" onclick="openMessageImageLightbox(this.src)" alt="Image"></div>';
    } else if (msgData.has_image && msgData.id) {
        // Image received via Pusher (no base64 due to size limit) — fetch it
        imageHtml = '<div class="message-image-wrapper"><div class="message-image-loading">📷 Loading...</div></div>';
    }
    
    var textHtml = '';
    if (msgData.text) {
        textHtml = '<p>' + escapeHtml(msgData.text) + '</p>';
    }

    messageDiv.innerHTML = 
        '<div class="message-content">' +
            imageHtml +
            textHtml +
            '<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem;">' +
                timeDisplay +
                (isSent ? '<div style="margin-left: auto;">' + readReceipt + '</div>' : '') +
            '</div>' +
            '<div class="reactions-container" data-msg-id="' + (msgData.id || '') + '"></div>' +
        '</div>';

    messagesContainer.appendChild(messageDiv);
    
    // Double-click to react
    if (msgData.id) {
        messageDiv.addEventListener('dblclick', function(e) {
            e.preventDefault();
            openEmojiPicker(msgData.id, messageDiv);
        });
    }

    // Auto-translate received messages if needed
    if (!isSent && msgData.text) {
        var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
        autoTranslateText(msgData.text, userLang).then(function(translated) {
            var contentP = messageDiv.querySelector('.message-content p');
            if (contentP && translated && translated !== msgData.text) {
                contentP.textContent = translated;
            }
        }).catch(function(error) {
            // Translation failed, display original text
        });
    }

    // Scroll to bottom
    setTimeout(function() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);

    // Play notification sound for received messages
    if (!isSent) {
        playMessageSound();
    }
    
    // Fetch image from server if we only got the has_image flag (Pusher size limit)
    if (!msgData.image && msgData.has_image && msgData.id) {
        conversationsAPI.getMessageImage(msgData.id).then(function(response) {
            if (response.success && response.data && response.data.image) {
                var wrapper = messageDiv.querySelector('.message-image-wrapper');
                if (wrapper) {
                    wrapper.innerHTML = '<img src="' + escapeHtml(response.data.image) + '" class="message-image" onclick="openMessageImageLightbox(this.src)" alt="Image">';
                }
            }
        }).catch(function() {
            var wrapper = messageDiv.querySelector('.message-image-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '<div class="message-image-loading">📷</div>';
            }
        });
    }
}

/**
 * Update all sent message read receipts to "read" (✓✓) when the other user reads them
 */
function updateAllSentReadReceipts(readAt) {
    var messagesContainer = document.getElementById('universalConversationMessages');
    if (!messagesContainer) return;
    
    // Find all sent messages with pending/sent receipt and update to read
    var pendingReceipts = messagesContainer.querySelectorAll('.message-sent .read-receipt.pending, .message-sent .read-receipt.sent');
    pendingReceipts.forEach(function(receipt) {
        receipt.className = 'read-receipt read';
        receipt.title = 'Read';
        receipt.textContent = '✓✓';
    });
}

/**
 * Play a subtle notification sound for new messages
 */
function playMessageSound() {
    try {
        // Create a simple beep using Web Audio API
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Ignore audio errors
    }
}

/**
 * Open a fullscreen lightbox to view a message image
 */
function openMessageImageLightbox(src) {
    var existing = document.getElementById('messageImageLightbox');
    if (existing) existing.remove();
    
    var overlay = document.createElement('div');
    overlay.id = 'messageImageLightbox';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10010; display: flex; align-items: center; justify-content: center; cursor: zoom-out; animation: fadeIn 0.2s ease;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 0.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5);';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position: absolute; top: 1rem; right: 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.3s;';
    closeBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.4)'; };
    closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.2)'; };
    closeBtn.onclick = function() { overlay.remove(); };
    
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
}

// ========================
// Emoji Reactions
// ========================

var REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/**
 * Build HTML for reactions displayed under a message
 */
function buildReactionsHtml(reactions, messageId) {
    if (!reactions || reactions.length === 0) return '<div class="reactions-container" data-msg-id="' + (messageId || '') + '"></div>';
    
    var currentUser = getCurrentUserSync();
    var html = '<div class="reactions-container" data-msg-id="' + (messageId || '') + '">';
    reactions.forEach(function(r) {
        var userReacted = r.user_ids && r.user_ids.indexOf(Number(currentUser.id)) !== -1;
        html += '<button class="reaction-badge' + (userReacted ? ' reaction-mine' : '') + '" onclick="toggleReaction(' + messageId + ', \'' + r.emoji + '\')" title="' + r.emoji + '">';
        html += '<span class="reaction-emoji">' + r.emoji + '</span>';
        if (r.count > 1) html += '<span class="reaction-count">' + r.count + '</span>';
        html += '</button>';
    });
    html += '</div>';
    return html;
}

/**
 * Open emoji picker for a message
 */
function openEmojiPicker(messageId, messageDiv) {
    // Close any existing picker
    var existing = document.querySelector('.emoji-picker-popup');
    if (existing) existing.remove();
    
    var picker = document.createElement('div');
    picker.className = 'emoji-picker-popup';
    
    var buttonsHtml = '';
    REACTION_EMOJIS.forEach(function(emoji) {
        buttonsHtml += '<button class="emoji-pick-btn" onclick="toggleReaction(' + messageId + ', \'' + emoji + '\'); this.closest(\'.emoji-picker-popup\').remove();">' + emoji + '</button>';
    });
    picker.innerHTML = buttonsHtml;
    
    // Position near the message
    var msgContent = messageDiv.querySelector('.message-content');
    if (msgContent) {
        msgContent.style.position = 'relative';
        msgContent.appendChild(picker);
    } else {
        messageDiv.appendChild(picker);
    }
    
    // Close picker when clicking outside
    setTimeout(function() {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target) && !messageDiv.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 10);
}

/**
 * Toggle a reaction on a message (add/remove)
 */
function toggleReaction(messageId, emoji) {
    if (!globalCurrentConversation) return;
    var conversationId = globalCurrentConversation.id;
    
    conversationsAPI.toggleReaction(conversationId, messageId, emoji).then(function(response) {
        if (response.success && response.data) {
            updateMessageReactions(messageId, response.data.reactions);
        }
    }).catch(function(err) {
    });
}

/**
 * Update the reactions display for a specific message
 */
function updateMessageReactions(messageId, reactions) {
    var container = document.querySelector('.reactions-container[data-msg-id="' + messageId + '"]');
    if (!container) return;
    
    var currentUser = getCurrentUserSync();
    container.innerHTML = '';
    
    if (reactions && reactions.length > 0) {
        reactions.forEach(function(r) {
            var userReacted = r.user_ids && r.user_ids.indexOf(Number(currentUser.id)) !== -1;
            var btn = document.createElement('button');
            btn.className = 'reaction-badge' + (userReacted ? ' reaction-mine' : '');
            btn.title = r.emoji;
            btn.onclick = function() { toggleReaction(messageId, r.emoji); };
            btn.innerHTML = '<span class="reaction-emoji">' + r.emoji + '</span>' +
                (r.count > 1 ? '<span class="reaction-count">' + r.count + '</span>' : '');
            container.appendChild(btn);
        });
    }
}

function loadUniversalConversationMessages(conversation) {
    var messagesContainer = document.getElementById('universalConversationMessages');
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
    
    var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
    
    // Display all messages immediately with original text
    var messageElements = [];
    messages.forEach(function(message, index) {
        var messageDiv = document.createElement('div');
        var isSent = message.is_sent || 
                    (message.from_user_id && currentUser.id && message.from_user_id === currentUser.id) ||
                    (message.senderId && currentUser.id && message.senderId === currentUser.id) ||
                    (message.from && currentUser.name && message.from === currentUser.name);
                    
        messageDiv.className = 'message ' + (isSent ? 'message-sent' : 'message-received');
        if (message.id) messageDiv.setAttribute('data-message-id', message.id);
        
        // Show timestamp only if it's the first message or if there's a significant time gap (5 minutes)
        var showTime = index === 0;
        if (index > 0) {
            var prevMessage = messages[index - 1];
            var currentTime = new Date(message.timestamp || message.created_at);
            var prevTime = new Date(prevMessage.timestamp || prevMessage.created_at);
            var timeDiff = currentTime - prevTime;
            showTime = timeDiff > 300000; // 5 minutes
        }
        
        var timeDisplay = showTime ? '<span class="message-time">' + (typeof formatMessageDate === 'function' ? formatMessageDate(message.timestamp || message.created_at) : new Date(message.timestamp || message.created_at).toLocaleString()) + '</span>' : '';
        
        // Read receipt for sent messages
        var readReceipt = '';
        if (isSent) {
            if (message.read && message.read_at) {
                readReceipt = '<span class="read-receipt read" title="Read">✓✓</span>';
            } else if (message.read) {
                readReceipt = '<span class="read-receipt sent" title="Sent">✓</span>';
            } else {
                readReceipt = '<span class="read-receipt pending" title="Pending">⏱</span>';
            }
        }
        
        // Display with original text first
        var imageHtml = '';
        if (message.image) {
            imageHtml = '<div class="message-image-wrapper"><img src="' + escapeHtml(message.image) + '" class="message-image" onclick="openMessageImageLightbox(this.src)" alt="Image"></div>';
        }
        
        var textHtml = '';
        if (message.text) {
            textHtml = '<p class="message-text">' + message.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
        }
        
        var reactionsHtml = buildReactionsHtml(message.reactions || [], message.id);
        
        messageDiv.innerHTML = 
            '<div class="message-content">' +
                imageHtml +
                textHtml +
                '<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem;">' +
                    timeDisplay +
                    (isSent ? '<div style="margin-left: auto;">' + readReceipt + '</div>' : '') +
                '</div>' +
                reactionsHtml +
            '</div>';
        messagesContainer.appendChild(messageDiv);
        
        // Double-click to react with emoji
        if (message.id) {
            messageDiv.addEventListener('dblclick', function(e) {
                e.preventDefault();
                openEmojiPicker(message.id, messageDiv);
            });
        }
        
        // Store for later translation
        messageElements.push({
            element: messageDiv,
            message: message,
            isSent: isSent,
            index: index
        });
    });
    
    // Scroll to bottom
    setTimeout(function() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
    
    // Now translate messages and update them one by one
    messageElements.forEach(function(item) {
        if (!item.isSent && item.message.text) {
            // Let Google Translate auto-detect source language for accurate translation
            autoTranslateText(item.message.text, userLang).then(function(translated) {
                var textEl = item.element.querySelector('.message-text');
                if (textEl && translated && translated !== item.message.text) {
                    textEl.textContent = translated;
                }
            }).catch(function(error) {
                // Translation failed, display original text
            });
        }
    });
}

function loadUniversalConversationActions(conversation) {
    var actionsContainer = document.getElementById('universalConversationActions');
    if (!actionsContainer) return;
    actionsContainer.innerHTML = '';
    
    var currentUser = getCurrentUserSync();
    var isOwner = false;
    
    // Determine ownership
    if (conversation.ownerId !== undefined && conversation.ownerId !== null && currentUser && currentUser.id) {
        var ownerIdNum = Number(conversation.ownerId);
        var currentUserIdNum = Number(currentUser.id);
        isOwner = (ownerIdNum === currentUserIdNum);
    } else if (conversation.isOwner !== undefined && conversation.isOwner !== null) {
        isOwner = Boolean(conversation.isOwner);
    }
    
    var status = String(conversation.status || 'pending').toLowerCase().trim();
    var itemType = conversation.itemType || 'exchange';
    var isDonation = itemType === 'donation';
    
    // Show appropriate action buttons based on item type and status
    if (isOwner === true && status === 'pending') {
        // Owner can accept/reject pending requests (same for both donations and exchanges)
        actionsContainer.innerHTML = 
            '<div class="conversation-buttons">' +
                '<button class="btn-accept" onclick="acceptUniversalRequest()" style="background: #10b981; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; margin-right: 0.5rem;">' + t('acceptBtn') + '</button>' +
                '<button class="btn-reject" onclick="rejectUniversalRequest()" style="background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">' + t('rejectBtn') + '</button>' +
            '</div>';
    } else if (status === 'accepted') {
        // After acceptance, different logic for donations vs exchanges
        if (isDonation && !isOwner) {
            // DONATION: Only requester can confirm receipt
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons">' +
                    '<button class="btn-confirm" onclick="confirmUniversalReceived()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">' + t('confirmDonationReceived') + '</button>' +
                '</div>';
        } else if (isDonation && isOwner) {
            // DONATION OWNER: Show waiting message + cancel button
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">' +
                    '<div style="background: #dbeafe; color: #1d4ed8; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem; width: 100%;">' +
                        '<strong>' + t('waitingForRequester') + '</strong><br>' +
                        '<span style="font-size: 0.8125rem; opacity: 0.85;">' + t('youCanCancelIfNeeded') + '</span>' +
                    '</div>' +
                    '<button class="btn-cancel-acceptance" onclick="cancelUniversalAcceptance()" style="background: #ef4444; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; font-size: 0.8125rem; width: 100%;">' + t('cancelAcceptance') + '</button>' +
                '</div>';
        } else if (!isDonation) {
            // EXCHANGE: Both parties can confirm completion + owner can cancel
            var buttonText = t('confirmExchangeComplete');
            var cancelHtml = isOwner 
                ? '<button class="btn-cancel-acceptance" onclick="cancelUniversalAcceptance()" style="background: #ef4444; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; font-size: 0.8125rem; width: 100%;">' + t('cancelAcceptance') + '</button>'
                : '';
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">' +
                    '<button class="btn-confirm" onclick="confirmUniversalReceived()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; width: 100%;">' + buttonText + '</button>' +
                    cancelHtml +
                '</div>';
        }
    } else if (status === 'partial_confirmed' && !isDonation) {
        // EXCHANGE: Show status based on who has confirmed
        var ownerConfirmed = conversation.ownerConfirmedAt;
        var requesterConfirmed = conversation.requesterConfirmedAt;
        
        if ((isOwner && !ownerConfirmed) || (!isOwner && !requesterConfirmed)) {
            // This user hasn't confirmed yet
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons">' +
                    '<div style="background: #fbbf24; color: #92400e; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; text-align: center;">' +
                        '<strong>⚠️ ' + t('partnerConfirmedExchange') + '</strong><br>' +
                        t('pleaseConfirmYourSide') +
                    '</div>' +
                    '<button class="btn-confirm" onclick="confirmUniversalReceived()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">' + t('confirmExchangeComplete') + '</button>' +
                '</div>';
        } else {
            // This user has already confirmed, waiting for the other
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons">' +
                    '<div style="background: #dbeafe; color: #1d4ed8; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem;">' +
                        '<strong>✓ ' + t('youConfirmedExchange') + '</strong><br>' +
                        t('waitingPartnerConfirm') + '<br>' +
                        '<small style="opacity: 0.7;">' + t('autoCompleteIn7Days') + '</small>' +
                    '</div>' +
                '</div>';
        }
    } else if (status === 'cancelled') {
        // CANCELLED: Item was deleted by its owner
        var cancelledTitle, cancelledSub;
        if (isOwner) {
            cancelledTitle = 'Vous avez retiré cet article';
            cancelledSub = '';
        } else {
            cancelledTitle = t('badgeCancelled');
            cancelledSub = t('itemDeletedByOwner');
        }
        actionsContainer.innerHTML = 
            '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center;">' +
                '<div style="background: #f3f4f6; color: #6b7280; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem; width: 100%;">' +
                    '<strong>' + cancelledTitle + '</strong>' + (cancelledSub ? '<br><span style="font-size: 0.8125rem; opacity: 0.85;">' + cancelledSub + '</span>' : '') +
                '</div>' +
            '</div>';
        // Hide message input
        var inputContainer = document.querySelector('.conversation-input-container');
        if (inputContainer) inputContainer.style.display = 'none';
    } else if (status === 'rejected') {
        // REJECTED: Distinguish between manual rejection and auto-rejection (item taken)
        var itemStatus = (conversation.itemStatus || '').toLowerCase();
        var isItemTaken = (itemStatus === 'accepted' || itemStatus === 'completed' || itemStatus === 'deleted');

        var headerText, subText, bgColor, textColor;
        if (isItemTaken) {
            headerText = t('itemNoLongerAvailableStatus');
            subText = t('itemTakenByAnother');
            bgColor = '#fef3c7';
            textColor = '#92400e';
        } else {
            // Si l'utilisateur courant est l'owner, il vient de refuser la demande
            if (isOwner) {
                headerText = 'Vous avez refusé la demande';
                subText = '';
            } else {
                headerText = t('requestDeclined');
                subText = t('canResendIfAvailable');
            }
            bgColor = '#fee2e2';
            textColor = '#991b1b';
        }
        actionsContainer.innerHTML = 
            '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center;">' +
                '<div style="background: ' + bgColor + '; color: ' + textColor + '; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem; width: 100%;">' +
                    '<strong>' + headerText + '</strong>' + (subText ? '<br><span style="font-size: 0.8125rem; opacity: 0.85;">' + subText + '</span>' : '') +
                '</div>' +
            '</div>';
        // Hide message input
        var inputContainer = document.querySelector('.conversation-input-container');
        if (inputContainer) inputContainer.style.display = 'none';
    } else if (status === 'completed') {
        // COMPLETED: Show completion status and allow review if not already done
        var isDonation = itemType === 'donation';
        var hasReviewed = conversation.hasReviewed || false;
        var canReview = false;
        
        // For donations: requester can review the owner
        // For exchanges: both parties can review each other
        if (isDonation) {
            canReview = !isOwner;
        } else {
            canReview = true;
        }
        
        if (canReview && !hasReviewed) {
            // User can leave a review (hasn't done so yet)
            var statusLabel = isDonation ? t('donationReceived') : t('exchangeCompletedStatus');
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center;">' +
                    '<div style="background: #dbeafe; color: #1d4ed8; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; text-align: center; width: 100%;">' +
                        '<strong>✓ ' + statusLabel + '</strong>' +
                    '</div>' +
                    '<button class="btn-review" onclick="openFeedbackFromConversation()" style="background: #10b981; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; width: 100%;">' + t('leaveAReview') + '</button>' +
                '</div>';
        } else {
            // Already reviewed or cannot review
            var statusLabel = isDonation ? t('donationReceived') : t('exchangeCompletedStatus');
            var completedText = hasReviewed 
                ? t('reviewSubmitted')
                : (isDonation ? t('donationCompleted') : t('exchangeHasBeenCompleted'));
            actionsContainer.innerHTML = 
                '<div class="conversation-buttons" style="display: flex; flex-direction: column; align-items: center;">' +
                    '<div style="background: #dbeafe; color: #1d4ed8; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem; width: 100%;">' +
                        '<strong>✓ ' + statusLabel + '</strong><br>' +
                        '<span style="font-size: 0.8125rem; opacity: 0.85;">' + completedText + '</span>' +
                    '</div>' +
                '</div>';
        }
        // Hide message input for completed conversations
        var inputContainer = document.querySelector('.conversation-input-container');
        if (inputContainer) inputContainer.style.display = 'none';
    }
}

// Pending image for message send
var pendingMessageImage = null;

/**
 * Handle image file selection for message
 */
function handleMessageImageSelect(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    
    // Validate file type
    var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.indexOf(file.type) === -1) {
        showToast(t('invalidImageFormat') || 'Invalid image format. Use JPEG, PNG, GIF or WebP.', 'error');
        input.value = '';
        return;
    }
    
    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showToast(t('imageTooLarge') || 'Image too large. Maximum 5MB.', 'error');
        input.value = '';
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        pendingMessageImage = e.target.result;
        showImagePreview(pendingMessageImage);
    };
    reader.readAsDataURL(file);
    input.value = '';
}

/**
 * Show image preview before sending
 */
function showImagePreview(imageSrc) {
    var container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = 
        '<div style="position: relative; display: inline-block; max-width: 150px;">' +
            '<img src="' + escapeHtml(imageSrc) + '" style="max-width: 150px; max-height: 100px; border-radius: 0.5rem; border: 2px solid #3b82f6; object-fit: cover;">' +
            '<button onclick="clearMessageImage()" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">&times;</button>' +
        '</div>';
}

/**
 * Clear pending image
 */
function clearMessageImage() {
    pendingMessageImage = null;
    var container = document.getElementById('imagePreviewContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

async function sendUniversalMessage() {
    if (!globalCurrentConversation) return;
    
    var input = document.getElementById('universalConversationInput');
    if (!input) return;
    var messageText = input.value.trim();
    var imageToSend = pendingMessageImage;
    
    if (!messageText && !imageToSend) return;
    
    // Clear input and image immediately for better UX
    input.value = '';
    clearMessageImage();
    
    // Add message to UI immediately (optimistic update)
    var currentUser = getCurrentUserSync();
    appendRealtimeMessage({
        from_user_id: currentUser.id,
        text: messageText || null,
        image: imageToSend || null,
        timestamp: new Date().toISOString(),
        read: false
    });
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.sendMessage(conversationId, messageText || '', imageToSend);
        
        if (response.success) {
            // Update message list and badge if functions exist (in background)
            if (typeof loadMessagesList === 'function') {
                loadMessagesList();
            }
            if (typeof updateMessageBadge === 'function') {
                updateMessageBadge();
            }
        } else {
            throw new Error(response.message || 'Failed to send message');
        }
    } catch (error) {
        showToast(t('failedToSendMessage'), 'error');
    }
}

async function acceptUniversalRequest() {
    if (!globalCurrentConversation) return;
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'accepted');
        
        if (response.success) {
            showToast(t('requestAcceptedToast'));
            globalCurrentConversation.status = 'accepted';
            loadUniversalConversationActions(globalCurrentConversation);
            
            // Reload items if function exists
            if (typeof loadItems === 'function') {
                await loadItems();
            }
        } else {
            throw new Error(response.message || 'Failed to accept request');
        }
    } catch (error) {
        showToast(t('failedToAcceptRequest'), 'error');
    }
}

async function rejectUniversalRequest() {
    if (!globalCurrentConversation) return;
    
    showRejectConfirmationModal();
}

function showRejectConfirmationModal() {
    if (!globalCurrentConversation) return;
    
    // Create modal backdrop
    var modal = document.createElement('div');
    modal.className = 'reject-confirmation-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px);';
    
    // Create modal content
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.2s ease-out;';
    
    var itemTitle = globalCurrentConversation.itemTitle || 'this item';
    var otherUser = globalCurrentConversation.requester || globalCurrentConversation.otherUser || 'this user';
    
    // Get translations
    var rejectTitle = typeof t === 'function' ? t('rejectRequestTitle') : 'Reject Request';
    var rejectConfirm = typeof t === 'function' ? t('rejectRequestConfirm') : 'Are you sure you want to reject this request for';
    var actionCannotBeUndone = typeof t === 'function' ? t('actionCannotBeUndone') : 'This action cannot be undone';
    var requesterNotified = typeof t === 'function' ? t('requesterWillBeNotified') : 'The requester will be notified that their request has been rejected.';
    var cancelText = typeof t === 'function' ? t('cancel') : 'Cancel';
    var rejectBtnText = typeof t === 'function' ? t('rejectRequest') : 'Reject Request';
    
    modalContent.innerHTML = 
        '<div style="text-align: center; margin-bottom: 1.5rem;">' +
            '<div style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">' +
                    '<circle cx="12" cy="12" r="10"></circle>' +
                    '<line x1="15" y1="9" x2="9" y2="15"></line>' +
                    '<line x1="9" y1="9" x2="15" y2="15"></line>' +
                '</svg>' +
            '</div>' +
            '<h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.375rem; font-weight: 600;">' + rejectTitle + '</h3>' +
            '<p style="margin: 0; color: #6b7280; font-size: 0.9375rem; line-height: 1.5;">' + rejectConfirm + ' <strong>"' + itemTitle + '"</strong> ?</p>' +
        '</div>' +
        '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">' +
            '<div style="display: flex; align-items: flex-start; gap: 0.75rem;">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">' +
                    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
                    '<line x1="12" y1="9" x2="12" y2="13"></line>' +
                    '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
                '</svg>' +
                '<div>' +
                    '<p style="margin: 0 0 0.25rem 0; color: #92400e; font-size: 0.875rem; font-weight: 500;">' + actionCannotBeUndone + '</p>' +
                    '<p style="margin: 0; color: #b45309; font-size: 0.8125rem; line-height: 1.4;">' + requesterNotified + '</p>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
            '<button id="cancelRejectBtn" style="padding: 0.875rem 1.75rem; border: 1px solid #d1d5db; background: white; border-radius: 0.75rem; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#f9fafb\'; this.style.borderColor=\'#9ca3af\'" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#d1d5db\'">' + cancelText + '</button>' +
            '<button id="confirmRejectBtn" style="padding: 0.875rem 1.75rem; border: none; background: #ef4444; border-radius: 0.75rem; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">' + rejectBtnText + '</button>' +
        '</div>';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on escape key
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }
    document.addEventListener('keydown', handleEscapeKey);
    
    // Cancel button
    document.getElementById('cancelRejectBtn').addEventListener('click', function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    });
    
    // Confirm button
    document.getElementById('confirmRejectBtn').addEventListener('click', async function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
        await confirmRejectRequest();
    });
}

async function confirmRejectRequest() {
    if (!globalCurrentConversation) return;
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'rejected');
        
        if (response.success) {
            showToast(t('requestRejectedToast'));
            closeUniversalConversationModal();
        } else {
            throw new Error(response.message || 'Failed to reject request');
        }
    } catch (error) {
        showToast(t('failedToRejectRequest'), 'error');
    }
}

async function cancelUniversalAcceptance() {
    if (!globalCurrentConversation) return;
    showCancelAcceptanceModal();
}

function showCancelAcceptanceModal() {
    if (!globalCurrentConversation) return;
    
    var modal = document.createElement('div');
    modal.className = 'cancel-acceptance-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px);';
    
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.2s ease-out;';
    
    var itemTitle = globalCurrentConversation.itemTitle || 'this item';
    
    var cancelTitle = t('cancelAcceptanceTitle');
    var cancelConfirm = t('cancelAcceptanceConfirm');
    var cancelWarning = t('cancelAcceptanceWarning');
    var requesterNotified = t('requesterWillBeNotifiedCancel');
    var cancelText = t('cancel');
    var cancelBtnText = t('cancelAcceptanceBtn');
    
    modalContent.innerHTML = 
        '<div style="text-align: center; margin-bottom: 1.5rem;">' +
            '<div style="width: 56px; height: 56px; background: rgba(245, 158, 11, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">' +
                    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
                    '<line x1="12" y1="9" x2="12" y2="13"></line>' +
                    '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
                '</svg>' +
            '</div>' +
            '<h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.375rem; font-weight: 600;">' + cancelTitle + '</h3>' +
            '<p style="margin: 0; color: #6b7280; font-size: 0.9375rem; line-height: 1.5;">' + cancelConfirm + ' <strong>"' + itemTitle + '"</strong> ?</p>' +
        '</div>' +
        '<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">' +
            '<div style="display: flex; align-items: flex-start; gap: 0.75rem;">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">' +
                    '<circle cx="12" cy="12" r="10"></circle>' +
                    '<line x1="12" y1="8" x2="12" y2="12"></line>' +
                    '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
                '</svg>' +
                '<div>' +
                    '<p style="margin: 0 0 0.25rem 0; color: #92400e; font-size: 0.875rem; font-weight: 500;">' + cancelWarning + '</p>' +
                    '<p style="margin: 0; color: #b45309; font-size: 0.8125rem; line-height: 1.4;">' + requesterNotified + '</p>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
            '<button id="cancelCancelBtn" style="padding: 0.875rem 1.75rem; border: 1px solid #d1d5db; background: white; border-radius: 0.75rem; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#f9fafb\'; this.style.borderColor=\'#9ca3af\'" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#d1d5db\'">' + cancelText + '</button>' +
            '<button id="confirmCancelBtn" style="padding: 0.875rem 1.75rem; border: none; background: #ef4444; border-radius: 0.75rem; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">' + cancelBtnText + '</button>' +
        '</div>';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }
    document.addEventListener('keydown', handleEscapeKey);
    
    document.getElementById('cancelCancelBtn').addEventListener('click', function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    });
    
    document.getElementById('confirmCancelBtn').addEventListener('click', async function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
        await confirmCancelAcceptance();
    });
}

async function confirmCancelAcceptance() {
    if (!globalCurrentConversation) return;
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'cancel_accepted');
        
        if (response.success) {
            showToast(t('acceptanceCancelledSuccess'));
            globalCurrentConversation.status = 'cancelled';
            loadUniversalConversationActions(globalCurrentConversation);
            
            // Reload items if function exists (to re-show the item)
            if (typeof loadItems === 'function') {
                await loadItems();
            }
        } else {
            throw new Error(response.message || t('acceptanceCancelledFailed'));
        }
    } catch (error) {
        showToast(t('acceptanceCancelledFailed'), 'error');
    }
}

async function confirmUniversalReceived() {
    if (!globalCurrentConversation) return;
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.updateStatus(conversationId, 'completed');
        
        if (response.success) {
            globalCurrentConversation.status = 'completed';
            loadUniversalConversationActions(globalCurrentConversation);
            
            // Open feedback modal if function exists
            if (typeof openFeedbackModal === 'function') {
                openFeedbackModal(globalCurrentConversation);
            }
        } else {
            throw new Error(response.message || 'Failed to confirm receipt');
        }
    } catch (error) {
        showToast(t('failedToConfirmReceipt'), 'error');
    }
}

async function deleteUniversalConversation() {
    if (!globalCurrentConversation) return;
    
    showDeleteConfirmationModal();
}

function showDeleteConfirmationModal() {
    if (!globalCurrentConversation) return;
    
    // Create modal backdrop
    var modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px);';
    
    // Create modal content
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.2s ease-out;';
    
    var itemTitle = globalCurrentConversation.itemTitle || 'this item';
    
    // Get translations
    var deleteTitle = typeof t === 'function' ? t('deleteConversationTitle') : 'Delete Conversation';
    var deleteConfirm = typeof t === 'function' ? t('deleteConversationConfirm') : 'Are you sure you want to delete this conversation about';
    var hideOnlyForYou = typeof t === 'function' ? t('hideOnlyForYou') : 'This will only hide it for you';
    var otherCanSee = typeof t === 'function' ? t('otherPersonCanStillSee') : 'The other person will still be able to see the conversation and send messages.';
    var cancelText = typeof t === 'function' ? t('cancel') : 'Cancel';
    var deleteBtnText = typeof t === 'function' ? t('deleteConversation') : 'Delete Conversation';
    
    modalContent.innerHTML = 
        '<div style="text-align: center; margin-bottom: 1.5rem;">' +
            '<div style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">' +
                    '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M14 11v6M10 11v6"></path>' +
                '</svg>' +
            '</div>' +
            '<h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.375rem; font-weight: 600;">' + deleteTitle + '</h3>' +
            '<p style="margin: 0; color: #6b7280; font-size: 0.9375rem; line-height: 1.5;">' + deleteConfirm + ' <strong>"' + itemTitle + '"</strong> ?</p>' +
        '</div>' +
        '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">' +
            '<div style="display: flex; align-items: flex-start; gap: 0.75rem;">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">' +
                    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
                    '<line x1="12" y1="9" x2="12" y2="13"></line>' +
                    '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
                '</svg>' +
                '<div>' +
                    '<p style="margin: 0 0 0.25rem 0; color: #92400e; font-size: 0.875rem; font-weight: 500;">' + hideOnlyForYou + '</p>' +
                    '<p style="margin: 0; color: #b45309; font-size: 0.8125rem; line-height: 1.4;">' + otherCanSee + '</p>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
            '<button id="cancelDeleteBtn" style="padding: 0.875rem 1.75rem; border: 1px solid #d1d5db; background: white; border-radius: 0.75rem; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#f9fafb\'; this.style.borderColor=\'#9ca3af\'" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#d1d5db\'">' + cancelText + '</button>' +
            '<button id="confirmDeleteBtn" style="padding: 0.875rem 1.75rem; border: none; background: #ef4444; border-radius: 0.75rem; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">' + deleteBtnText + '</button>' +
        '</div>';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add CSS animation
    var style = document.createElement('style');
    style.textContent = `
        @keyframes scaleIn {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on escape key
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }
    document.addEventListener('keydown', handleEscapeKey);
    
    // Cancel button
    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    });
    
    // Confirm button
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
        await confirmDeleteUniversalConversation();
    });
}

async function confirmDeleteUniversalConversation() {
    if (!globalCurrentConversation) return;
    
    try {
        var conversationId = globalCurrentConversation.id;
        const response = await conversationsAPI.deleteConversation(conversationId);
        
        if (response.success) {
            showToast(t('conversationDeletedSuccess'));
            closeUniversalConversationModal();
            
            // Update lists and badges if functions exist
            if (typeof loadMessagesList === 'function') {
                await loadMessagesList();
            }
            if (typeof updateMessageBadge === 'function') {
                await updateMessageBadge();
            }
            // Refresh profile tabs if on profile page
            if (typeof window.profileLoadMessages === 'function') {
                await window.profileLoadMessages();
            }
            if (typeof window.profileLoadHistory === 'function') {
                await window.profileLoadHistory();
            }
        } else {
            throw new Error(response.message || 'Failed to delete conversation');
        }
    } catch (error) {
        showToast(t('failedToDeleteConversation'), 'error');
    }
}


// Message badge update function
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
        badge.style.display = 'none';
    }
}

// Confirmation Modal Helper Functions (shared across pages)
function showConfirmationModal(title, message, onConfirm) {
    var modal = document.getElementById('confirmationModal');
    var titleEl = document.getElementById('confirmationTitle');
    var messageEl = document.getElementById('confirmationMessage');
    var confirmBtn = document.getElementById('confirmActionBtn');
    
    if (modal && titleEl && messageEl && confirmBtn) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Remove previous event listeners by cloning
        var newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.onclick = function() {
            closeConfirmationModal();
            if (onConfirm) onConfirm();
        };
        
        modal.style.display = 'flex';
        requestAnimationFrame(function() {
            modal.classList.add('active');
        });
    }
}

/**
 * Open feedback modal for completed conversations (from "Leave a Review" button)
 */
function openFeedbackFromConversation() {
    if (!globalCurrentConversation) return;
    
    if (typeof openFeedbackModal === 'function') {
        openFeedbackModal(globalCurrentConversation);
    } else {
        if (typeof showToast === 'function') {
            showToast(t('feedbackFormNotAvailable'));
        }
    }
}

/**
 * @deprecated Use openFeedbackFromConversation instead
 */
function openUniversalReviewModal() {
    openFeedbackFromConversation();
}

function closeConfirmationModal() {
    var modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            modal.style.display = 'none';
        }, 300);
    }
}

async function blockUserFromConversation(otherUserId) {
    showBlockConfirmationModal(otherUserId);
}

function showBlockConfirmationModal(otherUserId) {
    var modal = document.createElement('div');
    modal.className = 'block-confirmation-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px);';
    
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.2s ease-out;';
    
    var blockTitle = typeof t === 'function' ? t('blockUserTitle') : 'Block User';
    var blockConfirm = typeof t === 'function' ? t('confirmBlockUser') : 'Are you sure you want to block this user?';
    var blockWarning = typeof t === 'function' ? t('blockUserWarning') : 'This action can be undone from Settings';
    var blockConsequences = typeof t === 'function' ? t('blockUserConsequences') : 'This user will no longer be able to see your items or send you messages.';
    var cancelText = typeof t === 'function' ? t('cancel') : 'Cancel';
    var blockBtnText = typeof t === 'function' ? t('confirmBlockBtn') : 'Block User';
    
    modalContent.innerHTML = 
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
            '<button id="cancelBlockBtn" style="padding: 0.875rem 1.75rem; border: 1px solid #d1d5db; background: white; border-radius: 0.75rem; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#f9fafb\'; this.style.borderColor=\'#9ca3af\'" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#d1d5db\'">' + cancelText + '</button>' +
            '<button id="confirmBlockBtn" style="padding: 0.875rem 1.75rem; border: none; background: #f59e0b; border-radius: 0.75rem; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.9375rem;" onmouseover="this.style.background=\'#d97706\'" onmouseout="this.style.background=\'#f59e0b\'">' + blockBtnText + '</button>' +
        '</div>';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }
    document.addEventListener('keydown', handleEscapeKey);
    
    document.getElementById('cancelBlockBtn').addEventListener('click', function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
    });
    
    document.getElementById('confirmBlockBtn').addEventListener('click', async function() {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
        await confirmBlockUser(otherUserId);
    });
}

async function confirmBlockUser(otherUserId) {
    try {
        var result = await blockedAPI.block(otherUserId);
        if (result.success) {
            if (typeof showToast === 'function') {
                showToast((typeof t === 'function' ? t('userBlocked') : '') || 'User blocked');
            }
            closeUniversalConversationModal();
        } else {
            if (typeof showToast === 'function') {
                showToast(result.message || ((typeof t === 'function' ? t('tryAgain') : '') || 'Please try again'));
            }
        }
    } catch (e) {
        if (typeof showToast === 'function') {
            showToast((typeof t === 'function' ? t('tryAgain') : '') || 'Please try again');
        }
    }
}

// Expose functions globally
window.openUniversalConversationModal = openUniversalConversationModal;
window.closeUniversalConversationModal = closeUniversalConversationModal;
window.sendUniversalMessage = sendUniversalMessage;
window.acceptUniversalRequest = acceptUniversalRequest;
window.rejectUniversalRequest = rejectUniversalRequest;
window.confirmUniversalReceived = confirmUniversalReceived;
window.deleteUniversalConversation = deleteUniversalConversation;
window.blockUserFromConversation = blockUserFromConversation;
window.updateMessageBadge = updateMessageBadge;
window.showConfirmationModal = showConfirmationModal;
window.closeConfirmationModal = closeConfirmationModal;
window.openUniversalReviewModal = openUniversalReviewModal;
window.openFeedbackFromConversation = openFeedbackFromConversation;
