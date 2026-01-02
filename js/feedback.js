// Post-Exchange Feedback Management
// ==================================

var currentFeedbackConversation = null;
var selectedFeedbackType = null;
var selectedRating = 0;

function openFeedbackModal(conversation) {
    currentFeedbackConversation = conversation;
    
    // Get the other user's name
    var currentUser = getCurrentUserSync();
    var otherUserName = '';
    
    // Try to get from conversation data (otherUser can be a string or object)
    if (conversation.otherUser) {
        if (typeof conversation.otherUser === 'string') {
            otherUserName = conversation.otherUser;
        } else if (conversation.otherUser.name) {
            otherUserName = conversation.otherUser.name;
        }
    }
    
    // Fallback: determine from owner/requester
    if (!otherUserName) {
        var isOwner = conversation.isOwner;
        if (isOwner) {
            // Current user is owner, other user is requester
            if (conversation.requester) {
                otherUserName = typeof conversation.requester === 'string' 
                    ? conversation.requester 
                    : (conversation.requester.name || 'the other user');
            } else if (conversation.requesterName) {
                otherUserName = conversation.requesterName;
            }
        } else {
            // Current user is requester, other user is owner
            if (conversation.owner) {
                otherUserName = typeof conversation.owner === 'string' 
                    ? conversation.owner 
                    : (conversation.owner.name || 'the other user');
            } else if (conversation.ownerName) {
                otherUserName = conversation.ownerName;
            }
        }
    }
    
    // Final fallback
    if (!otherUserName) {
        otherUserName = 'the other user';
    }
    
    document.getElementById('feedbackUserName').textContent = otherUserName;
    
    // Reset form
    document.getElementById('feedbackForm').reset();
    selectedFeedbackType = null;
    selectedRating = 0;
    
    // Reset UI
    document.querySelectorAll('.feedback-type-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.star-rating').forEach(function(star) {
        star.classList.remove('active');
    });
    document.getElementById('feedbackType').value = '';
    document.getElementById('feedbackRatingValue').value = '';
    
    // Show modal
    document.getElementById('feedbackModal').classList.add('active');
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('active');
    currentFeedbackConversation = null;
    selectedFeedbackType = null;
    selectedRating = 0;
}

function selectFeedbackType(type) {
    selectedFeedbackType = type;
    document.getElementById('feedbackType').value = type;
    
    // Update UI
    document.querySelectorAll('.feedback-type-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelector('.feedback-type-btn[data-type="' + type + '"]').classList.add('active');
}

function selectRating(rating) {
    selectedRating = rating;
    document.getElementById('feedbackRatingValue').value = rating;
    
    // Update UI
    document.querySelectorAll('.star-rating').forEach(function(star, index) {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function skipFeedback() {
    closeFeedbackModal();
    showToast('Feedback skipped. You can leave feedback later from your conversation history.');
}

async function submitFeedback(event) {
    event.preventDefault();
    
    if (!currentFeedbackConversation) {
        showToast('Error: No conversation selected');
        return;
    }
    
    var feedbackType = selectedFeedbackType;
    var rating = selectedRating;
    var feedbackText = document.getElementById('feedbackText').value.trim();
    var wouldRecommend = document.getElementById('feedbackWouldRecommend').checked;
    
    if (!feedbackType) {
        showToast('Please select an experience type');
        return;
    }
    
    if (!rating || rating < 1 || rating > 5) {
        showToast('Please select a rating (1-5 stars)');
        return;
    }
    
    try {
        const response = await feedbackAPI.submit(
            currentFeedbackConversation.id,
            feedbackType,
            rating,
            feedbackText,
            wouldRecommend
        );
        
        if (response.success) {
            showToast('Thank you for your feedback!');
            closeFeedbackModal();
        } else {
            throw new Error(response.message || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        if (error.message && error.message.includes('already submitted')) {
            showToast('You have already submitted feedback for this exchange.');
            closeFeedbackModal();
        } else {
            handleAPIError(error);
        }
    }
}

// Close feedback modal when clicking outside
if (document.getElementById('feedbackModal')) {
    document.getElementById('feedbackModal').addEventListener('click', function(e) {
        if (e.target.id === 'feedbackModal') {
            closeFeedbackModal();
        }
    });
}

