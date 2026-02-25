// Translation cache - stores translations in memory to avoid quota waste
var translationCache = {};

function getCacheKey(text, targetLang) {
    // Create a simple cache key from text and language
    // Use MD5-like hash or simple combination to keep key manageable
    // For simplicity, use first 100 chars of text
    return targetLang + '_' + text.substring(0, 100);
}

function getCachedTranslation(text, targetLang) {
    var key = getCacheKey(text, targetLang);
    var cached = translationCache[key];
    if (cached) {
        console.log('[Translation Cache] Cache HIT for:', text.substring(0, 50), '-> cached as:', cached.substring(0, 50));
    }
    return cached || null;
}

function setCachedTranslation(text, translation, targetLang) {
    var key = getCacheKey(text, targetLang);
    translationCache[key] = translation;
    console.log('[Translation Cache] Stored translation for:', text.substring(0, 50), '-> result:', translation.substring(0, 50));
}

// Utility function to decode HTML entities
function decodeHtmlEntities(text) {
    if (!text) return text;
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Traduction automatique via Google Translate API (backend PHP)
async function autoTranslateText(text, targetLang, sourceLang) {
    try {
        // Default source language to 'fr' for backward compatibility
        if (!sourceLang) sourceLang = 'fr';
        
        // If source and target languages are the same, no translation needed
        if (sourceLang === targetLang) {
            return text;
        }
        
        // Check cache first
        var cachedTranslation = getCachedTranslation(text, targetLang);
        if (cachedTranslation) {
            return cachedTranslation;
        }
        
        const response = await fetch('api/translate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target: targetLang, source: sourceLang })
        });
        
        // Get response text first (regardless of status)
        const responseText = await response.text();
        
        // Check if response is OK
        if (!response.ok) {
            // Try to parse error message
            try {
                const errorData = JSON.parse(responseText);
            } catch (e) {
                // Continue with text return
            }
            return text;
        }
        
        // Check if result is empty
        if (!responseText || responseText.trim() === '') {
            return text;
        }
        
        // Parse JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return text;
        }
        
        if (data && data.data && data.data.translations && data.data.translations[0]) {
            var translatedText = data.data.translations[0].translatedText;
            
            // Decode HTML entities (&#39; -> ', &quot; -> ", etc.)
            translatedText = decodeHtmlEntities(translatedText);
            
            // Store in cache before returning
            setCachedTranslation(text, translatedText, targetLang);
            
            return translatedText;
        }
        return text;
    } catch (e) {
        console.error('Translation error:', e);
        return text;
    }
}

// Utility Functions
// =================

/**
 * Escape HTML to prevent XSS attacks
 * Use this for any user-generated content that goes into innerHTML
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for HTML insertion
 */
function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Alias for escapeHtml - shorter name
 */
var sanitize = escapeHtml;

// Show toast notification with modern styling
function showToast(message, type = 'success') {
    // Remove any existing toasts first
    var existingToasts = document.querySelectorAll('.modern-toast');
    existingToasts.forEach(function(toast) {
        toast.remove();
    });
    
    // Create modern toast element
    var toast = document.createElement('div');
    toast.className = 'modern-toast';
    
    // Determine icon and colors based on type
    var iconHtml = '';
    var backgroundStyle = '';
    var borderStyle = '';
    
    switch (type) {
        case 'success':
            iconHtml = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="9,11 12,14 22,4"></polyline></svg>';
            backgroundStyle = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);';
            borderStyle = 'border: 1px solid rgba(16, 185, 129, 0.3);';
            break;
        case 'error':
            iconHtml = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            backgroundStyle = 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);';
            borderStyle = 'border: 1px solid rgba(239, 68, 68, 0.3);';
            break;
        case 'warning':
            iconHtml = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            backgroundStyle = 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);';
            borderStyle = 'border: 1px solid rgba(245, 158, 11, 0.3);';
            break;
        case 'info':
            iconHtml = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            backgroundStyle = 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);';
            borderStyle = 'border: 1px solid rgba(59, 130, 246, 0.3);';
            break;
        default:
            iconHtml = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="9,11 12,14 22,4"></polyline></svg>';
            backgroundStyle = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);';
            borderStyle = 'border: 1px solid rgba(16, 185, 129, 0.3);';
    }
    
    // Style the toast
    toast.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        ${backgroundStyle}
        ${borderStyle}
        border-radius: 1rem;
        padding: 1.25rem 1.5rem;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10002;
        box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        backdrop-filter: blur(10px);
        transform: translateX(400px);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        max-width: 400px;
        min-width: 300px;
        font-size: 0.9375rem;
        line-height: 1.5;
    `;
    
    // Add icon and message
    toast.innerHTML = `
        <div style="flex-shrink: 0; opacity: 0.9;">
            ${iconHtml}
        </div>
        <div style="flex: 1;">
            ${message}
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; opacity: 0.7; cursor: pointer; padding: 0.25rem; border-radius: 50%; transition: all 0.2s; margin-left: 0.5rem; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;" onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.opacity='0.7'; this.style.background='none'" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    // Append to body
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(function() {
        toast.style.transform = 'translateX(0)';
    }, 50);
    
    // Auto-remove after 5 seconds
    setTimeout(function() {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(function() {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 400);
        }
    }, 5000);
    
    // Handle mobile positioning
    if (window.innerWidth <= 768) {
        toast.style.top = '1rem';
        toast.style.right = '1rem';
        toast.style.left = '1rem';
        toast.style.maxWidth = 'none';
        toast.style.minWidth = 'auto';
        toast.style.transform = 'translateY(-100px)';
        
        setTimeout(function() {
            toast.style.transform = 'translateY(0)';
        }, 50);
        
        // Update auto-remove for mobile
        setTimeout(function() {
            if (toast.parentElement) {
                toast.style.transform = 'translateY(-100px)';
                toast.style.opacity = '0';
                setTimeout(function() {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 400);
            }
        }, 5000);
    }
}

// Format time ago (e.g., "5m ago", "2h ago")
function formatTimeAgo(dateString) {
    if (!dateString) return 'just now';
    
    var date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'just now';
    }
    
    var now = new Date();
    var diff = now - date;
    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    
    // More precise time display for recent items
    if (seconds < 10) return 'just now';
    if (seconds < 60) return seconds + 's';
    if (minutes < 60) return minutes + 'm';
    if (hours < 24) return hours + 'h';
    if (days < 7) return days + 'd';
    
    // For older dates, show month and day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format message date
function formatMessageDate(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diff = now - date;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';
    return date.toLocaleDateString();
}

