// ==========================================
// PROFILE REVIEWS MODULE
// Handles review modal (leave a review after exchange)
// ==========================================

import { getCurrentUserSync, showToast } from './profile-utils.js';
import { loadMessages } from './profile-messages.js';
import { loadHistory } from './profile-history.js';

var selectedRating = 0;
var reviewedUserId = null;
var reviewConversationId = null;

export function openReviewModal() {
    if (!window.currentConversation) return;

    var currentUser = getCurrentUserSync();
    var isOwner = window.currentConversation.isOwner || (window.currentConversation.owner === currentUser.name);

    if (isOwner) {
        showToast(t('cannotReviewSelf'));
        return;
    }

    reviewedUserId = window.currentConversation.ownerId || null;
    reviewConversationId = window.currentConversation.dbId ||
        (typeof window.currentConversation.id === 'number' ? window.currentConversation.id : null) ||
        null;

    if (!reviewedUserId) {
        showToast(t('errorDetermineUser'));
        return;
    }
    if (!reviewConversationId) {
        showToast(t('errorDetermineConversation'));
        return;
    }

    closeConversation();

    setTimeout(function() {
        selectedRating = 0;
        var reviewTextEl = document.getElementById('reviewText');
        if (reviewTextEl) {
            reviewTextEl.value = '';
        }
        updateStarDisplay();

        var modal = document.getElementById('reviewModal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            modal.addEventListener('wheel', function(e) {
                if (e.target === modal) e.preventDefault();
            });
            modal.addEventListener('touchmove', function(e) {
                if (e.target === modal) e.preventDefault();
            });
        }
    }, 100);
}

export function closeReviewModal() {
    var modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
    selectedRating = 0;
    reviewedUserId = null;
    reviewConversationId = null;
}

function updateStarDisplay() {
    var stars = document.querySelectorAll('#starRating .star');
    var ratingText = document.getElementById('ratingText');

    stars.forEach(function(star) {
        var rating = parseInt(star.getAttribute('data-rating'));
        if (rating <= selectedRating) {
            star.classList.add('active');
            star.classList.remove('empty');
        } else {
            star.classList.remove('active');
            star.classList.add('empty');
        }
    });

    var ratingMessages = {
        0: t('selectRating'),
        1: t('ratingPoor'),
        2: t('ratingFair'),
        3: t('ratingGood'),
        4: t('ratingVeryGood'),
        5: t('ratingExcellent')
    };

    if (ratingText) {
        ratingText.textContent = ratingMessages[selectedRating] || t('selectRating');
    }
}

export function initStarRating() {
    var stars = document.querySelectorAll('#starRating .star');
    stars.forEach(function(star) {
        star.addEventListener('click', function() {
            selectedRating = parseInt(star.getAttribute('data-rating'));
            updateStarDisplay();
        });
        star.addEventListener('mouseenter', function() {
            var hoverRating = parseInt(star.getAttribute('data-rating'));
            var tempStars = document.querySelectorAll('#starRating .star');
            tempStars.forEach(function(s) {
                var sRating = parseInt(s.getAttribute('data-rating'));
                s.style.opacity = sRating <= hoverRating ? '1' : '0.5';
            });
        });
    });

    var starContainer = document.getElementById('starRating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', function() {
            updateStarDisplay();
        });
    }
}

export async function submitReview() {
    if (!reviewedUserId || !reviewConversationId) {
        showToast(t('errorUserInfoMissing'));
        return;
    }

    if (selectedRating === 0) {
        showToast(t('pleaseSelectRating'));
        return;
    }

    var reviewTextEl = document.getElementById('reviewText');
    var reviewText = reviewTextEl ? reviewTextEl.value.trim() : '';

    try {
        const response = await reviewsAPI.create(reviewedUserId, reviewConversationId, selectedRating, reviewText);

        if (response.success) {
            showToast(t('reviewSubmittedSuccess'));
            closeReviewModal();
            await loadMessages();
            var historyTab = document.querySelector('.tab[onclick*="history"]');
            if (historyTab && historyTab.classList.contains('active')) {
                await loadHistory();
            }
        } else {
            var errorMessage = response.message || 'Failed to submit review';
            if (errorMessage.includes('already reviewed')) {
                showToast(t('alreadyReviewed'));
                closeReviewModal();
            } else {
                showToast(errorMessage);
            }
        }
    } catch (error) {
        var errorMsg = error.message || 'Error submitting review. Please try again.';
        if (errorMsg.includes('conversation_id') || errorMsg.includes('Unknown column')) {
            errorMsg = 'Database migration required. Please run the migration script to add conversation_id column.';
        }
        showToast(errorMsg);
    }
}
