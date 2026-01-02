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
                
                // Load profile from API
                if (user.name) document.getElementById('fullName').value = user.name;
                if (user.email) document.getElementById('email').value = user.email;
                if (user.department) document.getElementById('department').value = user.department;
                
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
                if (settings.dateFormat) document.getElementById('dateFormat').value = settings.dateFormat;
                
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
                if (settings.department) document.getElementById('department').value = settings.department;
                if (settings.language) document.getElementById('language').value = settings.language;
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
                    
                    showToast('Privacy setting updated', 'success');
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
                showToast('Failed to update privacy setting. Please try again.', 'error');
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
                    department: document.getElementById('department').value.trim()
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

        // Translations
        const translations = {
            en: {
                preferencesSaved: 'Preferences saved!',
                profileUpdated: 'Profile updated successfully!',
                avatarUpdated: 'Avatar updated!',
                passwordChanged: 'Password changed successfully!',
                dataExported: 'Data exported successfully!',
                accountDeleted: 'Account deleted. Redirecting...',
                fillAllFields: 'Please fill all fields',
                passwordsNoMatch: 'New passwords do not match',
                passwordTooShort: 'Password must be at least 6 characters',
                deleteConfirm: 'Are you sure you want to delete your account? This action cannot be undone.',
                deleteConfirm2: 'This will permanently delete all your data. Type DELETE to confirm.'
            },
            fr: {
                preferencesSaved: 'Préférences enregistrées !',
                profileUpdated: 'Profil mis à jour avec succès !',
                avatarUpdated: 'Avatar mis à jour !',
                passwordChanged: 'Mot de passe modifié avec succès !',
                dataExported: 'Données exportées avec succès !',
                accountDeleted: 'Compte supprimé. Redirection...',
                fillAllFields: 'Veuillez remplir tous les champs',
                passwordsNoMatch: 'Les nouveaux mots de passe ne correspondent pas',
                passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
                deleteConfirm: 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
                deleteConfirm2: 'Cela supprimera définitivement toutes vos données. Tapez DELETE pour confirmer.'
            }
        };

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
                var newLanguage = document.getElementById('language').value;
                var dateFormat = document.getElementById('dateFormat').value;
                
                // Update language via API
                if (oldLanguage !== newLanguage) {
                    const response = await usersAPI.update({ language: newLanguage });
                    if (!response.success) {
                        throw new Error(response.message || 'Failed to update language');
                    }
                }
                
                // Save dateFormat to localStorage (can be moved to API later)
                var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                settings.language = newLanguage;
                settings.dateFormat = dateFormat;
                localStorage.setItem('userSettings', JSON.stringify(settings));
                
                showToast(t('preferencesSaved'));
                
                // If language changed, reload page to apply translations
                if (oldLanguage !== newLanguage) {
                    setTimeout(function() {
                        window.location.reload();
                    }, 1000);
                }
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
                showToast('Image size must be less than 2MB', 'error');
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
                showToast('Password change feature coming soon', 'error');
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
                        window.location.href = 'Test.html';
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
                var testItem = document.getElementById('testPushNotificationItem');
                
                if (toggle) {
                    if (isSubscribed) {
                        toggle.classList.add('active');
                        // Show test button if subscribed
                        if (testItem) {
                            testItem.style.display = 'block';
                        }
                    } else {
                        toggle.classList.remove('active');
                        // Hide test button if not subscribed
                        if (testItem) {
                            testItem.style.display = 'none';
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking push notifications status:', error);
                // On error, hide test button to be safe
                var testItem = document.getElementById('testPushNotificationItem');
                if (testItem) {
                    testItem.style.display = 'none';
                }
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
                    const testItem = document.getElementById('testPushNotificationItem');
                    if (testItem) {
                        testItem.style.display = 'none';
                    }
                    showToast('Push notifications disabled', 'success');
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
                    const testItem = document.getElementById('testPushNotificationItem');
                    if (testItem) {
                        testItem.style.display = isSubscribed ? 'block' : 'none';
                    }
                    
                    if (isSubscribed) {
                        showToast('Push notifications enabled! You can now test them below.', 'success');
                    } else {
                        showToast('Push notifications enabled, but subscription may not be complete. Please try again.', 'error');
                        element.classList.remove('active');
                    }
                } catch (error) {
                    console.error('Error subscribing to push notifications:', error);
                    element.classList.remove('active');
                    const testItem = document.getElementById('testPushNotificationItem');
                    if (testItem) {
                        testItem.style.display = 'none';
                    }
                    
                    if (error.message && error.message.includes('User not authenticated')) {
                        showToast('Session expired. Please refresh the page and try again.', 'error');
                    } else if (error.message && error.message.includes('denied')) {
                        showToast('Notification permission denied. Please enable it in your browser settings.', 'error');
                    } else if (error.message && error.message.includes('not supported')) {
                        showToast('Push notifications are not supported in this browser.', 'error');
                    } else {
                        showToast('Error enabling push notifications: ' + (error.message || 'Unknown error'), 'error');
                    }
                }
            }
        }

        // Test push notification function
        async function testPushNotification() {
            // First check if notifications are enabled
            try {
                const isSubscribed = await pushNotificationsManager.isSubscribed();
                if (!isSubscribed) {
                    showToast('Please enable push notifications first by toggling the switch above.', 'error');
                    return;
                }
                
                // Check notification permission
                if (Notification.permission !== 'granted') {
                    showToast('Notification permission is not granted. Please check your browser settings.', 'error');
                    return;
                }
                
                // Check service worker registration
                if (!pushNotificationsManager.registration) {
                    await pushNotificationsManager.init();
                }
                
                if (!pushNotificationsManager.registration) {
                    showToast('Service Worker not available. Please refresh the page.', 'error');
                    return;
                }
            } catch (error) {
                console.error('Error checking subscription status:', error);
                showToast('Unable to check notification status. Please try enabling notifications again.', 'error');
                return;
            }
            
            try {
                showToast('Sending test notification...', 'info');
                
                const response = await fetch(API_BASE_URL + '/push/test.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { message: 'Server error: ' + response.status };
                    }
                    throw new Error(errorData.message || 'Failed to send test notification');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    var successCount = data.data && data.data.success_count ? data.data.success_count : 0;
                    var message = successCount > 0 
                        ? 'Test notification sent to ' + successCount + ' device(s)!'
                        : 'Test notification sent!';
                    showToast(message, 'success');
                    
                    // Check if there were failures or expired subscriptions
                    if (data.data && data.data.fail_count > 0 && data.data.errors && data.data.errors.length > 0) {
                        const hasExpired = data.data.errors.some(function(err) {
                            return err && (err.includes('410') || err.includes('Gone') || err.includes('expired'));
                        });
                        if (hasExpired) {
                            showToast('Some old subscriptions were removed. Please try again.', 'info');
                        }
                    }
                } else {
                    const errorMsg = data.message || 'Unknown error';
                    
                    // Check if error is due to expired subscriptions
                    if (errorMsg.includes('410') || errorMsg.includes('Gone') || errorMsg.includes('expired')) {
                        showToast('Your push subscription has expired. Please disable and re-enable push notifications.', 'error');
                        // Reset toggle state
                        const toggle = document.getElementById('pushNotificationsToggle');
                        if (toggle) {
                            toggle.classList.remove('active');
                        }
                        const testItem = document.getElementById('testPushNotificationItem');
                        if (testItem) {
                            testItem.style.display = 'none';
                        }
                    } else {
                        showToast('Failed to send test notification: ' + errorMsg, 'error');
                    }
                }
            } catch (error) {
                console.error('Error sending test notification:', error);
                if (error.message.includes('No push subscriptions found') || error.message.includes('enable push notifications')) {
                    showToast('Please enable push notifications first by toggling the switch above, then try again.', 'error');
                } else {
                    showToast('Error: ' + (error.message || 'Failed to send test notification'), 'error');
                }
            }
        }
        
        // Make testPushNotification available globally
        window.testPushNotification = testPushNotification;
        
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
