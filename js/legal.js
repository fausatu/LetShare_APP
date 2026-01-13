// Legal Documents JavaScript

// Auto-print if ?print=pdf in URL
if (window.location.search.includes('print=pdf')) {
    window.onload = function() {
        window.print();
    };
}

// Smart back navigation
function goBack() {
    // Check if there's history and if we came from the same site
    if (window.history.length > 1 && document.referrer && document.referrer.indexOf(window.location.hostname) !== -1) {
        window.history.back();
    } else {
        // If no history or came from external site, go to settings or index
        const isLoggedIn = localStorage.getItem('jwt_token');
        window.location.href = isLoggedIn ? 'settings.html' : 'index.html';
    }
}
