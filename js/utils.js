// Utility Functions
// =================

// Show toast notification
function showToast(message) {
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(function() {
            toast.classList.remove('show');
        }, 3000);
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

