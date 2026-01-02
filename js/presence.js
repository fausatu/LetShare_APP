// Presence Management (Online/Offline Status)
// ===========================================

var presenceHeartbeatInterval = null;

function startPresenceHeartbeat() {
    // Update presence immediately
    updatePresence();
    
    // Clear existing interval if any
    if (presenceHeartbeatInterval) {
        clearInterval(presenceHeartbeatInterval);
    }
    
    // Update presence every 30 seconds
    presenceHeartbeatInterval = setInterval(function() {
        updatePresence();
    }, 30000); // 30 seconds
}

function stopPresenceHeartbeat() {
    if (presenceHeartbeatInterval) {
        clearInterval(presenceHeartbeatInterval);
        presenceHeartbeatInterval = null;
    }
}

async function updatePresence() {
    try {
        await presenceAPI.updatePresence();
    } catch (error) {
        console.error('Error updating presence:', error);
        // Don't show error to user, just log it
    }
}

