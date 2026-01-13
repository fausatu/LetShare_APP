                // IMMEDIATE AUTH CHECK - Runs as soon as script loads
        // This MUST run synchronously to prevent page from loading
        (async function immediateAuthCheck() {
            // Clear localStorage user data first to force fresh API check
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            try {
                const isAuth = await checkAuth();
                if (!isAuth) {
                    localStorage.clear();
                    sessionStorage.clear();
                    // Use replace to prevent back button
                    window.location.replace('login.html?nocache=' + Date.now());
                    // Stop execution
                    throw new Error('Not authenticated');
                }
            } catch (error) {
                // If check fails or returns false, clear everything and redirect
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('login.html?nocache=' + Date.now());
                // Prevent any further code execution
                throw error;
            }
        })().catch(function(error) {
            // Silently catch to prevent console errors, redirect is already happening
            console.log('Redirecting to login...');
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
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('login.html?nocache=' + Date.now());
                    return false;
                }
                return true;
            } catch (error) {
                console.error('Auth check error:', error);
                // On error, assume not authenticated
                localStorage.clear();
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
                    localStorage.clear();
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
                    console.error('applyTranslations function not found');
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
                    console.log('Auto delete rejected value:', user.auto_delete_rejected_conversations);
                    if (user.auto_delete_rejected_conversations === true || user.auto_delete_rejected_conversations === undefined || user.auto_delete_rejected_conversations === null) {
                        autoDeleteRejectedToggle.classList.add('active');
                        console.log('Toggle set to active');
                    } else {
                        console.log('Toggle set to inactive');
                    }
                }
                
                // Load notifications (from localStorage for now, can be moved to API later)
                var notificationSettings = settings.notifications || {};
                ['messages', 'requests', 'accepted', 'reviews'].forEach(function(key) {
                    var toggle = document.querySelector('[data-setting="' + key + '"]');
                    if (toggle && notificationSettings[key] !== false) {
                        toggle.classList.add('active');
                    }
                });
                
                
                // Load preferences from API
                if (user.language) document.getElementById('language').value = user.language;
                // dateFormat field removed from settings page
                
                // Force translations update after all settings are loaded
                setTimeout(() => {
                    if (typeof applyTranslations === 'function') {
                        applyTranslations();
                        console.log('Translations applied after settings load');
                    }
                }, 100);
                
                // Load avatar from API
                var avatarPreview = document.getElementById('avatarPreview');
                if (avatarPreview) {
                    if (user.avatar) {
                        avatarPreview.innerHTML = '<img src="' + user.avatar + '" alt="Avatar">';
                    } else {
                        // Show user initials if no avatar
                        var initials = user.name ? user.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase() : 'U';
                        avatarPreview.textContent = initials;
                        avatarPreview.innerHTML = initials; // Clear any previous content
                    }
                }
            } catch (error) {
                console.error('Error loading settings:', error);
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
                        avatarPreview.innerHTML = '<img src="' + settings.avatar + '" alt="Avatar">';
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
        function toggleSwitch(element) {
            element.classList.toggle('active');
            saveNotificationSettings();
        }

        // Toggle privacy setting
        async function togglePrivacySetting(element, settingKey) {
            var previousState = element.classList.contains('active');
            element.classList.toggle('active');
            var isActive = element.classList.contains('active');
            
            try {
                var updateData = {};
                updateData[settingKey] = isActive;
                
                var response = await fetch(API_BASE_URL + '/users.php', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update privacy setting');
                }
                
                var result = await response.json();
                if (result.success && result.data) {
                    // Update localStorage with new user data from API response
                    var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    // Merge all updated fields from API response
                    Object.keys(result.data).forEach(function(key) {
                        if (result.data[key] !== undefined) {
                            currentUser[key] = result.data[key];
                        }
                    });
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Also store in sessionStorage for immediate cross-page updates
                    sessionStorage.setItem('updatedUserData', JSON.stringify(result.data));
                    sessionStorage.setItem('userProfileJustUpdated', 'true');
                    
                    // Update the toggle state based on API response
                    if (result.data[settingKey] === true || result.data[settingKey] === 1) {
                        element.classList.add('active');
                    } else {
                        element.classList.remove('active');
                    }
                    
                    // Dispatch event to notify other pages (like profile page)
                    window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                        detail: result.data
                    }));
                    
                    // Also dispatch a specific privacy setting changed event
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
                console.error('Error updating privacy setting:', error);
                // Revert toggle on error
                if (previousState) {
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
                const errorMessage = getCurrentLanguage() === 'fr' ? 'Échec de la mise à jour. Veuillez réessayer.' : 'Failed to update privacy setting. Please try again.';
                showToast(errorMessage, 'error');
            }
        }

        // Save notification settings
        function saveNotificationSettings() {
            var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
            if (!settings.notifications) settings.notifications = {};
            
            ['messages', 'requests', 'accepted', 'reviews'].forEach(function(key) {
                var toggle = document.querySelector('[data-setting="' + key + '"]');
                if (toggle) {
                    settings.notifications[key] = toggle.classList.contains('active');
                }
            });
            
            localStorage.setItem('userSettings', JSON.stringify(settings));
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
                console.error('Error saving profile:', error);
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
                console.error('Error saving preferences:', error);
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
                    console.error('Error uploading avatar:', error);
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
                // TODO: Create password change API endpoint
                // For now, show a message that this feature is coming soon
                const passwordMessage = getCurrentLanguage() === 'fr' ? 'Changement de mot de passe bientôt disponible' : 'Password change feature coming soon';
                showToast(passwordMessage, 'error');
                // const response = await authAPI.changePassword(current, newPass);
                // if (response.success) {
                //     showToast(t('passwordChanged'));
                //     document.getElementById('currentPassword').value = '';
                //     document.getElementById('newPassword').value = '';
                //     document.getElementById('confirmPassword').value = '';
                // } else {
                //     throw new Error(response.message || 'Failed to change password');
                // }
            } catch (error) {
                console.error('Error changing password:', error);
                showToast('Error: ' + (error.message || 'Failed to change password'), 'error');
            }
        }

        // Export data
        function exportData() {
            var data = {
                settings: JSON.parse(localStorage.getItem('userSettings') || '{}'),
                messages: JSON.parse(localStorage.getItem('messages') || '[]'),
                userItems: JSON.parse(localStorage.getItem('userItems') || '[]'),
                interestedItems: []
            };
            
            // Get interested items
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.startsWith('interested_')) {
                    data.interestedItems.push(JSON.parse(localStorage.getItem(key)));
                }
            }
            
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'letshare-data-' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
            
            showToast(t('dataExported'));
        }

        // Logout function
        async function logout() {
            try {
                await authAPI.logout();
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                // Clear all local storage and session storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Force a complete page reload without cache and redirect to login
                // Using replace() + timestamp to bypass cache
                window.location.replace('login.html?nocache=' + Date.now());
                
                // Also try to clear history for this domain
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
            // Create modal backdrop
            var modal = document.createElement('div');
            modal.className = 'delete-account-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            // Create modal content
            var modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            
            modalContent.innerHTML = 
                '<h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">Delete Account</h3>' +
                '<p style="margin: 0 0 1rem 0; color: #6b7280; line-height: 1.6;">Are you sure you want to permanently delete your account? This action cannot be undone.</p>' +
                '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">' +
                    '<p style="margin: 0; color: #991b1b; font-size: 0.875rem; line-height: 1.5;">' +
                        '<strong>Warning:</strong> This will permanently delete your account and all associated data including:' +
                    '</p>' +
                    '<ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; color: #991b1b; font-size: 0.875rem; line-height: 1.8;">' +
                        '<li>Your profile and personal information</li>' +
                        '<li>All your posted items</li>' +
                        '<li>All your conversations and messages</li>' +
                        '<li>Your reviews and ratings</li>' +
                    '</ul>' +
                '</div>' +
                '<div style="display: flex; gap: 0.75rem; justify-content: flex-end;">' +
                    '<button id="cancelDeleteAccountBtn" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; border-radius: 8px; color: #374151; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'">Cancel</button>' +
                    '<button id="confirmDeleteAccountBtn" style="padding: 0.75rem 1.5rem; border: none; background: #ef4444; border-radius: 8px; color: white; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">Delete Account</button>' +
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
                showToast('Deleting account...', 'error');
                
                const response = await usersAPI.deleteAccount();
                
                if (response.success) {
                    // Clear all local data
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    showToast('Account deleted successfully. Redirecting...', 'error');
                    
                    // Redirect to home page after a delay
                    setTimeout(function() {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Failed to delete account');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                showToast('Error deleting account. Please try again.', 'error');
            }
        }

        // Toast notification
        function showToast(message, type) {
            var toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = type === 'error' ? 'show' : 'show';
            toast.style.background = type === 'error' 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                : 'linear-gradient(135deg, #4ade80, #22c55e)';
            
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }


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
                console.error('Error checking push notifications status:', error);
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
                    console.error('Error unsubscribing from push notifications:', error);
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
                    console.error('Error subscribing to push notifications:', error);
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
                console.error('Error loading terms acceptance info:', error);
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
                
                console.log('Toggle state:', {
                    settingName: settingName,
                    currentlyActive: isActive,
                    newValue: newValue
                });
                
                const response = await fetch('api/users.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        [settingName]: newValue
                    })
                });
                
                console.log('API Response status:', response.status);
                const result = await response.json();
                console.log('API Response data:', result);
                
                if (result.success) {
                    if (newValue) {
                        toggle.classList.add('active');
                    } else {
                        toggle.classList.remove('active');
                    }
                    console.log('Toggle updated successfully');
                    const message = getCurrentLanguage() === 'fr' ? 'Paramètres sauvegardés' : 'Settings saved';
                    showToast(message, 'success');
                } else {
                    throw new Error(result.message || 'Failed to save setting');
                }
            } catch (error) {
                console.error('Error saving conversation setting:', error);
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
