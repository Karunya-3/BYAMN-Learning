// Review System for BYAMN Platform with localStorage support

// Sample fake reviews data for demonstration
const fakeReviews = [
  {"id":1,"username":"devAlice","rating":5,"title":"Excellent starter repo","body":"Great structure and clear README — perfect for learning. The examples run out-of-the-box.","date":"2025-10-12","verified":false,"mock":true},
  {"id":2,"username":"codeJay","rating":4,"title":"Very helpful","body":"Good explanations and helpful comments. Would like a small guide for Windows setup.","date":"2025-09-03","verified":false,"mock":true},
  {"id":3,"username":"sam_tests","rating":5,"title":"Perfect for tutorials","body":"Used this in a workshop — students picked it up fast. Clean folder layout.","date":"2025-08-21","verified":false,"mock":true},
  {"id":4,"username":"uxMaya","rating":4,"title":"Nice UI examples","body":"The UI components are well organized. A couple of accessibility tweaks needed.","date":"2025-07-30","verified":false,"mock":true},
  {"id":5,"username":"benchRick","rating":3,"title":"Useful but missing docs","body":"Useful code but some functions lack comments. Docs would help onboard new contributors.","date":"2025-06-19","verified":false,"mock":true},
  {"id":6,"username":"linuxNerd","rating":5,"title":"Runs great on Linux","body":"I tested on Ubuntu and everything works. Nice use of cross-platform libs.","date":"2025-05-10","verified":false,"mock":true},
  {"id":7,"username":"newbie123","rating":4,"title":"Good for beginners","body":"Friendly for beginners — would appreciate video walkthroughs in the README.","date":"2025-04-02","verified":false,"mock":true},
  {"id":8,"username":"qaBot","rating":2,"title":"Tests are flaky","body":"Some unit tests fail intermittently. Needs CI improvements.","date":"2025-03-15","verified":false,"mock":true},
  {"id":9,"username":"scriptSam","rating":5,"title":"Solid scripts","body":"Automation scripts saved me a lot of time — documented and easy to modify.","date":"2025-02-28","verified":false,"mock":true},
  {"id":10,"username":"eduLena","rating":5,"title":"Great learning resource","body":"Ideal for classroom use — clear examples and exercises.","date":"2025-01-12","verified":false,"mock":true},
  {"id":11,"username":"perfPete","rating":3,"title":"Could be faster","body":"Some modules are slower than expected. Profiling suggestions included in PR.","date":"2024-12-05","verified":false,"mock":true},
  {"id":12,"username":"styleGuru","rating":4,"title":"Code style mostly consistent","body":"Mostly consistent style; a linter config would help contributors.","date":"2024-11-19","verified":false,"mock":true},
  {"id":13,"username":"archGina","rating":5,"title":"Well-architected","body":"Modular and extensible design — easy to plug in new features.","date":"2024-10-07","verified":false,"mock":true},
  {"id":14,"username":"docDave","rating":3,"title":"Docs need expansion","body":"Basic README is good but advanced topics are missing. Add an examples folder.","date":"2024-09-02","verified":false,"mock":true},
  {"id":15,"username":"mobileMoe","rating":4,"title":"Mobile-friendly components","body":"Good starting point for mobile UIs, though some styles need tweaking for small screens.","date":"2024-08-11","verified":false,"mock":true},
  {"id":16,"username":"cliKate","rating":5,"title":"Excellent CLI tools","body":"CLI helpers are convenient and well-documented. Saved me time in setup.","date":"2024-07-01","verified":false,"mock":true},
  {"id":17,"username":"securitySam","rating":2,"title":"Security review needed","body":"No obvious vulnerabilities but missing security notes. Recommend dependency audit.","date":"2024-06-18","verified":false,"mock":true},
  {"id":18,"username":"integrationIra","rating":4,"title":"Easy integration","body":"Integrating with my project was straightforward. Packaging could be improved.","date":"2024-05-05","verified":false,"mock":true},
  {"id":19,"username":"testerTony","rating":3,"title":"Functional but rough edges","body":"Functional features but some error handling is incomplete. Minor bugs reported.","date":"2024-04-09","verified":false,"mock":true},
  {"id":20,"username":"uiUma","rating":5,"title":"Beautiful examples","body":"Visual examples are polished and helpful when building components.","date":"2024-03-21","verified":false,"mock":true}
];

// Function to submit a review for a course
function submitReview(courseId, rating, title, comment) {
    // Get current user from localStorage or use default
    const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
    
    // Store in localStorage
    const reviews = JSON.parse(localStorage.getItem('reviews')) || {};
    reviews[courseId] = reviews[courseId] || [];
    
    // Generate unique ID
    const reviewId = `${courseId}-${Date.now()}`;
    
    reviews[courseId].push({
        id: reviewId,
        username: currentUser,
        rating: rating,
        title: title || `Review from ${currentUser}`,
        body: comment,
        date: new Date().toISOString().split('T')[0],
        verified: false,
        mock: false
    });
    
    localStorage.setItem('reviews', JSON.stringify(reviews));
    
    // Show success message
    showNotification('Review submitted successfully!', 'success');
    
    // Update the reviews display for this course
    updateCourseReviews(courseId);
    
    return true;
}

// Function to get reviews for a specific course
function getCourseReviews(courseId) {
    const reviews = JSON.parse(localStorage.getItem('reviews')) || {};
    let courseReviews = reviews[courseId] || [];
    
    // If no reviews in localStorage, use fake reviews for demonstration
    if (courseReviews.length === 0) {
        courseReviews = getMockReviewsForCourse(courseId);
    }
    
    return courseReviews;
}

// Function to generate mock reviews for courses that don't have any yet
function getMockReviewsForCourse(courseId) {
    // Use the fakeReviews array, but limit to 3-5 reviews per course
    const courseSpecificReviews = fakeReviews.map((review, index) => ({
        ...review,
        id: `${courseId}-mock-${index}`,
        courseId: courseId,
        mock: true
    }));
    
    return courseSpecificReviews.slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 reviews
}

// Function to calculate average rating for a course
function getAverageRating(courseId) {
    const reviews = getCourseReviews(courseId);
    if (reviews.length === 0) return 0;
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
}

// Function to generate star rating HTML
function generateStarRating(rating, size = 'w-5 h-5', interactive = false, ratingId = '') {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        const starClass = i <= rating ? 'text-amber-400 fill-current' : 'text-gray-300 fill-current';
        const hoverClass = interactive ? 'hover:text-amber-500 hover:scale-110 transition-transform duration-200 cursor-pointer' : '';
        stars += `
            <svg 
                class="${size} ${starClass} ${hoverClass}" 
                viewBox="0 0 20 20"
                ${interactive ? `data-rating="${i}" onclick="setRating(${i}, '${ratingId}')"` : ''}
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>`;
    }
    return stars;
}

// Function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Function to render review form
function renderReviewForm(courseId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const formHTML = `
        <div class="bg-white rounded-xl shadow-md p-6 mt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                <div id="rating-stars-${courseId}" class="flex space-x-1">
                    ${generateStarRating(0, 'w-8 h-8', true, `rating-${courseId}`)}
                </div>
                <div id="rating-text-${courseId}" class="mt-2 text-sm text-gray-500">Click to rate</div>
            </div>
            <div class="mb-4">
                <label for="review-title-${courseId}" class="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
                <input 
                    type="text" 
                    id="review-title-${courseId}" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    placeholder="Brief summary of your review"
                >
            </div>
            <div class="mb-4">
                <label for="review-comment-${courseId}" class="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea 
                    id="review-comment-${courseId}" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    rows="4" 
                    placeholder="Share your experience with this course..."
                ></textarea>
            </div>
            <button 
                onclick="handleReviewSubmit('${courseId}')" 
                class="btn btn-primary"
            >
                Submit Review
            </button>
        </div>
    `;

    container.innerHTML = formHTML;
}

// Function to set rating in the review form
function setRating(rating, ratingId) {
    const courseId = ratingId.split('-')[1];
    const starsContainer = document.getElementById(`rating-stars-${courseId}`);
    const ratingText = document.getElementById(`rating-text-${courseId}`);
    
    if (starsContainer) {
        starsContainer.innerHTML = generateStarRating(rating, 'w-8 h-8', true, ratingId);
        starsContainer.dataset.currentRating = rating;
    }
    
    if (ratingText) {
        const ratings = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        ratingText.textContent = ratings[rating - 1];
    }
}

// Function to handle review submission
function handleReviewSubmit(courseId) {
    const starsContainer = document.getElementById(`rating-stars-${courseId}`);
    const title = document.getElementById(`review-title-${courseId}`).value;
    const comment = document.getElementById(`review-comment-${courseId}`).value;
    
    const rating = parseInt(starsContainer?.dataset.currentRating || 0);
    
    if (rating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    if (!comment.trim()) {
        showNotification('Please write a review comment', 'error');
        return;
    }
    
    submitReview(courseId, rating, title.trim(), comment.trim());
    
    // Clear the form
    document.getElementById(`review-title-${courseId}`).value = '';
    document.getElementById(`review-comment-${courseId}`).value = '';
    const ratingText = document.getElementById(`rating-text-${courseId}`);
    if (ratingText) ratingText.textContent = 'Click to rate';
}

// Function to render reviews for a specific course
function renderCourseReviews(courseId, containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const reviews = getCourseReviews(courseId);
    const sortedReviews = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
    const limitedReviews = limit ? sortedReviews.slice(0, limit) : sortedReviews;
    
    if (limitedReviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">No reviews yet. Be the first to review this course!</p>
            </div>
        `;
        return;
    }

    let reviewsHTML = '';
    limitedReviews.forEach(review => {
        reviewsHTML += `
        <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300 mb-4">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <div class="flex items-center">
                        ${generateStarRating(review.rating, 'w-5 h-5')}
                    </div>
                    <span class="ml-2 text-sm font-medium text-gray-600">${review.rating}.0</span>
                </div>
                <div class="flex space-x-2">
                    ${review.verified ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verified</span>' : ''}
                    ${review.mock ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Sample</span>' : ''}
                </div>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${review.title || 'Review'}</h3>
            <p class="text-gray-600 mb-4">${review.body || review.comment}</p>
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span class="text-indigo-800 font-medium">${review.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${review.username}</p>
                        <p class="text-sm text-gray-500">${utils.formatDate(review.date)}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = reviewsHTML;
}

// Function to update reviews display after submission
function updateCourseReviews(courseId) {
    // Update the reviews container
    const reviewsContainer = document.getElementById(`reviews-container-${courseId}`);
    if (reviewsContainer) {
        renderCourseReviews(courseId, `reviews-container-${courseId}`);
    }
    
    // Update the rating summary if exists
    const summaryContainer = document.getElementById(`reviews-summary-${courseId}`);
    if (summaryContainer) {
        renderReviewSummary(getCourseReviews(courseId), `reviews-summary-${courseId}`);
    }
    
    // Update the rating in the course card
    updateCourseCardRating(courseId);
}

// Function to update course card rating display
function updateCourseCardRating(courseId) {
    const avgRating = getAverageRating(courseId);
    const reviews = getCourseReviews(courseId);
    const ratingElement = document.getElementById(`course-rating-${courseId}`);
    
    if (ratingElement) {
        ratingElement.innerHTML = `
            <div class="flex items-center">
                ${generateStarRating(Math.round(avgRating), 'w-4 h-4')}
                <span class="ml-1 text-sm font-medium text-gray-600">${avgRating}</span>
                <span class="ml-1 text-sm text-gray-400">(${reviews.length})</span>
            </div>
        `;
    }
}

// Function to render review summary
function renderReviewSummary(reviews, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const averageRating = calculateAverageRating(reviews);
    const totalReviews = reviews.length;

    // Count ratings distribution
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
        ratingCounts[review.rating]++;
    });

    const summaryHTML = `
    <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">User Reviews</h2>
            <button id="view-all-reviews" class="btn btn-primary">View All Reviews</button>
        </div>
        
        <div class="flex items-center mb-6">
            <div class="text-center mr-6">
                <div class="text-5xl font-bold text-gray-900">${averageRating}</div>
                <div class="flex items-center justify-center">
                    ${generateStarRating(Math.round(averageRating), 'w-6 h-6')}
                </div>
                <div class="text-gray-500 mt-1">Average Rating</div>
            </div>
            <div class="flex-1">
                ${[5, 4, 3, 2, 1].map(rating => `
                <div class="flex items-center mb-2">
                    <div class="w-10 text-sm font-medium text-gray-600">${rating} star</div>
                    <div class="flex-1 mx-2">
                        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-amber-400" style="width: ${totalReviews > 0 ? (ratingCounts[rating] / totalReviews * 100).toFixed(1) : 0}%"></div>
                        </div>
                    </div>
                    <div class="w-10 text-sm text-gray-600 text-right">${ratingCounts[rating]}</div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <div class="text-gray-600">
            Based on <span class="font-semibold">${totalReviews}</span> reviews
        </div>
    </div>
    `;

    container.innerHTML = summaryHTML;

    // Add event listener to view all reviews button
    const viewAllButton = document.getElementById('view-all-reviews');
    if (viewAllButton) {
        viewAllButton.addEventListener('click', function() {
            // Scroll to reviews section
            const reviewsSection = document.querySelector(`[data-course-id="${containerId.split('-')[2]}"]`);
            if (reviewsSection) {
                reviewsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Function to calculate average rating
function calculateAverageRating(reviews) {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
}

// Function to render all reviews (legacy support)
function renderReviews(reviews, containerId, limit = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Sort reviews by date (newest first)
    const sortedReviews = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Limit reviews if specified
    const limitedReviews = limit ? sortedReviews.slice(0, limit) : sortedReviews;

    let reviewsHTML = '';
    limitedReviews.forEach(review => {
        reviewsHTML += `
        <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <div class="flex items-center">
                        ${generateStarRating(review.rating, 'w-5 h-5')}
                    </div>
                    <span class="ml-2 text-sm font-medium text-gray-600">${review.rating}.0</span>
                </div>
                ${review.verified ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verified</span>' : ''}
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${review.title}</h3>
            <p class="text-gray-600 mb-4">${review.body}</p>
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span class="text-indigo-800 font-medium">${review.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${review.username}</p>
                        <p class="text-sm text-gray-500">${formatDate(review.date)}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = reviewsHTML;
}

// Function to show notification
function showNotification(message, type = 'success') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.review-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `review-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize review system
document.addEventListener('DOMContentLoaded', function() {
    // Initialize localStorage if not exists
    if (!localStorage.getItem('reviews')) {
        localStorage.setItem('reviews', JSON.stringify({}));
    }
    
    // Check for current user
    if (!localStorage.getItem('currentUser')) {
        // Set a default user for demonstration
        localStorage.setItem('currentUser', 'Guest' + Math.floor(Math.random() * 1000));
    }
    
    // Legacy support: Initialize if global reviews element exists
    const reviewsSummary = document.getElementById('reviews-summary');
    const recentReviews = document.getElementById('recent-reviews');
    
    if (reviewsSummary && recentReviews) {
        renderReviewSummary(fakeReviews, 'reviews-summary');
        renderReviews(fakeReviews, 'recent-reviews', 6);
    }
});

// Export functions for use in other modules
window.reviewsSystem = {
    fakeReviews,
    submitReview,
    getCourseReviews,
    getAverageRating,
    generateStarRating,
    formatDate,
    renderReviewForm,
    renderCourseReviews,
    setRating,
    handleReviewSubmit,
    renderReviews,
    calculateAverageRating,
    renderReviewSummary,
    showNotification,
    updateCourseReviews
};