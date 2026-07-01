                // IMMEDIATE AUTH CHECK - Runs as soon as script loads
        // This MUST run synchronously to prevent page from loading
        
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
        
        (async function immediateAuthCheck() {
            // Clear localStorage user data first to force fresh API check
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            try {
                const isAuth = await checkAuth();
                if (!isAuth) {
                    clearAuthLocalStorage();
                    sessionStorage.clear();
                    // Use replace to prevent back button
                    window.location.replace('login.html?nocache=' + Date.now());
                    // Stop execution
                    throw new Error('Not authenticated');
                }
            } catch (error) {
                // If check fails or returns false, clear everything and redirect
                clearAuthLocalStorage();
                sessionStorage.clear();
                window.location.replace('login.html?nocache=' + Date.now());
                // Prevent any further code execution
                throw error;
            }
        })().catch(function(error) {
            // Silently catch to prevent console errors, redirect is already happening
        });
        
        // Check authentication before loading settings
        async function checkAuthentication() {
            // Force clear cached data before checking
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            try {
                // Force a fresh API check
                const isAuth = await checkAuth();
                if (!isAuth) {
                    // User is not authenticated, clear everything and redirect to login
                    clearAuthLocalStorage();
                    sessionStorage.clear();
                    window.location.replace('login.html?nocache=' + Date.now());
                    return false;
                }
                return true;
            } catch (error) {
                // On error, assume not authenticated
                clearAuthLocalStorage();
                sessionStorage.clear();
                window.location.replace('login.html?nocache=' + Date.now());
                return false;
            }
        }
        
        // Load saved settings
        async function loadSettings() {
            try {
                // Check authentication first
                const isAuthenticated = await checkAuthentication();
                if (!isAuthenticated) {
                    return; // Redirect already happened
                }
                
                // Get current user from API
                const userResponse = await authAPI.getCurrentUser();
                if (!userResponse.success || !userResponse.data) {
                    // If user data cannot be loaded, clear everything and redirect to login
                    clearAuthLocalStorage();
                    sessionStorage.clear();
                    window.location.replace('login.html?nocache=' + Date.now());
                    return;
                }
                
                var user = userResponse.data.user;
                var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                
                // Sync language from API to localStorage
                if (user.language) {
                    settings.language = user.language;
                    localStorage.setItem('userSettings', JSON.stringify(settings));
                }
                
                // Apply translations immediately after syncing language
                if (typeof applyTranslations === 'function') {
                    applyTranslations();
                } else {
                }
                
                // Load profile from API
                if (user.name) document.getElementById('fullName').value = user.name;
                if (user.email) document.getElementById('email').value = user.email;
                if (user.department) {
                    // Mettre à jour le menu personnalisé
                    const departmentElement = document.getElementById('department');
                    if (departmentElement) {
                        departmentElement.value = user.department;
                        // Mettre à jour le menu personnalisé si il existe
                        setTimeout(() => {
                            updateCustomSelect(departmentElement, user.department);
                        }, 100);
                    }
                }
                
                // Load privacy settings from API
                // First, reset all toggles
                var showDeptToggle = document.getElementById('showDepartmentToggle');
                var showEmailToggle = document.getElementById('showEmailToggle');
                var allowMessagesToggle = document.getElementById('allowMessagesToggle');
                
                if (showDeptToggle) showDeptToggle.classList.remove('active');
                if (showEmailToggle) showEmailToggle.classList.remove('active');
                if (allowMessagesToggle) allowMessagesToggle.classList.remove('active');
                
                // Then set them based on API values (default to true for show_department and allow_messages if undefined)
                if (user.show_department === true || (user.show_department === undefined || user.show_department === null)) {
                    if (showDeptToggle) showDeptToggle.classList.add('active');
                }
                if (user.show_email === true) {
                    if (showEmailToggle) showEmailToggle.classList.add('active');
                }
                if (user.allow_messages_from_anyone === true || (user.allow_messages_from_anyone === undefined || user.allow_messages_from_anyone === null)) {
                    if (allowMessagesToggle) allowMessagesToggle.classList.add('active');
                }
                
                // Load conversation management settings from API
                var autoDeleteRejectedToggle = document.getElementById('autoDeleteRejectedToggle');
                
                if (autoDeleteRejectedToggle) {
                    autoDeleteRejectedToggle.classList.remove('active');
                    
                    // Set conversation management toggle (default to true if undefined)
                    if (user.auto_delete_rejected_conversations === true || user.auto_delete_rejected_conversations === undefined || user.auto_delete_rejected_conversations === null) {
                        autoDeleteRejectedToggle.classList.add('active');
                    } else {
                    }
                }
                
                // Load notifications preferences from API
                var notificationPrefs = user.notification_preferences || {};
                ['messages', 'requests', 'accepted', 'reviews'].forEach(function(key) {
                    var toggle = document.querySelector('[data-setting="' + key + '"]');
                    if (toggle) {
                        // Default to true if not explicitly set to false
                        if (notificationPrefs[key] !== false) {
                            toggle.classList.add('active');
                        }
                    }
                });
                
                
                // Load preferences from API
                if (user.language) document.getElementById('language').value = user.language;
                // dateFormat field removed from settings page
                
                // Force translations update after all settings are loaded
                setTimeout(() => {
                    if (typeof applyTranslations === 'function') {
                        applyTranslations();
                    }
                }, 100);
                
                // Load avatar from API
                var avatarPreview = document.getElementById('avatarPreview');
                if (avatarPreview) {
                    if (user.avatar) {
                        avatarPreview.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="Avatar">';
                    } else {
                        // Show user initials if no avatar
                        var initials = user.name ? user.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase() : 'U';
                        avatarPreview.textContent = initials;
                        avatarPreview.innerHTML = initials; // Clear any previous content
                    }
                }
            } catch (error) {
                // Fallback to localStorage
                var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                if (settings.fullName) document.getElementById('fullName').value = settings.fullName;
                if (settings.email) document.getElementById('email').value = settings.email;
                if (settings.department) {
                    const departmentElement = document.getElementById('department');
                    if (departmentElement) {
                        departmentElement.value = settings.department;
                        setTimeout(() => {
                            updateCustomSelect(departmentElement, settings.department);
                        }, 100);
                    }
                }
                if (settings.language) {
                    const languageElement = document.getElementById('language');
                    if (languageElement) {
                        languageElement.value = settings.language;
                        setTimeout(() => {
                            updateCustomSelect(languageElement, settings.language);
                        }, 100);
                    }
                }
                var avatarPreview = document.getElementById('avatarPreview');
                if (avatarPreview) {
                    if (settings.avatar) {
                        avatarPreview.innerHTML = '<img src="' + escapeHtml(settings.avatar) + '" alt="Avatar">';
                    } else {
                        // Show user initials if no avatar
                        var userName = settings.fullName || document.getElementById('fullName').value || 'User';
                        var initials = userName.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
                        avatarPreview.textContent = initials;
                        avatarPreview.innerHTML = initials; // Clear any previous content
                    }
                }
            }
        }

        // Toggle switch
        async function toggleSwitch(element) {
            var previousState = element.classList.contains('active');
            element.classList.toggle('active');
            try {
                await saveNotificationSettings();
            } catch (error) {
                // Revert on failure
                if (previousState) {
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
            }
        }

        // Save notification settings to API
        async function saveNotificationSettings() {
            var prefs = {};
            
            ['messages', 'requests', 'accepted', 'reviews'].forEach(function(key) {
                var toggle = document.querySelector('[data-setting="' + key + '"]');
                if (toggle) {
                    prefs[key] = toggle.classList.contains('active');
                }
            });
            
            try {
                var response = await usersAPI.update({ notification_preferences: prefs });
                if (response.success) {
                    var isFr = getCurrentLanguage() === 'fr';
                    showToast(isFr ? 'Paramètres de notification mis à jour' : 'Notification settings updated', 'success');
                } else {
                    throw new Error(response.message || 'Failed to save notification settings');
                }
            } catch (error) {
                var errMsg = getCurrentLanguage() === 'fr' ? 'Échec de la sauvegarde des notifications' : 'Failed to save notification settings';
                showToast(errMsg, 'error');
                throw error; // Re-throw so toggleSwitch can revert
            }
        }

        // Toggle privacy setting
        async function togglePrivacySetting(element, settingKey) {
            var previousState = element.classList.contains('active');
            element.classList.toggle('active');
            var isActive = element.classList.contains('active');
            try {
                var updateData = {};
                updateData[settingKey] = isActive;
                // Use apiRequest from api.js for CSRF and error handling
                var result = await apiRequest('users', {
                    method: 'PUT',
                    body: updateData
                });
                if (result.success && result.data) {
                    // Update localStorage with new user data from API response
                    var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    Object.keys(result.data).forEach(function(key) {
                        if (result.data[key] !== undefined) {
                            currentUser[key] = result.data[key];
                        }
                    });
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    sessionStorage.setItem('updatedUserData', JSON.stringify(result.data));
                    sessionStorage.setItem('userProfileJustUpdated', 'true');
                    if (result.data[settingKey] === true || result.data[settingKey] === 1) {
                        element.classList.add('active');
                    } else {
                        element.classList.remove('active');
                    }
                    window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                        detail: result.data
                    }));
                    window.dispatchEvent(new CustomEvent('privacySettingUpdated', {
                        detail: {
                            setting: settingKey,
                            value: result.data[settingKey],
                            userData: result.data
                        }
                    }));
                    const message = getCurrentLanguage() === 'fr' ? 'Paramètre de confidentialité mis à jour' : 'Privacy setting updated';
                    showToast(message, 'success');
                } else {
                    throw new Error(result.message || 'Failed to update privacy setting');
                }
            } catch (error) {
                if (previousState) {
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
                const errorMessage = getCurrentLanguage() === 'fr' ? 'Échec de la mise à jour. Veuillez réessayer.' : 'Failed to update privacy setting. Please try again.';
                showToast(errorMessage, 'error');
            }
        }

        // Save profile
        async function saveProfile() {
            try {
                // Get current user to check old name
                const currentUserResponse = await authAPI.getCurrentUser();
                if (!currentUserResponse.success || !currentUserResponse.data) {
                    throw new Error('Failed to get current user');
                }
                var oldName = currentUserResponse.data.user.name;
                
                // Prepare update data
                var updateData = {
                    name: document.getElementById('fullName').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    department: getCustomSelectValue('department')
                };
                
                // Update via API
                const response = await usersAPI.update(updateData);
                
                if (response.success && response.data) {
                    // Update localStorage with fresh data from API
                    var updatedUser = response.data;
                    localStorage.setItem('currentUser', JSON.stringify({
                        id: updatedUser.id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        department: updatedUser.department,
                        avatar: updatedUser.avatar,
                        language: updatedUser.language
                    }));
                    
                    // Update localStorage for backward compatibility
                    var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                    settings.fullName = updateData.name;
                    settings.email = updateData.email;
                    settings.department = updateData.department;
                    localStorage.setItem('userSettings', JSON.stringify(settings));
                    
                    // Dispatch event to notify other pages (if they're open)
                    window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                        detail: updatedUser
                    }));
                    
                    // Also store in sessionStorage for cross-page communication
                    // Don't remove these - let the profile page remove them after loading
                    sessionStorage.setItem('userProfileJustUpdated', 'true');
                    sessionStorage.setItem('updatedUserData', JSON.stringify(updatedUser));
                    
                    showToast(t('profileUpdated'));
                    
                    // Redirect to profile to see changes
                    // Small delay to ensure sessionStorage is set
                    setTimeout(function() {
                        window.location.href = 'profile.html';
                    }, 500);
                } else {
                    throw new Error(response.message || 'Failed to update profile');
                }
            } catch (error) {
                showToast('Error: ' + (error.message || 'Failed to update profile'), 'error');
            }
        }
        //         deleteConfirm: 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
        //         deleteConfirm2: 'Cela supprimera définitivement toutes vos données. Tapez DELETE pour confirmer.'
        //     }
        // };

        // Get current language
        function getCurrentLanguage() {
            var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
            return settings.language || 'en';
        }

        // Get translation
        function t(key) {
            var lang = getCurrentLanguage();
            return translations[lang] && translations[lang][key] ? translations[lang][key] : translations.en[key] || key;
        }

        // Save preferences
        async function savePreferences() {
            try {
                // Get current user to check old language
                const currentUserResponse = await authAPI.getCurrentUser();
                if (!currentUserResponse.success || !currentUserResponse.data) {
                    throw new Error('Failed to get current user');
                }
                var oldLanguage = currentUserResponse.data.user.language || 'en';
                
                // Get language from form - check if element exists
                const languageElement = document.getElementById('language');
                if (!languageElement) {
                    throw new Error('Language select element not found');
                }
                var newLanguage = getCustomSelectValue('language') || languageElement.value;
                
                // Get dateFormat if element exists (optional)
                const dateFormatElement = document.getElementById('dateFormat');
                var dateFormat = dateFormatElement ? dateFormatElement.value : null;
                
                // Update language via API
                if (oldLanguage !== newLanguage) {
                    const response = await usersAPI.update({ language: newLanguage });
                    if (!response.success) {
                        throw new Error(response.message || 'Failed to update language');
                    }
                }
                
                // Save to localStorage first (before any toast or reload)
                var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                settings.language = newLanguage;
                if (dateFormat) {
                    settings.dateFormat = dateFormat;
                }
                localStorage.setItem('userSettings', JSON.stringify(settings));
                
                // If language changed, reload page immediately to apply translations
                if (oldLanguage !== newLanguage) {
                    window.location.reload();
                    return; // Exit function, don't show toast
                }
                
                showToast(t('preferencesSaved'));
            } catch (error) {
                showToast('Error: ' + (error.message || 'Failed to save preferences'), 'error');
            }
        }

        // Handle avatar upload
        async function handleAvatarUpload(event) {
            var file = event.target.files[0];
            if (!file) return;
            
            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                const sizeMessage = getCurrentLanguage() === 'fr' ? 'La taille de l\'image doit être inférieure à 2 Mo' : 'Image size must be less than 2MB';
                showToast(sizeMessage, 'error');
                return;
            }
            
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var avatarDataUrl = e.target.result;
                    
                    // Update avatar via API
                    const response = await usersAPI.update({ avatar: avatarDataUrl });
                    
                    if (response.success && response.data) {
                        var avatarPreview = document.getElementById('avatarPreview');
                        if (avatarPreview) {
                            avatarPreview.innerHTML = '<img src="' + avatarDataUrl + '" alt="Avatar">';
                        }
                        
                        // Update localStorage with fresh data from API
                        var updatedUser = response.data;
                        var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                        currentUser.avatar = updatedUser.avatar;
                        currentUser.name = updatedUser.name || currentUser.name;
                        currentUser.email = updatedUser.email || currentUser.email;
                        currentUser.department = updatedUser.department || currentUser.department;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        // Update localStorage for backward compatibility
                        var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                        settings.avatar = avatarDataUrl;
                        localStorage.setItem('userSettings', JSON.stringify(settings));
                        
                        // Dispatch event to notify other pages (if they're open)
                        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                            detail: updatedUser
                        }));
                        
                        // Also store in sessionStorage for cross-page communication
                        sessionStorage.setItem('userProfileJustUpdated', 'true');
                        sessionStorage.setItem('updatedUserData', JSON.stringify(updatedUser));
                        
                        showToast(t('avatarUpdated'));
                    } else {
                        throw new Error(response.message || 'Failed to update avatar');
                    }
                } catch (error) {
                    showToast('Error: ' + (error.message || 'Failed to update avatar'), 'error');
                }
            };
            reader.readAsDataURL(file);
        }

        // Change password
        async function changePassword() {
            var current = document.getElementById('currentPassword').value;
            var newPass = document.getElementById('newPassword').value;
            var confirm = document.getElementById('confirmPassword').value;
            
            if (!current || !newPass || !confirm) {
                showToast(t('fillAllFields'), 'error');
                return;
            }
            
            if (newPass !== confirm) {
                showToast(t('passwordsNoMatch'), 'error');
                return;
            }
            
            if (newPass.length < 6) {
                showToast(t('passwordTooShort'), 'error');
                return;
            }
            
            try {
                const response = await authAPI.changePassword(current, newPass);
                if (response.success) {
                    showToast(t('passwordChanged'));
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                } else {
                    throw new Error(response.message || t('changePasswordFailed'));
                }
            } catch (error) {
                showToast('Error: ' + (error.message || 'Failed to change password'), 'error');
            }
        }

        // Export data
        async function exportData() {
            try {
                var isFr = getCurrentLanguage() === 'fr';
                showToast(isFr ? 'Préparation de l\'export...' : 'Preparing export...', 'success');
                
                // Fetch real user data from API
                var userResponse = await authAPI.getCurrentUser();
                var userData = userResponse.success && userResponse.data ? userResponse.data.user : {};
                
                // Fetch user's items
                var itemsData = [];
                try {
                    var itemsResponse = await itemsAPI.getAll();
                    if (itemsResponse.success && itemsResponse.data) {
                        var allItems = Array.isArray(itemsResponse.data) ? itemsResponse.data : (itemsResponse.data.items || []);
                        itemsData = allItems.filter(function(item) { return item.user_id == userData.id; });
                    }
                } catch (e) { console.error('Error fetching items for export:', e); }
                
                // Fetch interested items
                var interestedData = [];
                try {
                    var intResponse = await interestedAPI.getAll();
                    if (intResponse.success && intResponse.data) {
                        interestedData = Array.isArray(intResponse.data) ? intResponse.data : [];
                    }
                } catch (e) { console.error('Error fetching interested items for export:', e); }
                
                // Fetch conversations
                var conversationsData = [];
                try {
                    var convResponse = await messagesAPI.getAll();
                    if (convResponse.success && convResponse.data) {
                        conversationsData = Array.isArray(convResponse.data) ? convResponse.data : [];
                    }
                } catch (e) { console.error('Error fetching conversations for export:', e); }
                
                // Fetch reviews
                var reviewsData = [];
                try {
                    var reviewsResponse = await apiRequest('reviews?user_id=' + userData.id, { method: 'GET' });
                    if (reviewsResponse.success && reviewsResponse.data) {
                        reviewsData = Array.isArray(reviewsResponse.data) ? reviewsResponse.data : (reviewsResponse.data.reviews || []);
                    }
                } catch (e) { console.error('Error fetching reviews for export:', e); }
                
                var data = {
                    exportDate: new Date().toISOString(),
                    profile: {
                        name: userData.name,
                        email: userData.email,
                        department: userData.department,
                        language: userData.language,
                        created_at: userData.created_at
                    },
                    settings: {
                        show_department: userData.show_department,
                        show_email: userData.show_email,
                        allow_messages_from_anyone: userData.allow_messages_from_anyone,
                        auto_delete_rejected_conversations: userData.auto_delete_rejected_conversations
                    },
                    items: itemsData,
                    interestedItems: interestedData,
                    conversations: conversationsData,
                    reviews: reviewsData
                };
                
                var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'letshare-data-' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                URL.revokeObjectURL(url);
                
                showToast(t('dataExported'));
            } catch (error) {
                var errMsg = getCurrentLanguage() === 'fr' ? 'Erreur lors de l\'export des données' : 'Error exporting data';
                showToast(errMsg, 'error');
            }
        }

        // Logout function
         async function logout() {
            try {
                await authAPI.logout();
            } catch (error) {
            } finally {
                // Preserve language and version settings across logout
                clearAuthLocalStorage();
                sessionStorage.clear();
                // Force a complete page reload without cache and redirect to login
                window.location.replace('login.html?nocache=' + Date.now());
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', 'login.html');
                }
            }
        }
        
        // Expose logout globally (same as other functions)
        window.logout = logout;

        // Show delete account confirmation modal
        function deleteAccount() {
            showDeleteAccountConfirmationModal();
        }
        
        function showDeleteAccountConfirmationModal() {
            var lang = getCurrentLanguage();
            var isFr = lang === 'fr';
            
            // Create modal backdrop
            var modal = document.createElement('div');
            modal.className = 'delete-account-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            // Create modal content
            var modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            
            var modalTitle = isFr ? 'Supprimer le compte' : 'Delete Account';
            var modalDesc = isFr ? 'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.' : 'Are you sure you want to permanently delete your account? This action cannot be undone.';
            var warningLabel = isFr ? 'Attention :' : 'Warning:';
            var warningText = isFr ? 'Cela supprimera définitivement votre compte et toutes les données associées, y compris :' : 'This will permanently delete your account and all associated data including:';
            var item1 = isFr ? 'Votre profil et vos informations personnelles' : 'Your profile and personal information';
            var item2 = isFr ? 'Tous vos articles publiés' : 'All your posted items';
            var item3 = isFr ? 'Toutes vos conversations et messages' : 'All your conversations and messages';
            var item4 = isFr ? 'Vos avis et notes' : 'Your reviews and ratings';
            var cancelLabel = t('cancel');
            var deleteLabel = t('deleteAccount');
            
            modalContent.innerHTML = 
                '<h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">' + modalTitle + '</h3>' +
                '<p style="margin: 0 0 1rem 0; color: #6b7280; line-height: 1.6;">' + modalDesc + '</p>' +
                '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">' +
                    '<p style="margin: 0; color: #991b1b; font-size: 0.875rem; line-height: 1.5;">' +
                        '<strong>' + warningLabel + '</strong> ' + warningText +
                    '</p>' +
                    '<ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; color: #991b1b; font-size: 0.875rem; line-height: 1.8;">' +
                        '<li>' + item1 + '</li>' +
                        '<li>' + item2 + '</li>' +
                        '<li>' + item3 + '</li>' +
                        '<li>' + item4 + '</li>' +
                    '</ul>' +
                '</div>' +
                '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
                    '<button id="cancelDeleteAccountBtn" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; border-radius: 8px; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'">' + cancelLabel + '</button>' +
                    '<button id="confirmDeleteAccountBtn" style="padding: 0.75rem 1.5rem; border: none; background: #ef4444; border-radius: 8px; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">' + deleteLabel + '</button>' +
                '</div>';
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // Cancel button
            document.getElementById('cancelDeleteAccountBtn').addEventListener('click', function() {
                modal.remove();
            });
            
            // Confirm button
            document.getElementById('confirmDeleteAccountBtn').addEventListener('click', async function() {
                modal.remove();
                await confirmDeleteAccount();
            });
        }
        
        async function confirmDeleteAccount() {
            try {
                var isFr = getCurrentLanguage() === 'fr';
                showToast(isFr ? 'Suppression du compte...' : 'Deleting account...', 'error');
                
                const response = await usersAPI.deleteAccount();
                
                if (response.success) {
                    // Clear all local data
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    showToast(t('accountDeleted'), 'error');
                    
                    // Redirect to home page after a delay
                    setTimeout(function() {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    throw new Error(response.message || (isFr ? 'Échec de la suppression du compte' : 'Failed to delete account'));
                }
            } catch (error) {
                var errMsg = getCurrentLanguage() === 'fr' ? 'Erreur lors de la suppression du compte. Veuillez réessayer.' : 'Error deleting account. Please try again.';
                showToast(errMsg, 'error');
            }
        }

        // Use the enhanced showToast from utils.js
        // function showToast is now available globally with improved styling


        // Apply language to HTML
        function applyLanguage() {
            var lang = getCurrentLanguage();
            if (document.documentElement) {
                document.documentElement.lang = lang;
            }
            // Also update html element if it has an id
            var htmlLang = document.getElementById('htmlLang');
            if (htmlLang) {
                htmlLang.lang = lang;
            }
        }

        // Check push notifications status
        async function checkPushNotificationsStatus() {
            try {
                var isSubscribed = await pushNotificationsManager.isSubscribed();
                var toggle = document.getElementById('pushNotificationsToggle');
                
                if (toggle) {
                    if (isSubscribed) {
                        toggle.classList.add('active');
                    } else {
                        toggle.classList.remove('active');
                    }
                }
            } catch (error) {
            }
        }
        
        // Toggle push notifications 
        async function togglePushNotifications(element) {
            var isActive = element.classList.contains('active');
            
            if (isActive) {
                // Unsubscribe
                try {
                    await pushNotificationsManager.unsubscribe();
                    element.classList.remove('active');
                    const disabledMessage = getCurrentLanguage() === 'fr' ? 'Notifications push désactivées' : 'Push notifications disabled';
                    showToast(disabledMessage, 'success');
                } catch (error) {
                    showToast('Error disabling push notifications', 'error');
                }
            } else {
                // Subscribe
                try {
                    // Initialize push notifications first if needed
                    if (!pushNotificationsManager.registration) {
                        const initialized = await pushNotificationsManager.init();
                        if (!initialized) {
                            throw new Error('Push notifications are not supported in this browser');
                        }
                    }
                    
                    // Request permission and subscribe
                    await pushNotificationsManager.requestPermission();
                    element.classList.add('active');
                    
                    // Wait a moment for subscription to be saved on server
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Double-check subscription status
                    const isSubscribed = await pushNotificationsManager.isSubscribed();
                    
                    if (isSubscribed) {
                        const enabledMessage = getCurrentLanguage() === 'fr' ? 'Notifications push activées !' : 'Push notifications enabled!';
                        showToast(enabledMessage, 'success');
                    } else {
                        showToast('Push notifications enabled, but subscription may not be complete. Please try again.', 'error');
                        element.classList.remove('active');
                    }
                } catch (error) {
                    element.classList.remove('active');
                    
                    if (error.message && error.message.includes('User not authenticated')) {
                        const lang = getCurrentLanguage();
                        const message = lang === 'fr' 
                            ? 'Session expirée. Veuillez actualiser la page et réessayer.' 
                            : 'Session expired. Please refresh the page and try again.';
                        showToast(message, 'error');
                    } else if (error.message && error.message.includes('denied')) {
                        const lang = getCurrentLanguage();
                        const message = lang === 'fr' 
                            ? '🔔 Autorisation refusée. Pour recevoir les notifications, cliquez sur l\'icône 🔒 dans la barre d\'adresse et autorisez les notifications.' 
                            : '🔔 Permission denied. To receive notifications, click the 🔒 icon in the address bar and allow notifications.';
                        showToast(message, 'error', 8000); // Message plus long, timeout plus long
                        
                        // Afficher un guide visuel
                        showNotificationGuide(lang);
                    } else if (error.message && error.message.includes('not supported')) {
                        const lang = getCurrentLanguage();
                        const message = lang === 'fr' 
                            ? 'Les notifications push ne sont pas supportées par ce navigateur.' 
                            : 'Push notifications are not supported in this browser.';
                        showToast(message, 'error');
                    } else {
                        const lang = getCurrentLanguage();
                        const errorPrefix = lang === 'fr' ? 'Erreur d\'activation des notifications: ' : 'Error enabling push notifications: ';
                        showToast(errorPrefix + (error.message || 'Unknown error'), 'error');
                    }
                }
            }
        }

        // Test push notification function - DISABLED IN PRODUCTION
        /*
        async function testPushNotification() {
            // This function is disabled in production
            showToast('Test notifications are disabled in production.', 'info');
        }
        */
        
        // Make togglePrivacySetting available globally
        window.togglePrivacySetting = togglePrivacySetting;
        
        // Expose all onclick-referenced functions globally
        window.toggleSwitch = toggleSwitch;
        window.handleAvatarUpload = handleAvatarUpload;
        window.saveProfile = saveProfile;
        window.savePreferences = savePreferences;
        window.changePassword = changePassword;
        window.exportData = exportData;
        window.deleteAccount = deleteAccount;
        window.togglePushNotifications = togglePushNotifications;
        window.openTermsInLanguage = openTermsInLanguage;
        window.openPrivacyInLanguage = openPrivacyInLanguage;
        window.downloadTermsAsPDF = downloadTermsAsPDF;
        window.downloadPrivacyAsPDF = downloadPrivacyAsPDF;
        window.unblockUserFromSettings = unblockUserFromSettings;

        async function loadBlockedUsers() {
            var container = document.getElementById('blockedUsersList');
            if (!container) return;

            try {
                var result = await blockedAPI.getAll();
                if (!result.success || !result.data || result.data.length === 0) {
                    container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 1rem;" data-i18n="noBlockedUsers">' + (t('noBlockedUsers') || 'No blocked users') + '</p>';
                    return;
                }

                var html = '';
                result.data.forEach(function(blocked) {
                    var avatarHtml = '';
                    if (blocked.avatar) {
                        avatarHtml = '<img src="' + blocked.avatar + '" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">';
                    } else {
                        var initials = blocked.name ? blocked.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase() : '?';
                        avatarHtml = '<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem;">' + initials + '</div>';
                    }

                    html += '<div class="setting-item" id="blocked-user-' + blocked.userId + '" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0;">' +
                        '<div style="flex-shrink: 0;">' + avatarHtml + '</div>' +
                        '<div style="flex: 1; min-width: 0;">' +
                            '<div style="font-weight: 600; color: #1f2937; font-size: 0.9rem;">' + blocked.name + '</div>' +
                        '</div>' +
                        '<button onclick="unblockUserFromSettings(' + blocked.userId + ')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem; border-radius: 0.75rem; background: #f0fdf4; color: #10b981; border: 1px solid #10b981; cursor: pointer; white-space: nowrap;" data-i18n="unblockBtn">' + (t('unblockBtn') || 'Unblock') + '</button>' +
                    '</div>';
                });

                container.innerHTML = html;
            } catch (e) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 1rem;">' + (t('tryAgain') || 'Please try again') + '</p>';
            }
        }

        async function unblockUserFromSettings(userId) {
            try {
                var result = await blockedAPI.unblock(userId);
                if (result.success) {
                    showToast(t('userUnblocked') || 'User unblocked');
                    // Remove the element from the list
                    var el = document.getElementById('blocked-user-' + userId);
                    if (el) el.remove();
                    // Check if list is now empty
                    var container = document.getElementById('blockedUsersList');
                    if (container && container.children.length === 0) {
                        container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 1rem;">' + (t('noBlockedUsers') || 'No blocked users') + '</p>';
                    }
                } else {
                    showToast(result.message || (t('tryAgain') || 'Please try again'));
                }
            } catch (e) {
                showToast(t('tryAgain') || 'Please try again');
            }
        }
        
        // Initialize
        (async function() {
            // Check authentication immediately on page load (even if cached)
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                return; // Redirect already happened
            }
            
            await loadSettings();
            applyLanguage();
            // Force apply translations after settings are loaded
            if (typeof applyTranslations === 'function') {
                applyTranslations();
            }
            await checkPushNotificationsStatus();
            await loadBlockedUsers();
            
            // Listen for browser back/forward button (popstate event)
            window.addEventListener('popstate', async function(event) {
                // When user navigates back/forward, check auth again
                const stillAuthenticated = await checkAuthentication();
                if (!stillAuthenticated) {
                    return; // Redirect already happened
                }
            });
            
            // Also check on focus (when user switches tabs and comes back)
            window.addEventListener('focus', async function() {
                const stillAuthenticated = await checkAuthentication();
                if (!stillAuthenticated) {
                    return; // Redirect already happened
                }
            });
            
            // Show test button if push notifications are enabled
            const pushToggle = document.getElementById('pushNotificationsToggle');
            const testItem = document.getElementById('testPushNotificationItem');
            if (pushToggle && pushToggle.classList.contains('active') && testItem) {
                testItem.style.display = 'block';
            }
        })();

        // Open terms/privacy in correct language
        function openTermsInLanguage() {
            const lang = getCurrentLanguage();
            const url = lang === 'en' ? 'terms-en.html' : 'terms.html';
            // Stay in same window to preserve session
            window.location.href = url;
        }

        function openPrivacyInLanguage() {
            const lang = getCurrentLanguage();
            const url = lang === 'en' ? 'privacy-en.html' : 'privacy.html';
            // Stay in same window to preserve session
            window.location.href = url;
        }

        // Load and display terms acceptance info
        async function loadTermsAcceptanceInfo() {
            try {
                const infoElement = document.getElementById('termsAcceptanceInfo');
                
                if (!infoElement) {
                    return;
                }
                
                const response = await fetch('api/auth/me.php', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                    if (response.status === 401) {
                        // Ne rien afficher dans la console si non connecté
                        return;
                    }
                    const data = await response.json();
                
                    if (data.success && data.data) {
                    const userId = data.data.user.id;
                    
                    if (!userId) {
                        infoElement.textContent = getCurrentLanguage() === 'fr' ? 'Erreur: ID utilisateur introuvable' : 'Error: User ID not found';
                        infoElement.style.color = '#ef4444';
                        return;
                    }
                    
                    const userResponse = await fetch('api/users.php?id=' + userId, {
                        credentials: 'include'
                    });
                    const userData = await userResponse.json();
                    
                    if (userData.success && userData.data) {
                        const termsAcceptedAt = userData.data.terms_accepted_at;
                        const termsVersion = userData.data.terms_version;
                        
                        if (termsAcceptedAt) {
                            const acceptedDate = new Date(termsAcceptedAt);
                            const formattedDate = acceptedDate.toLocaleDateString(getCurrentLanguage() === 'fr' ? 'fr-FR' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                            
                            const version = termsVersion || 'v1.0';
                            const versionName = typeof TERMS_CONFIG !== 'undefined' && TERMS_CONFIG.VERSION_NAME ? TERMS_CONFIG.VERSION_NAME : version;
                            
                            infoElement.innerHTML = '<span data-i18n="termsAcceptedOn">' + t('termsAcceptedOn') + '</span> ' + 
                                                   '<strong>' + formattedDate + '</strong> (' + versionName + ')';
                            infoElement.style.color = '#10b981';
                        } else {
                            infoElement.textContent = getCurrentLanguage() === 'fr' ? 'Non acceptées' : 'Not accepted';
                            infoElement.style.color = '#ef4444';
                        }
                    } else {
                        infoElement.textContent = getCurrentLanguage() === 'fr' ? 'Erreur de chargement' : 'Loading error';
                        infoElement.style.color = '#6b7280';
                    }
                } else {
                    infoElement.textContent = getCurrentLanguage() === 'fr' ? 'Erreur de chargement' : 'Loading error';
                    infoElement.style.color = '#6b7280';
                }
            } catch (error) {
                const infoElement = document.getElementById('termsAcceptanceInfo');
                if (infoElement) {
                    infoElement.textContent = getCurrentLanguage() === 'fr' ? 'Erreur de chargement' : 'Loading error';
                    infoElement.style.color = '#6b7280';
                }
            }
        }

        // Call on page load
        setTimeout(loadTermsAcceptanceInfo, 500);

        // PDF Download functions
        function downloadTermsAsPDF() {
            const lang = getCurrentLanguage();
            const url = lang === 'en' ? 'terms-en.html' : 'terms.html';
            window.open(url + '?print=pdf', '_blank');
        }

        function downloadPrivacyAsPDF() {
            const lang = getCurrentLanguage();
            const url = lang === 'en' ? 'privacy-en.html' : 'privacy.html';
            window.open(url + '?print=pdf', '_blank');
        }

        // Conversation Management Functions
        async function toggleConversationSetting(toggle, settingName) {
            try {
                const isActive = toggle.classList.contains('active');
                const newValue = !isActive;
                
                const response = await fetch('api/users.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        [settingName]: newValue
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (newValue) {
                        toggle.classList.add('active');
                    } else {
                        toggle.classList.remove('active');
                    }
                    const message = getCurrentLanguage() === 'fr' ? 'Paramètres sauvegardés' : 'Settings saved';
                    showToast(message, 'success');
                } else {
                    throw new Error(result.message || 'Failed to save setting');
                }
            } catch (error) {
                const message = getCurrentLanguage() === 'fr' ? 'Erreur de sauvegarde' : 'Error saving settings';
                showToast(message, 'error');
            }
        }

        // Make toggleConversationSetting available globally
        window.toggleConversationSetting = toggleConversationSetting;

        /**
         * Show a visual guide for enabling notifications
         */
        function showNotificationGuide(lang) {
            const title = lang === 'fr' ? 'Comment activer les notifications' : 'How to enable notifications';
            const steps = lang === 'fr' ? [
                'Cherchez l\'icône 🔒 ou ℹ️ dans la barre d\'adresse',
                'Cliquez sur cette icône',
                'Changez "Notifications" de "Bloquer" à "Autoriser"',
                'Rechargez la page et réessayez'
            ] : [
                'Look for the 🔒 or ℹ️ icon in the address bar',
                'Click on this icon',  
                'Change "Notifications" from "Block" to "Allow"',
                'Reload the page and try again'
            ];
            
            const modal = document.createElement('div');
            modal.className = 'notification-guide-modal';
            modal.innerHTML = `
                <div class="notification-guide-backdrop" onclick="this.closest('.notification-guide-modal').remove()"></div>
                <div class="notification-guide-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="close-btn" onclick="this.closest('.notification-guide-modal').remove()" aria-label="Fermer">
                            ×
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="steps-container">
                            ${steps.map((step, index) => `
                                <div class="step-item">
                                    <div class="step-number">${index + 1}</div>
                                    <div class="step-text">${step}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="browser-guide">
                            <p class="browser-title">${lang === 'fr' ? 'Icônes par navigateur :' : 'Icons by browser:'}</p>
                            <div class="browser-icons">
                                <div class="browser-item">
                                    <span class="browser-icon">🔒</span>
                                    <span class="browser-name">Chrome</span>
                                </div>
                                <div class="browser-item">
                                    <span class="browser-icon">🛡️</span>
                                    <span class="browser-name">Firefox</span>
                                </div>
                                <div class="browser-item">
                                    <span class="browser-icon">🔒</span>
                                    <span class="browser-name">Edge</span>
                                </div>
                                <div class="browser-item">
                                    <span class="browser-icon">ℹ️</span>
                                    <span class="browser-name">Safari</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="this.closest('.notification-guide-modal').remove()" class="btn-understand">
                            ${lang === 'fr' ? 'J\'ai compris' : 'Got it'}
                        </button>
                    </div>
                </div>
            `;
            
            // Style the modal with improved responsive CSS
            const style = document.createElement('style');
            style.textContent = `
                .notification-guide-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: fadeIn 0.3s ease-out;
                }
                
                .notification-guide-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                }
                
                .notification-guide-content {
                    background: white;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 520px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    position: relative;
                    animation: slideUp 0.3s ease-out;
                }
                
                .modal-header {
                    padding: 24px 24px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e5e7eb;
                    margin-bottom: 24px;
                }
                
                .modal-title {
                    margin: 0;
                    color: #1f2937;
                    font-size: 1.5rem;
                    font-weight: 600;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 28px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                
                .close-btn:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .modal-body {
                    padding: 0 24px;
                }
                
                .steps-container {
                    margin-bottom: 32px;
                }
                
                .step-item {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 16px;
                    padding: 12px;
                    background: #f0fdf4;
                    border-radius: 12px;
                    border-left: 4px solid #10b981;
                }
                
                .step-number {
                    background: #10b981;
                    color: white;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.9rem;
                    flex-shrink: 0;
                    margin-right: 12px;
                }
                
                .step-text {
                    color: #374151;
                    line-height: 1.5;
                    font-size: 0.95rem;
                }
                
                .browser-guide {
                    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                }
                
                .browser-title {
                    margin: 0 0 16px 0;
                    font-weight: 600;
                    color: #0f172a;
                    font-size: 1rem;
                }
                
                .browser-icons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    gap: 12px;
                }
                
                .browser-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 12px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s;
                }
                
                .browser-item:hover {
                    transform: translateY(-2px);
                }
                
                .browser-icon {
                    font-size: 24px;
                    margin-bottom: 8px;
                }
                
                .browser-name {
                    font-size: 0.85rem;
                    color: #4b5563;
                    font-weight: 500;
                }
                
                .modal-footer {
                    padding: 0 24px 24px;
                    text-align: center;
                }
                
                .btn-understand {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 120px;
                }
                
                .btn-understand:hover {
                    background: linear-gradient(135deg, #059669, #047857);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* Responsive design */
                @media (max-width: 640px) {
                    .notification-guide-modal {
                        padding: 16px;
                    }
                    
                    .notification-guide-content {
                        border-radius: 12px;
                    }
                    
                    .modal-header {
                        padding: 20px 20px 0;
                        margin-bottom: 20px;
                    }
                    
                    .modal-title {
                        font-size: 1.25rem;
                    }
                    
                    .modal-body {
                        padding: 0 20px;
                    }
                    
                    .modal-footer {
                        padding: 0 20px 20px;
                    }
                    
                    .step-item {
                        padding: 10px;
                        margin-bottom: 12px;
                    }
                    
                    .step-number {
                        width: 24px;
                        height: 24px;
                        font-size: 0.8rem;
                    }
                    
                    .step-text {
                        font-size: 0.9rem;
                    }
                    
                    .browser-icons {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .browser-item {
                        padding: 10px;
                    }
                    
                    .browser-icon {
                        font-size: 20px;
                    }
                }
                
                @media (max-width: 480px) {
                    .browser-icons {
                        grid-template-columns: 1fr;
                    }
                    
                    .browser-item {
                        flex-direction: row;
                        justify-content: center;
                        gap: 8px;
                    }
                    
                    .browser-icon {
                        margin-bottom: 0;
                    }
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(modal);
            
            // Auto-remove after 20 seconds
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.style.animation = 'fadeIn 0.3s ease-out reverse';
                    setTimeout(() => modal.remove(), 300);
                    style.remove();
                }
            }, 20000);
            
            // Remove style when modal is closed
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.close-btn') || e.target.closest('.btn-understand') || e.target.classList.contains('notification-guide-backdrop')) {
                    style.remove();
                }
            });
        }

        // Initialisation des menus déroulants personnalisés
        function initCustomSelects() {
            const customSelects = document.querySelectorAll('.custom-select');
            
            customSelects.forEach(select => {
                const trigger = select.querySelector('.select-trigger');
                const options = select.querySelector('.select-options');
                const optionItems = select.querySelectorAll('.select-option');
                const hiddenInput = select.nextElementSibling;
                const selectText = select.querySelector('.select-text');

                // Ouvrir/fermer le menu
                trigger.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Fermer tous les autres menus
                    document.querySelectorAll('.custom-select').forEach(otherSelect => {
                        if (otherSelect !== select) {
                            otherSelect.querySelector('.select-trigger').classList.remove('active');
                            otherSelect.querySelector('.select-options').classList.remove('open');
                        }
                    });
                    
                    // Toggle le menu actuel
                    trigger.classList.toggle('active');
                    options.classList.toggle('open');
                });

                // Sélectionner une option
                optionItems.forEach(option => {
                    option.addEventListener('click', function(e) {
                        e.stopPropagation();
                        
                        // Retirer la sélection précédente
                        optionItems.forEach(opt => opt.classList.remove('selected'));
                        
                        // Ajouter la sélection à l'option cliquée
                        this.classList.add('selected');
                        
                        // Mettre à jour le texte affiché et la valeur
                        const value = this.getAttribute('data-value');
                        const text = this.textContent;
                        
                        selectText.textContent = text;
                        hiddenInput.value = value;
                        select.setAttribute('data-value', value);
                        
                        // Fermer le menu
                        trigger.classList.remove('active');
                        options.classList.remove('open');
                    });
                });
            });

            // Fermer les menus en cliquant ailleurs
            document.addEventListener('click', function() {
                document.querySelectorAll('.custom-select').forEach(select => {
                    select.querySelector('.select-trigger').classList.remove('active');
                    select.querySelector('.select-options').classList.remove('open');
                });
            });
        }

        // Initialiser les menus personnalisés au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            initCustomSelects();
        });

        // Fonction pour mettre à jour un menu personnalisé
        function updateCustomSelect(selectElement, value) {
            if (!selectElement || !value) return;

            const customSelect = selectElement.parentElement.querySelector('.custom-select');
            if (!customSelect) return;

            const selectText = customSelect.querySelector('.select-text');
            const hiddenInput = customSelect.nextElementSibling;
            const options = customSelect.querySelectorAll('.select-option');

            // Trouver l'option correspondante
            options.forEach(option => {
                option.classList.remove('selected');
                if (option.getAttribute('data-value') === value) {
                    option.classList.add('selected');
                    if (selectText) selectText.textContent = option.textContent;
                    if (hiddenInput) hiddenInput.value = value;
                    customSelect.setAttribute('data-value', value);
                }
            });
        }

        // Fonction pour obtenir la valeur d'un menu personnalisé
        function getCustomSelectValue(elementId) {
            const hiddenInput = document.getElementById(elementId);
            if (hiddenInput) {
                return hiddenInput.value;
            }
            
            // Fallback pour les anciens selects natifs
            const selectElement = document.querySelector(`select#${elementId}`);
            return selectElement ? selectElement.value : '';
        }
