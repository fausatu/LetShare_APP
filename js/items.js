// Items Management
// ================

// Items array - will be loaded from API
var items = [];

// Get grid element (will be initialized when DOM is ready)
var grid = null;

// Global array to store uploaded images
var uploadedImages = [];
var isSubmittingItem = false; // Prevent multiple submissions

// Auto-refresh items interval (30 seconds)
var itemsRefreshInterval = null;
var ITEMS_REFRESH_DELAY = 30000; // 30 seconds
var knownItemIds = new Set(); // Track known item IDs to detect new items

// Initialize known item IDs from current items
function initKnownItemIds() {
    knownItemIds.clear();
    items.forEach(function(item) {
        knownItemIds.add(Number(item.id));
    });
}

// Silent refresh - only add NEW items without affecting existing ones
async function silentRefreshItems() {
    try {
        // Build filter options (same as loadItems)
        var filterOptions = {};
        if (typeof currentFilters !== 'undefined') {
            if (currentFilters.type) filterOptions.type = currentFilters.type;
            if (currentFilters.department) filterOptions.department = currentFilters.department;
            if (currentFilters.condition) filterOptions.condition = currentFilters.condition;
            if (currentFilters.urgent) filterOptions.urgent = true;
            if (currentFilters.search) filterOptions.search = currentFilters.search;
        }
        
        const response = await itemsAPI.getAll('all', filterOptions);
        if (!response.success || !response.data) return;
        
        var newItems = response.data;
        var currentUser = getCurrentUserSync();
        var deletedItems = JSON.parse(localStorage.getItem('deletedItems') || '[]');
        var acceptedItems = JSON.parse(localStorage.getItem('acceptedItems') || '[]');
        
        // Find items that are truly new (not in our known set)
        var itemsToAdd = [];
        newItems.forEach(function(item) {
            var itemId = Number(item.id);
            
            // Skip if already known
            if (knownItemIds.has(itemId)) return;
            
            // Skip user's own items
            if (currentUser && item.user === currentUser.name) return;
            
            // Skip deleted/accepted items
            if (deletedItems.some(function(id) { return Number(id) === itemId; })) return;
            if (acceptedItems.some(function(id) { return Number(id) === itemId; })) return;
            
            itemsToAdd.push(item);
            knownItemIds.add(itemId);
        });
        
        // If no new items, nothing to do
        if (itemsToAdd.length === 0) return;
        
        // Add new items to the beginning of the array
        items = itemsToAdd.concat(items);
        
        // Prepend new cards to grid (at the top) with animation
        var grid = document.getElementById('grid');
        if (!grid) return;
        
        // Remove empty state if present
        var emptyState = grid.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create and prepend new cards with fade-in animation
        itemsToAdd.reverse().forEach(function(item) {
            var card = createItemCard(item);
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            grid.insertBefore(card, grid.firstChild);
            
            // Translate new card
            var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
            translateItemCard(card, item, userLang);
            
            // Trigger animation
            setTimeout(function() {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        });
        
    } catch (e) {
        console.error('Silent refresh failed:', e);
    }
}

// Helper function to translate item card content
function translateItemCard(card, item, userLang) {
    var currentUser = getCurrentUserSync ? getCurrentUserSync() : null;
    var isAuthor = currentUser && currentUser.id && item.user_id && currentUser.id === item.user_id;
    
    // Don't translate author's own items, only translate if user language is not English
    if (isAuthor) {
        return;
    }
    
    // Get the source language of the item (try multiple property names)
    var sourceLang = item.userLang || item.user_lang || item.lang || 'fr';
    
    // ALWAYS try to translate for non-authors (Google Translate detects source language automatically)
    // Translate title
    if (item.title) {
        autoTranslateText(item.title, userLang, sourceLang).then(function(translated) {
            var titleElem = card.querySelector('.card-title');
            if (titleElem && translated && translated !== item.title) {
                titleElem.textContent = translated;
            }
        }).catch(function(error) {
            console.warn('[translateItemCard] Title translation failed:', error);
        });
    }
    
    // Translate description
    if (item.description) {
        autoTranslateText(item.description, userLang, sourceLang).then(function(translated) {
            var descElem = card.querySelector('.card-desc');
            if (descElem && translated && translated !== item.description) {
                descElem.textContent = translated;
            }
        }).catch(function(error) {
            console.warn('[translateItemCard] Description translation failed:', error);
        });
    }
}

// Create a card element for an item (extracted from renderItems)
function createItemCard(item) {
    var card = document.createElement('div');
    card.className = 'card' + (item.large ? ' large' : '') + (item.tall ? ' tall' : '');
    card.onclick = function() { openModal(item); };
    
    var userInitials = item.user.split(' ').map(function(n) { return n[0]; }).join('');
    var avatarHtml = '';
    if (item.user_avatar) {
        avatarHtml = '<div class="user-avatar has-image"><img src="' + item.user_avatar + '" alt="' + item.user + '" onerror="this.parentNode.classList.remove(\'has-image\'); this.parentNode.textContent = \'' + userInitials + '\';"></div>';
    } else {
        avatarHtml = '<div class="user-avatar" style="background: ' + item.color + '">' + userInitials + '</div>';
    }
    var badgeColor = item.type === 'donation' ? '#4ade80' : '#60a5fa';
    var badgeText = item.type === 'donation' ? ' Donation ' : ' Exchange';
    
    // Condition status badge
    var conditionBadge = '';
    if (item.condition_status) {
        var lang = getCurrentLanguage();
        var conditionLabels = {
            en: {
                'new': { text: 'New', color: '#10b981' },
                'excellent': { text: 'Excellent', color: '#22c55e' },
                'good': { text: 'Good', color: '#84cc16' },
                'fair': { text: 'Fair', color: '#eab308' },
                'poor': { text: 'Poor', color: '#f97316' }
            },
            fr: {
                'new': { text: 'Neuf', color: '#10b981' },
                'excellent': { text: 'Excellent', color: '#22c55e' },
                'good': { text: 'Bon', color: '#84cc16' },
                'fair': { text: 'Correct', color: '#eab308' },
                'poor': { text: 'Usé', color: '#f97316' }
            }
        };
        var condition = (conditionLabels[lang] && conditionLabels[lang][item.condition_status]) 
            ? conditionLabels[lang][item.condition_status]
            : (conditionLabels['en'][item.condition_status] || { text: item.condition_status, color: '#6b7280' });
        conditionBadge = '<div class="card-condition-badge" style="background: ' + condition.color + '; color: white;">' + condition.text + '</div>';
    }
    
    var interestedClass = item.isInterested ? 'active' : '';
    card.innerHTML = 
    '<div class="card-glow" style="background: ' + item.color + '"></div>' +
    '<div class="card-interested ' + interestedClass + '" onclick="toggleInterested(event, ' + item.id + ')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' +
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
        '</svg>' +
    '</div>' +
    '<img class="card-image" src="' + escapeHtml(item.image || '') + '" alt="' + escapeHtml(item.title) + '" onerror="this.style.display=\'none\'">' +
    '<div class="card-badge" style="color: ' + badgeColor + '">' + badgeText + '</div>' +
    conditionBadge +
    '<div class="card-content">' +
        '<h3 class="card-title">' + escapeHtml(item.title) + '</h3>' +
        '<p class="card-desc">' + escapeHtml(item.description) + '</p>' +
        '<div class="card-footer">' +
            '<div class="card-user">' +
                avatarHtml +
                '<div class="user-info">' +
                    '<h4>' + escapeHtml(item.user) + '</h4>' +
                    '<div class="user-location">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>' +
                        '</svg>' +
                        escapeHtml(item.department) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="card-time" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || 'just now')) + '</div>' +
        '</div>' +
    '</div>' +
    '<div class="card-overlay">' +
            '<button class="btn-details">' + t('viewDetails') + '</button>' +
    '</div>';
    
    return card;
}

// Start auto-refresh for items
function startItemsAutoRefresh() {
    if (itemsRefreshInterval) return; // Already running
    
    // Initialize known IDs from current items
    initKnownItemIds();
    
    itemsRefreshInterval = setInterval(async function() {
        // Only refresh if page is visible and user is on main feed
        if (document.hidden) return;
        if (!document.getElementById('grid')) return;
        
        try {
            await silentRefreshItems();
        } catch (e) {
            console.error('Auto-refresh items failed:', e);
        }
    }, ITEMS_REFRESH_DELAY);
}

// Stop auto-refresh
function stopItemsAutoRefresh() {
    if (itemsRefreshInterval) {
        clearInterval(itemsRefreshInterval);
        itemsRefreshInterval = null;
    }
}

// Handle visibility change - pause/resume refresh
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, no need to refresh
    } else {
        // Page is visible again, do silent refresh
        if (document.getElementById('grid')) {
            silentRefreshItems();
        }
    }
});

// Add Item Modal Functions
async function openAddModal() {
    // Check if user is authenticated
    var currentUser = getCurrentUserSync();
    if (!currentUser || !currentUser.id) {
        // Redirect to login
        window.location.replace('login.html');
        return;
    }
    
    // Load departments for autocomplete
    await loadDepartments();
    
    document.getElementById('addModal').classList.add('active');
    document.body.classList.add('modal-open');
}

// Load departments from API for autocomplete
async function loadDepartments() {
    try {
        const response = await fetch('api/departments.php');
        const data = await response.json();
        if (data.success && data.data) {
            const datalist = document.getElementById('departmentSuggestions');
            if (datalist) {
                datalist.innerHTML = '';
                data.data.forEach(function(dept) {
                    const option = document.createElement('option');
                    option.value = dept;
                    datalist.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.getElementById('addItemForm').reset();
    
    // Clear images
    uploadedImages = [];
    var container = document.getElementById('imagesPreviewContainer');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    
    // Clear file input
    var fileInput = document.getElementById('imageFileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Initialize add modal click outside handler
if (document.getElementById('addModal')) {
    document.getElementById('addModal').addEventListener('click', function(e) {
        if (e.target.id === 'addModal') closeAddModal();
    });
}

// Load items from API
async function loadItems() {
    try {
        // Build filter options
        var filterOptions = {};
        if (currentFilters.type) filterOptions.type = currentFilters.type;
        if (currentFilters.department) filterOptions.department = currentFilters.department;
        if (currentFilters.condition) filterOptions.condition = currentFilters.condition;
        if (currentFilters.urgent) filterOptions.urgent = true;
        if (currentFilters.search) filterOptions.search = currentFilters.search;
        
        const response = await itemsAPI.getAll('all', filterOptions);
        if (response.success && response.data) {
            items = response.data;
            renderItems();
            // Initialize known item IDs after first load
            initKnownItemIds();
        } else {
            throw new Error(response.message || 'Failed to load items');
        }
    } catch (error) {
        console.error('Error loading items:', error);
        handleAPIError(error);
        // Fallback to empty array
        items = [];
        renderItems();
        initKnownItemIds();
    }
}

function renderItems() {
    // Clear grid first
    if (!grid) {
        return; // Grid not ready yet
    }
    grid.innerHTML = '';
    
    // Get list of deleted items from localStorage
    var deletedItemsStr = localStorage.getItem('deletedItems') || '[]';
    var deletedItems = JSON.parse(deletedItemsStr);
    
    // Get list of accepted items (items that have been accepted and should be removed from feed)
    var acceptedItems = JSON.parse(localStorage.getItem('acceptedItems') || '[]');
    
    // Counter for visible items
    var visibleItemsCount = 0;
    
    items.forEach(function(item) {
        // Skip items posted by the current user (they can see them in their profile)
        var currentUser = getCurrentUserSync();
        if (item.user === currentUser.name) {
            return;
        }
        
        // Skip deleted items - normalize IDs to numbers for reliable comparison
        var itemIdNum = Number(item.id);
        var isDeleted = deletedItems.some(function(deletedId) {
            var deletedIdNum = Number(deletedId);
            return deletedIdNum === itemIdNum;
        });
        if (isDeleted) {
            return;
        }
        
        // Skip accepted items (items that have been accepted and should be removed from feed)
        var isAccepted = acceptedItems.some(function(acceptedId) {
            var acceptedIdNum = Number(acceptedId);
            return acceptedIdNum === itemIdNum;
        });
        if (isAccepted) {
            return;
        }
        
        visibleItemsCount++;
        
        var card = document.createElement('div');
        card.className = 'card' + (item.large ? ' large' : '') + (item.tall ? ' tall' : '');
        card.onclick = function() { openModal(item); };
        
        var userInitials = item.user.split(' ').map(function(n) { return n[0]; }).join('');
        var avatarHtml = '';
        if (item.user_avatar) {
            avatarHtml = '<div class="user-avatar has-image"><img src="' + item.user_avatar + '" alt="' + item.user + '" onerror="this.parentNode.classList.remove(\'has-image\'); this.parentNode.textContent = \'' + userInitials + '\';"></div>';
        } else {
            avatarHtml = '<div class="user-avatar" style="background: ' + item.color + '">' + userInitials + '</div>';
        }
        var badgeColor = item.type === 'donation' ? '#4ade80' : '#60a5fa';
        var badgeText = item.type === 'donation' ? ' Donation ' : ' Exchange';
        
        // Condition status badge
        var conditionBadge = '';
        if (item.condition_status) {
            var lang = getCurrentLanguage();
            var conditionLabels = {
                en: {
                    'new': { text: 'New', color: '#10b981' },
                    'excellent': { text: 'Excellent', color: '#22c55e' },
                    'good': { text: 'Good', color: '#84cc16' },
                    'fair': { text: 'Fair', color: '#eab308' },
                    'poor': { text: 'Poor', color: '#f97316' }
                },
                fr: {
                    'new': { text: 'Neuf', color: '#10b981' },
                    'excellent': { text: 'Excellent', color: '#22c55e' },
                    'good': { text: 'Bon', color: '#84cc16' },
                    'fair': { text: 'Correct', color: '#eab308' },
                    'poor': { text: 'Usé', color: '#f97316' }
                }
            };
            var condition = (conditionLabels[lang] && conditionLabels[lang][item.condition_status]) 
                ? conditionLabels[lang][item.condition_status]
                : (conditionLabels['en'][item.condition_status] || { text: item.condition_status, color: '#6b7280' });
            conditionBadge = '<div class="card-condition-badge" style="background: ' + condition.color + '; color: white;">' + condition.text + '</div>';
        }
        
        var interestedClass = item.isInterested ? 'active' : '';
        card.innerHTML = 
        '<div class="card-glow" style="background: ' + item.color + '"></div>' +
        '<div class="card-interested ' + interestedClass + '" onclick="toggleInterested(event, ' + item.id + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' +
                '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
            '</svg>' +
        '</div>' +
        '<img class="card-image" src="' + escapeHtml(item.image || '') + '" alt="' + escapeHtml(item.title) + '" onerror="this.style.display=\'none\'">' +
        '<div class="card-badge" style="color: ' + badgeColor + '">' + badgeText + '</div>' +
        conditionBadge +
        '<div class="card-content">' +
            '<h3 class="card-title">' + escapeHtml(item.title) + '</h3>' +
            '<p class="card-desc">' + escapeHtml(item.description) + '</p>' +
            '<div class="card-footer">' +
                '<div class="card-user">' +
                    avatarHtml +
                    '<div class="user-info">' +
                        '<h4>' + escapeHtml(item.user) + '</h4>' +
                        '<div class="user-location">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>' +
                            '</svg>' +
                            escapeHtml(item.department) +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-time" data-created-at="' + (item.created_at || '') + '">' + (item.created_at ? formatTimeAgo(item.created_at) : (item.time || 'just now')) + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="card-overlay">' +
                '<button class="btn-details">' + t('viewDetails') + '</button>' +
        '</div>';
    
    if (grid) {
        grid.appendChild(card);
    }
    
    // Auto-translate title and description if needed (not the author)
    var userLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'en') || 'en';
    
    // Translate the card content (this function handles closure properly)
    translateItemCard(card, item, userLang);
});

// Show empty state if no items are visible
if (visibleItemsCount === 0) {
    var emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: #6b7280;';
    emptyState.innerHTML = 
        '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1.5rem; opacity: 0.3;">' +
            '<path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5z"/>' +
        '</svg>' +
        '<h3 style="font-size: 1.25rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;" data-i18n="noItemsTitle">Aucun objet disponible</h3>' +
        '<p style="font-size: 0.95rem; color: #6b7280;" data-i18n="noItemsMessage">Il n\'y a aucun objet à afficher pour le moment. Revenez plus tard !</p>';
    grid.appendChild(emptyState);
    
    // Apply translations to the empty state
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
}
}

// Initialize grid when DOM is ready
function initializeItemsGrid() {
    grid = document.getElementById('grid');
}

// Render items when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeItemsGrid();
        renderItems();
        applyTranslations();
        startItemsAutoRefresh();
    });
} else {
    initializeItemsGrid();
    renderItems();
    applyTranslations();
    startItemsAutoRefresh();
}

var currentItem = null;

async function toggleInterested(event, itemId) {
    event.stopPropagation();
    
    // Check if user is authenticated
    var currentUser = getCurrentUserSync();
    if (!currentUser || !currentUser.id) {
        // Redirect to login with item ID for redirect after login
                window.location.replace('login.html?redirect=item&id=' + itemId);
        return;
    }
    
    var heartBtn = event.currentTarget;
    var isInterested = heartBtn.classList.contains('active');
    
    try {
        if (isInterested) {
            // Remove from interested list
            const response = await interestedAPI.remove(itemId);
            if (response.success) {
                heartBtn.classList.remove('active');
            } else {
                throw new Error(response.message || 'Failed to remove from interested list');
            }
        } else {
            // Add to interested list
            const response = await interestedAPI.add(itemId);
            if (response.success) {
                heartBtn.classList.add('active');
            } else {
                throw new Error(response.message || 'Failed to add to interested list');
            }
        }
    } catch (error) {
        console.error('Error toggling interested:', error);
        handleAPIError(error);
    }
}

async function handleAddItem(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmittingItem) {
        return;
    }
    
    var currentUser = getCurrentUserSync();
    if (!currentUser || !currentUser.id) {
        showToast('Please login to add items');
        window.location.replace('login.html');
        return;
    }
    
    // Validate that at least one image is provided
    if (uploadedImages.length === 0) {
        showToast('Please add at least one image');
        return;
    }
    
    // Ensure uploadedImages is a proper array with numeric indices
    var imagesArray = Array.isArray(uploadedImages) ? Array.from(uploadedImages) : [];
    imagesArray = imagesArray.filter(function(img) { return img && img.trim().length > 0; });
    
    if (imagesArray.length === 0) {
        showToast('Please add at least one valid image');
        return;
    }
    
    isSubmittingItem = true;
    
    // Disable submit button
    var submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
    }
    
    // Get current user to use their department as fallback
    var currentUser = getCurrentUserSync();
    if (!currentUser) {
        showToast('Error: Unable to get your information. Please refresh the page.');
        return;
    }
    
    // Get department from form (optional), or use user's department as fallback
    var itemDepartment = document.getElementById('itemDepartment')?.value?.trim() || null;
    
    var itemData = {
        title: document.getElementById('itemTitle').value,
        type: document.getElementById('itemType').value,
        images: imagesArray, // Send array of images
        description: document.getElementById('itemDescription').value,
        condition_status: document.getElementById('itemCondition')?.value || null,
        is_urgent: document.getElementById('itemUrgent')?.checked || false
    };
    
    // Only include department if specified, API will use user's department as fallback
    if (itemDepartment) {
        itemData.department = itemDepartment;
    }
    
    try {
        const response = await itemsAPI.create(itemData);
        
        if (response.success && response.data) {
            var newItem = response.data;
            
            uploadedImages = [];
            
            // Close modal and reset form
            closeAddModal();
            
            // Show success toast
            showToast(t('itemAdded'));
            
            // Reload items from API to show the new item
            await loadItems();
            
            setTimeout(function() {
                updateItemTimes();
            }, 100);
            setTimeout(function() {
                updateItemTimes();
            }, 1000);
            setTimeout(function() {
                updateItemTimes();
            }, 5000);
        } else {
            throw new Error(response.message || 'Failed to create item');
        }
    } catch (error) {
        console.error('Error creating item:', error);
        showToast('Error creating item: ' + (error.message || 'Please try again'));
    } finally {
        isSubmittingItem = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = t('addItem') || 'Add Item';
        }
    }
}

function handleImageUpload(event) {
    var files = event.target.files;
    if (files && files.length > 0) {
        var container = document.getElementById('imagesPreviewContainer');
        if (!container) return;
        
        Array.from(files).forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var imageUrl = e.target.result;
                uploadedImages.push(imageUrl);
                
                // Create preview element
                var previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview-item';
                previewDiv.style.cssText = 'position: relative; border-radius: 0.5rem; overflow: hidden;';
                
                var img = document.createElement('img');
                img.src = imageUrl;
                img.style.cssText = 'width: 100%; height: 100px; object-fit: cover; display: block;';
                
                var removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = 'position: absolute; top: 0.25rem; right: 0.25rem; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 1.25rem; line-height: 1; display: flex; align-items: center; justify-content: center;';
                removeBtn.onclick = function() {
                    var index = uploadedImages.indexOf(imageUrl);
                    if (index > -1) {
                        uploadedImages.splice(index, 1);
                    }
                    previewDiv.remove();
                };
                
                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                container.appendChild(previewDiv);
                container.style.display = 'grid';
            };
            reader.readAsDataURL(file);
        });
    }
}

function addImageFromUrl() {
    var urlInput = document.getElementById('itemImageUrl');
    if (!urlInput || !urlInput.value.trim()) {
        showToast('Please enter a valid image URL');
        return;
    }
    
    var imageUrl = urlInput.value.trim();
    uploadedImages.push(imageUrl);
    
    var container = document.getElementById('imagesPreviewContainer');
    if (container) {
        var previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview-item';
        previewDiv.style.cssText = 'position: relative; border-radius: 0.5rem; overflow: hidden;';
        
        var img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = 'width: 100%; height: 100px; object-fit: cover; display: block;';
        img.onerror = function() {
            showToast('Invalid image URL');
            var index = uploadedImages.indexOf(imageUrl);
            if (index > -1) {
                uploadedImages.splice(index, 1);
            }
            previewDiv.remove();
        };
        
        var removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText = 'position: absolute; top: 0.25rem; right: 0.25rem; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 1.25rem; line-height: 1; display: flex; align-items: center; justify-content: center;';
        removeBtn.onclick = function() {
            var index = uploadedImages.indexOf(imageUrl);
            if (index > -1) {
                uploadedImages.splice(index, 1);
            }
            previewDiv.remove();
        };
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(removeBtn);
        container.appendChild(previewDiv);
        container.style.display = 'grid';
        urlInput.value = '';
    }
}

