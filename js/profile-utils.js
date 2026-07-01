// ==========================================
// PROFILE UTILITIES MODULE
// Shared helpers: user access, translation helpers, time formatting, toast
// ==========================================

// Get current user info from API or localStorage (fallback)
export async function getCurrentUser(forceRefresh = false) {
    if (!forceRefresh) {
        var storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                var user = JSON.parse(storedUser);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department: user.department || 'Finance',
                    avatar: user.avatar || null,
                    language: user.language || 'en',
                    initials: function() {
                        var name = this.name;
                        return name.split(' ').map(function(n) { return n[0]; }).join('');
                    }
                };
            } catch (e) {
                // If parsing fails, fetch from API
            }
        }
    }

    try {
        var response = await authAPI.getCurrentUser();
        if (response.success && response.data && response.data.user) {
            var user = response.data.user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department || 'Finance',
                avatar: user.avatar || null,
                language: user.language || 'en',
                initials: function() {
                    var name = this.name;
                    return name.split(' ').map(function(n) { return n[0]; }).join('');
                }
            };
        }
    } catch (error) {
        if (!forceRefresh) {
            var storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    var user = JSON.parse(storedUser);
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        department: user.department || 'Finance',
                        avatar: user.avatar || null,
                        language: user.language || 'en',
                        initials: function() {
                            var name = this.name;
                            return name.split(' ').map(function(n) { return n[0]; }).join('');
                        }
                    };
                } catch (e) {}
            }
        }
    }

    return {
        id: null,
        name: 'Guest',
        email: '',
        department: 'Finance',
        avatar: null,
        language: 'en',
        initials: function() { return 'G'; }
    };
}

// Synchronous version for backward compatibility
export function getCurrentUserSync() {
    var storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            var user = JSON.parse(storedUser);
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department || 'Finance',
                avatar: user.avatar || null,
                language: user.language || 'en',
                initials: function() {
                    var name = this.name;
                    return name.split(' ').map(function(n) { return n[0]; }).join('');
                }
            };
        } catch (e) {}
    }
    return {
        id: null,
        name: 'Guest',
        email: '',
        department: 'Finance',
        avatar: null,
        language: 'en',
        initials: function() { return 'G'; }
    };
}

/**
 * Translate card elements (title, description) inside a container.
 */
export function translateCardElements(container, items, options) {
    if (typeof autoTranslateText !== 'function') return;
    var opts = options || {};
    var titleSel = opts.titleSelector || 'h3';
    var descSel = opts.descSelector || null;
    var skipOwn = opts.skipOwnItems !== false;
    var maxDesc = opts.maxDescLength || 0;
    var currentUser = skipOwn ? getCurrentUserSync() : null;
    var userLang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'fr';

    items.forEach(function(item) {
        if (skipOwn && currentUser && currentUser.id && item.user_id && Number(currentUser.id) === Number(item.user_id)) return;
        var card = container.querySelector('[data-item-id="' + item.id + '"]');
        if (!card) return;

        var titleEl = card.querySelector(titleSel);
        if (titleEl && titleEl.textContent) {
            autoTranslateText(titleEl.textContent, userLang).then(function(translated) {
                if (translated && translated !== titleEl.textContent) titleEl.textContent = translated;
            }).catch(function() {});
        }

        if (descSel) {
            var descEl = card.querySelector(descSel);
            if (descEl && descEl.textContent) {
                autoTranslateText(descEl.textContent, userLang).then(function(translated) {
                    if (translated && translated !== descEl.textContent) {
                        descEl.textContent = maxDesc && translated.length > maxDesc ? translated.substring(0, maxDesc) + '...' : translated;
                    }
                }).catch(function() {});
            }
        }
    });
}

/**
 * Translate a single conversation card's item title.
 */
export function translateConversationTitle(card, itemTitle) {
    if (typeof autoTranslateText !== 'function' || !itemTitle) return;
    var titleEl = card.querySelector('.request-item-title');
    if (!titleEl) return;
    var userLang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'fr';
    autoTranslateText(itemTitle, userLang).then(function(translated) {
        if (translated) titleEl.textContent = translated;
    }).catch(function() {});
}

// Format date (relative time, coarse)
export function formatDate(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diff = now - date;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return minutes + t('timeMinAgo');
    if (hours < 24) return hours + t('timeHourAgo');
    if (days < 7) return days + t('timeDayAgo');
    return date.toLocaleDateString();
}

// Format time ago (precise, for cards)
export function formatTimeAgo(dateString) {
    if (!dateString) return t('justNow');

    var date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return t('justNow');
    }

    var now = new Date();
    var diff = now - date;
    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (seconds < 10) return t('justNow');
    if (seconds < 60) return seconds + t('timeSecShort');
    if (minutes < 60) return minutes + t('timeMinShort');
    if (hours < 24) return hours + t('timeHourShort');
    if (days < 7) return days + t('timeDayShort');

    var lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'en';
    var locale = lang === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// Periodic time updates
var profileTimeUpdateInterval = null;
export function startProfileTimeUpdates() {
    updateProfileItemTimes();
    if (profileTimeUpdateInterval) {
        clearInterval(profileTimeUpdateInterval);
    }
    profileTimeUpdateInterval = setInterval(function() {
        updateProfileItemTimes();
    }, 5000);
}

function updateProfileItemTimes() {
    var timeElements = document.querySelectorAll('.item-time[data-created-at]');
    timeElements.forEach(function(el) {
        var createdAt = el.getAttribute('data-created-at');
        if (createdAt) {
            var newTime = formatTimeAgo(createdAt);
            var currentTime = el.textContent.trim();
            if (currentTime !== newTime) {
                el.textContent = newTime;
            }
        }
    });
}

export function showToast(message) {
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}
