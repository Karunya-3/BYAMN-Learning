// Courses page JavaScript for fetching and displaying course data from Firebase

// Store all courses for filtering
let allCourses = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentSort = 'newest'; // newest, oldest, enrollmentAsc, enrollmentDesc, ratingDesc, priceAsc, priceDesc
let categoryMap = {}; // Map to store category ID to name mappings
let difficultyFilter = 'all'; // all, beginner, intermediate, advanced
let durationFilter = 'all'; // all, short, medium, long
let instructorFilter = 'all'; // all, specific instructors
let bookmarkedCourses = new Set(); // Store bookmarked course IDs
let searchDebounceTimer;
let userCompletedCourses = new Set(); // Store user's completed course IDs

// Course Collections Integration
let userCollections = []; // Store user collections
let activeCollectionId = null; // Track active collection

// Intersection Observer for lazy loading images
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy-load');
            observer.unobserve(img);
        }
    });
});

// Load bookmarked courses from localStorage
function loadBookmarkedCourses() {
    try {
        const saved = localStorage.getItem('bookmarkedCourses');
        if (saved) {
            bookmarkedCourses = new Set(JSON.parse(saved));
        }
    } catch (error) {
        console.error('Error loading bookmarked courses:', error);
        bookmarkedCourses = new Set();
    }
}

// Save bookmarked courses to localStorage
function saveBookmarkedCourses() {
    try {
        localStorage.setItem('bookmarkedCourses', JSON.stringify([...bookmarkedCourses]));
    } catch (error) {
        console.error('Error saving bookmarked courses:', error);
    }
}

// Load user collections (add this function)
async function loadUserCollections() {
    if (window.collections && window.collections.loadUserCollections) {
        try {
            await window.collections.loadUserCollections();
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    }
}

// Add this function to handle adding to collections from course cards
function showAddToCollectionDropdown(courseId, buttonElement) {
    if (window.collections && window.collections.showAddToCollectionDropdown) {
        window.collections.showAddToCollectionDropdown(courseId, buttonElement);
    } else {
        // Fallback: show create collection modal
        if (window.collections && window.collections.showCreateCollectionModal) {
            window.collections.showCreateCollectionModal();
        }
    }
}

// Add to collection function (wrapper)
async function addCourseToCollectionWrapper(collectionId, courseId) {
    if (window.collections && window.collections.addCourseToCollection) {
        return await window.collections.addCourseToCollection(collectionId, courseId);
    }
    return false;
}

// Toggle bookmark for a course
function toggleBookmark(courseId) {
    const user = firebaseServices.auth.currentUser;
    const userId = user ? user.uid : 'anonymous';
    
    if (bookmarkedCourses.has(courseId)) {
        // Remove bookmark
        bookmarkedCourses.delete(courseId);
        if (user) {
            // Remove from Firebase if user is logged in
            firebaseServices.removeBookmark(userId, courseId).catch(error => {
                console.error('Error removing bookmark from Firebase:', error);
            });
        }
    } else {
        // Add bookmark
        bookmarkedCourses.add(courseId);
        if (user) {
            // Save to Firebase if user is logged in
            firebaseServices.saveBookmark(userId, courseId, new Date().toISOString()).catch(error => {
                console.error('Error saving bookmark to Firebase:', error);
            });
        }
    }
    
    saveBookmarkedCourses();
    updateBookmarkUI(courseId);
    
    // Show notification
    const action = bookmarkedCourses.has(courseId) ? 'saved to' : 'removed from';
    utils.showNotification(`Course ${action} bookmarks`, 'success');
}

// Update bookmark button UI
function updateBookmarkUI(courseId) {
    const bookmarkBtn = document.querySelector(`.bookmark-btn[data-course-id="${courseId}"]`);
    if (bookmarkBtn) {
        const isBookmarked = bookmarkedCourses.has(courseId);
        const icon = bookmarkBtn.querySelector('.bookmark-icon');
        
        if (isBookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.classList.remove('not-bookmarked');
            if (icon) {
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />';
            }
        } else {
            bookmarkBtn.classList.add('not-bookmarked');
            bookmarkBtn.classList.remove('bookmarked');
            if (icon) {
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />';
            }
        }
    }
    
    // Also update text buttons
    const bookmarkTextBtn = document.querySelector(`.bookmark-btn-text[data-course-id="${courseId}"]`);
    if (bookmarkTextBtn) {
        const isBookmarked = bookmarkedCourses.has(courseId);
        const icon = bookmarkTextBtn.querySelector('.bookmark-icon');
        const text = bookmarkTextBtn.querySelector('.bookmark-text');
        
        if (isBookmarked) {
            bookmarkTextBtn.classList.add('bookmarked');
            bookmarkTextBtn.classList.remove('not-bookmarked');
            if (text) {
                text.textContent = 'Saved';
            }
        } else {
            bookmarkTextBtn.classList.add('not-bookmarked');
            bookmarkTextBtn.classList.remove('bookmarked');
            if (text) {
                text.textContent = 'Save';
            }
        }
    }
}

// Load user bookmarks from Firebase (for logged-in users)
async function loadUserBookmarks(userId) {
    try {
        const bookmarks = await firebaseServices.getUserBookmarks(userId);
        bookmarks.forEach(bookmark => {
            bookmarkedCourses.add(bookmark.courseId);
        });
        saveBookmarkedCourses();
    } catch (error) {
        console.error('Error loading user bookmarks:', error);
    }
}

// Load user completed courses
async function loadUserCompletedCourses(userId) {
    try {
        if (!userId) return;
        
        // Get user enrollments
        const enrollments = await firebaseServices.getUserEnrollments(userId);
        
        // Get user analytics for completed courses
        const analytics = await firebaseServices.getUserAnalytics(userId);
        
        if (analytics && analytics.completedCourses) {
            Object.keys(analytics.completedCourses).forEach(courseId => {
                userCompletedCourses.add(courseId);
            });
        }
        
        // Also check enrollments for completed courses
        enrollments.forEach(enrollment => {
            if (enrollment.progress === 100) {
                userCompletedCourses.add(enrollment.courseId);
            }
        });
        
    } catch (error) {
        console.error('Error loading user completed courses:', error);
    }
}

// Get prerequisites for a course
async function getCoursePrerequisites(courseId) {
    try {
        const courseRef = ref(firebaseServices.rtdb, `courses/${courseId}/prerequisites`);
        const snapshot = await get(courseRef);
        
        if (snapshot.exists()) {
            const prerequisites = snapshot.val();
            
            // If prerequisites is an array, return it
            if (Array.isArray(prerequisites)) {
                return prerequisites;
            }
            
            // If prerequisites is an object, convert to array
            if (typeof prerequisites === 'object') {
                return Object.keys(prerequisites);
            }
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching prerequisites:', error);
        return [];
    }
}

// Get prerequisite course details
async function getPrerequisiteDetails(prerequisiteIds) {
    try {
        const courseDetails = [];
        
        for (const courseId of prerequisiteIds) {
            const courseRef = ref(firebaseServices.rtdb, `courses/${courseId}`);
            const snapshot = await get(courseRef);
            
            if (snapshot.exists()) {
                const courseData = snapshot.val();
                courseDetails.push({
                    id: courseId,
                    title: courseData.title || 'Unknown Course',
                    completed: userCompletedCourses.has(courseId)
                });
            } else {
                courseDetails.push({
                    id: courseId,
                    title: 'Course Not Found',
                    completed: false
                });
            }
        }
        
        return courseDetails;
    } catch (error) {
        console.error('Error fetching prerequisite details:', error);
        return prerequisiteIds.map(id => ({
            id: id,
            title: 'Loading...',
            completed: false
        }));
    }
}

// Render prerequisites section
function renderPrerequisitesSection(prerequisites, isUserLoggedIn) {
    if (!prerequisites || prerequisites.length === 0) {
        return `
            <div class="prerequisites-section">
                <div class="prerequisites-title">
                    <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Prerequisites
                </div>
                <div class="no-prerequisites">No prerequisites required</div>
            </div>
        `;
    }
    
    let prerequisitesHTML = `
        <div class="prerequisites-section">
            <div class="prerequisites-title">
                <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Required Courses
            </div>
            <div class="prerequisites-list">
    `;
    
    prerequisites.forEach(prereq => {
        const statusClass = isUserLoggedIn ? (prereq.completed ? 'completed' : 'missing') : '';
        const statusIcon = prereq.completed ? '✓' : '⏱️';
        
        prerequisitesHTML += `
            <span class="prerequisite-item ${statusClass}" title="${prereq.title}">
                ${isUserLoggedIn ? statusIcon + ' ' : ''}${prereq.title}
            </span>
        `;
    });
    
    prerequisitesHTML += `
            </div>
        </div>
    `;
    
    return prerequisitesHTML;
}

// Create review section for course card
function createReviewSection(course) {
    const avgRating = window.reviewSystem ? window.reviewSystem.getAverageRating(course.id) : 0;
    const reviewCount = window.reviewSystem ? window.reviewSystem.getCourseReviews(course.id).length : 0;
    
    return `
        <!-- Reviews Section -->
        <div class="mt-4 pt-4 border-t border-gray-100">
            <!-- Rating Display -->
            <div class="flex items-center justify-between mb-3">
                <div id="course-rating-${course.id}" class="flex items-center">
                    ${window.reviewSystem ? window.reviewSystem.generateStarRating(Math.round(avgRating), 'w-4 h-4') : ''}
                    <span class="ml-1 text-sm font-medium text-gray-600">${avgRating.toFixed(1)}</span>
                    <span class="ml-1 text-sm text-gray-400">(${reviewCount})</span>
                </div>
                <button 
                    onclick="toggleReviewModal('${course.id}')" 
                    class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Write a Review
                </button>
            </div>
            
            <!-- Recent Reviews Preview -->
            <div id="reviews-container-${course.id}" class="space-y-3">
                <!-- Reviews will be loaded here -->
            </div>
        </div>
    `;
}

// Toggle review modal
function toggleReviewModal(courseId) {
    const user = firebaseServices.auth.currentUser;
    if (!user) {
        utils.showNotification('Please sign in to write a review', 'error');
        return;
    }
    
    // Check if user is enrolled in the course
    firebaseServices.getUserEnrollments(user.uid)
        .then(enrollments => {
            const isEnrolled = enrollments.some(enrollment => enrollment.courseId === courseId);
            if (!isEnrolled) {
                utils.showNotification('You need to enroll in this course before writing a review', 'error');
                return;
            }
            
            // Show review modal
            if (window.reviewSystem) {
                window.reviewSystem.showReviewModal(courseId);
            }
        })
        .catch(error => {
            console.error('Error checking enrollment:', error);
            utils.showNotification('Error checking enrollment status', 'error');
        });
}

// Load reviews for a course
async function loadCourseReviews(courseId) {
    if (!window.reviewSystem) return;
    
    try {
        const reviews = window.reviewSystem.getCourseReviews(courseId);
        const recentReviews = reviews.slice(0, 2); // Show only 2 recent reviews
        
        const container = document.getElementById(`reviews-container-${courseId}`);
        if (!container) return;
        
        if (recentReviews.length === 0) {
            container.innerHTML = `
                <p class="text-sm text-gray-500 italic">No reviews yet. Be the first to review this course!</p>
            `;
            return;
        }
        
        let reviewsHTML = '';
        recentReviews.forEach(review => {
            const user = review.user || 'Anonymous';
            const date = review.timestamp ? new Date(review.timestamp).toLocaleDateString() : 'Recently';
            
            reviewsHTML += `
                <div class="bg-gray-50 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center">
                            <div class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                                <span class="text-xs font-medium text-indigo-600">${user.charAt(0)}</span>
                            </div>
                            <span class="text-sm font-medium text-gray-700">${user}</span>
                        </div>
                        <span class="text-xs text-gray-500">${date}</span>
                    </div>
                    <div class="flex items-center mb-1">
                        ${window.reviewSystem.generateStarRating(review.rating, 'w-3 h-3')}
                    </div>
                    <p class="text-sm text-gray-600 line-clamp-2">${review.comment || 'No comment provided.'}</p>
                </div>
            `;
        });
        
        if (reviews.length > 2) {
            reviewsHTML += `
                <button 
                    onclick="showAllReviews('${courseId}')" 
                    class="text-sm text-indigo-600 hover:text-indigo-800 font-medium w-full text-center"
                >
                    View all ${reviews.length} reviews
                </button>
            `;
        }
        
        container.innerHTML = reviewsHTML;
        
        // Update average rating display
        const avgRating = window.reviewSystem.getAverageRating(courseId);
        const ratingContainer = document.getElementById(`course-rating-${courseId}`);
        if (ratingContainer) {
            const ratingSpan = ratingContainer.querySelector('span:nth-child(2)');
            if (ratingSpan) {
                ratingSpan.textContent = avgRating.toFixed(1);
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Show all reviews for a course
function showAllReviews(courseId) {
    if (window.reviewSystem) {
        window.reviewSystem.showAllReviews(courseId);
    }
}

// Add helper function for date normalization (similar to the one in firebase.js)
function getNormalizedDate(dateValue) {
    if (!dateValue) return new Date(0); // Default to epoch if no date

    // Handle Firebase Timestamp objects
    if (dateValue._seconds !== undefined) {
        return new Date(dateValue._seconds * 1000);
    }

    // Handle Unix timestamps (numbers)
    if (typeof dateValue === 'number') {
        // Check if it's in seconds or milliseconds
        if (dateValue > 10000000000) {
            // Milliseconds
            return new Date(dateValue);
        } else {
            // Seconds
            return new Date(dateValue * 1000);
        }
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
        // Try to parse the string date
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }

    // Handle Date objects
    if (dateValue instanceof Date) {
        return dateValue;
    }

    // Fallback
    return new Date(0);
}

// Utility function to get course duration category
function getDurationCategory(duration) {
    if (!duration) return 'short';
    
    // Convert duration to minutes if it's in HH:MM format
    if (typeof duration === 'string' && duration.includes(':')) {
        const parts = duration.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes <= 30) return 'short';
        if (totalMinutes <= 90) return 'medium';
        return 'long';
    }
    
    // If duration is in minutes
    if (typeof duration === 'number') {
        if (duration <= 30) return 'short';
        if (duration <= 90) return 'medium';
        return 'long';
    }
    
    return 'short';
}

// Format duration from seconds to readable format
function formatDuration(seconds) {
    if (!seconds) return '0m 0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Utility function to filter courses
function filterCourses(courses, searchTerm, category, difficulty, duration) {
    return courses.filter(course => {
        // Search term filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const titleMatch = course.title && course.title.toLowerCase().includes(searchLower);
            const descriptionMatch = course.description && course.description.toLowerCase().includes(searchLower);
            const categoryMatch = categoryMap[course.category] && categoryMap[course.category].toLowerCase().includes(searchLower);
            
            if (!titleMatch && !descriptionMatch && !categoryMatch) {
                return false;
            }
        }
        
        // Category filter
        if (category !== 'all' && categoryMap[course.category] !== category) {
            return false;
        }
        
        // Difficulty filter
        if (difficulty !== 'all' && course.difficulty !== difficulty) {
            return false;
        }
        
        // Duration filter
        if (duration !== 'all') {
            const courseDuration = getDurationCategory(course.duration);
            if (courseDuration !== duration) {
                return false;
            }
        }
        
        return true;
    });
}

// Utility function to sort courses
function sortCourses(courses, sortOption) {
    const sortedCourses = [...courses];
    
    switch (sortOption) {
        case 'newest':
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateB - dateA;
            });
            break;
        case 'oldest':
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateA - dateB;
            });
            break;
        case 'titleAsc':
            sortedCourses.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            break;
        case 'titleDesc':
            sortedCourses.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            });
            break;
        case 'enrollmentAsc':
            sortedCourses.sort((a, b) => (a.enrollmentCount || 0) - (b.enrollmentCount || 0));
            break;
        case 'enrollmentDesc':
            sortedCourses.sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0));
            break;
        case 'ratingDesc':
            sortedCourses.sort((a, b) => {
                const ratingA = window.reviewSystem ? window.reviewSystem.getAverageRating(a.id) : 0;
                const ratingB = window.reviewSystem ? window.reviewSystem.getAverageRating(b.id) : 0;
                return ratingB - ratingA;
            });
            break;
        default:
            // Default to newest
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateB - dateA;
            });
    }
    
    return sortedCourses;
}

// Enroll in course function
function enrollInCourse(courseId) {
    const user = firebaseServices.auth.currentUser;
    if (!user) {
        utils.showNotification('Please sign in to enroll in courses', 'error');
        return;
    }

    firebaseServices.enrollUserInCourse(user.uid, courseId)
        .then(() => {
            utils.showNotification('Successfully enrolled in course!', 'success');
            // Redirect to course player or update UI
            setTimeout(() => {
                window.location.href = `player.html?courseId=${courseId}`;
            }, 1000);
        })
        .catch(error => {
            console.error('Error enrolling in course:', error);
            utils.showNotification('Error enrolling in course: ' + error.message, 'error');
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const coursesContainer = document.getElementById('courses-container');
    const categoryFilterContainer = document.getElementById('category-filters');
    const searchInput = document.getElementById('course-search');
    const sortSelect = document.getElementById('sort-options');
    const difficultyFilterSelect = document.getElementById('difficulty-filter');
    const durationFilterSelect = document.getElementById('duration-filter');

    const clearFiltersBtn = document.getElementById('reset-filters');
    const resultsCount = document.getElementById('results-count');

    const clearSearchBtn = document.getElementById('clear-search');
    const searchSuggestions = document.getElementById('search-suggestions');
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendationsContainer = document.getElementById('recommendations-container');

    // Load bookmarked courses
    loadBookmarkedCourses();
    
    // Load collections
    loadUserCollections();

    // Wait a bit for Firebase to initialize, then load courses and categories
    setTimeout(loadCategoriesAndCourses, 1000);

    // Add search event listener with enhanced functionality
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchDebounceTimer);
            currentSearchTerm = e.target.value.toLowerCase();
            
            // Show clear button when there's text
            if (clearSearchBtn) {
                clearSearchBtn.style.display = currentSearchTerm ? 'block' : 'none';
            }
            
            // Debounce search to improve performance
            searchDebounceTimer = setTimeout(() => {
                if (currentSearchTerm.length > 1) {
                    // Show search suggestions
                    showSearchSuggestions(currentSearchTerm);
                } else if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                    searchSuggestions.style.display = 'none';
                }
                applyFilters();
            }, 300);
        });
        
        // Handle search submission
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
                if (searchSuggestions) {
                    searchSuggestions.style.display = 'none';
                }
            }
        });
    }
    
    // Clear search functionality
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                currentSearchTerm = '';
                clearSearchBtn.style.display = 'none';
                if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                    searchSuggestions.style.display = 'none';
                }
                applyFilters();
            }
        });
    }

    // Add sort event listener
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    // Add difficulty filter event listener
    if (difficultyFilterSelect) {
        difficultyFilterSelect.addEventListener('change', function(e) {
            difficultyFilter = e.target.value;
            applyFilters();
        });
    }

    // Add duration filter event listener
    if (durationFilterSelect) {
        durationFilterSelect.addEventListener('change', function(e) {
            durationFilter = e.target.value;
            applyFilters();
        });
    }





    // Add clear filters event listener
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset all filters
            currentSearchTerm = '';
            currentFilter = 'all';
            difficultyFilter = 'all';
            durationFilter = 'all';
            instructorFilter = 'all';
            currentSort = 'newest';
            
            // Reset UI elements
            if (searchInput) searchInput.value = '';
            if (sortSelect) sortSelect.value = 'newest';
            if (difficultyFilterSelect) difficultyFilterSelect.value = 'all';
            if (durationFilterSelect) durationFilterSelect.value = 'all';
            
            // Update active button styling
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.getAttribute('data-category') === 'all') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            applyFilters();
        });
    }

    // Apply bookmarks filter
    function applyBookmarksFilter() {
        const filteredCourses = allCourses.filter(course => 
            bookmarkedCourses.has(course.id)
        );
        
        const sortedCourses = sortCourses(filteredCourses, currentSort);
        renderCourses(sortedCourses);
        
        if (resultsCount) {
            resultsCount.textContent = `${filteredCourses.length} bookmarked course${filteredCourses.length !== 1 ? 's' : ''} found`;
        }
    }

    // Apply all filters
    function applyFilters() {
        // Check if bookmarks filter is active
        const isBookmarksFilterActive = false;
        
        if (isBookmarksFilterActive) {
            applyBookmarksFilter();
            return;
        }
        
        // Filter courses
        let filteredCourses = filterCourses(
            allCourses, 
            currentSearchTerm, 
            currentFilter, 
            difficultyFilter, 
            durationFilter
        );
        
        // Sort courses
        filteredCourses = sortCourses(filteredCourses, currentSort);
        
        // Render courses
        renderCourses(filteredCourses);
        
        // Update results count
        if (resultsCount) {
            resultsCount.textContent = `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`;
        }
    }

    // Show search suggestions
    function showSearchSuggestions(searchTerm) {
        if (!searchSuggestions) return;
        
        const suggestions = allCourses
            .filter(course => {
                const titleMatch = course.title && course.title.toLowerCase().includes(searchTerm);
                const categoryMatch = categoryMap[course.category] && categoryMap[course.category].toLowerCase().includes(searchTerm);
                return titleMatch || categoryMatch;
            })
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            let suggestionsHTML = '';
            suggestions.forEach(course => {
                const categoryName = categoryMap[course.category] || course.category;
                suggestionsHTML += `
                    <div class="search-suggestion-item" data-course-id="${course.id}">
                        <div class="font-medium">${course.title}</div>
                        <div class="text-sm text-gray-500">${categoryName}</div>
                    </div>
                `;
            });
            
            searchSuggestions.innerHTML = suggestionsHTML;
            searchSuggestions.style.display = 'block';
            
            // Add event listeners to suggestion items
            document.querySelectorAll('.search-suggestion-item').forEach(item => {
                item.addEventListener('click', function() {
                    const courseId = this.getAttribute('data-course-id');
                    window.location.href = `player.html?courseId=${courseId}`;
                });
            });
        } else {
            searchSuggestions.innerHTML = '';
            searchSuggestions.style.display = 'none';
        }
    }

    // Load categories and courses from Firebase
    async function loadCategoriesAndCourses() {
        try {
            console.log('Starting to load categories and courses...');
            
            // Show loading state
            if (coursesContainer) {
                coursesContainer.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <div class="loading-spinner mx-auto"></div>
                        <p class="mt-8 text-gray-700 font-semibold text-lg">Loading courses...</p>
                        <p class="mt-3 text-gray-500">Please wait while we fetch our course catalog</p>
                    </div>
                `;
            }

            // Wait for Firebase services to be properly initialized
            console.log('Waiting for Firebase services to be ready...');
            let firebaseCheckAttempts = 0;
            const maxFirebaseCheckAttempts = 20; // Maximum attempts before giving up
            
            while ((!window.firebaseServices || !window.firebaseServices.rtdb || !window.firebaseServicesInitialized) && firebaseCheckAttempts < maxFirebaseCheckAttempts) {
                firebaseCheckAttempts++;
                console.log(`Firebase services not ready yet. Attempt ${firebaseCheckAttempts}/${maxFirebaseCheckAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
            }
            
            // Check if Firebase services are properly initialized
            if (!window.firebaseServices || !window.firebaseServices.rtdb) {
                throw new Error('Firebase services not properly initialized after waiting');
            }

            console.log('Firebase services available:', !!window.firebaseServices.rtdb);
            
            // Test Firebase connection
            try {
                console.log('Testing Firebase connection...');
                const connectionTest = await window.firebaseServices.testConnection();
                console.log('Firebase connection test result:', connectionTest);
                
                if (!connectionTest) {
                    console.warn('Firebase connection test failed');
                }
                
                // Validate database structure
                console.log('Validating database structure...');
                await window.firebaseServices.validateDatabaseStructure();
            } catch (connectionError) {
                console.error('Error during Firebase connection test:', connectionError);
            }
            
            // Fetch categories and courses from Firebase Realtime Database
            console.log('Fetching categories and courses from Firebase...');
            let categories, courses;
            
            try {
                const [categoriesSnapshot, coursesSnapshot] = await Promise.all([
                    firebaseServices.getCategories(),
                    firebaseServices.getCourses()
                ]);

                categories = categoriesSnapshot;
                courses = coursesSnapshot;
                
                console.log('Successfully fetched data from Firebase');
            } catch (fetchError) {
                console.error('Error fetching data from Firebase:', fetchError);
                
                // Show specific error based on the type of error
                if (fetchError.code === 'PERMISSION_DENIED') {
                    console.error('Firebase permission denied. Check security rules.');
                } else if (fetchError.code === 'NETWORK_ERROR') {
                    console.error('Network error. Check internet connection.');
                } else if (fetchError.message.includes('database')) {
                    console.error('Database connection error. Check database URL.');
                }
                
                throw fetchError;
            }

            console.log('Categories data from Firebase:', categories);
            console.log('Courses data from Firebase:', courses);
            
            // Handle case where no data is returned
            if (!categories) {
                console.warn('No categories data received from Firebase');
                categories = [];
            }
            
            if (!courses) {
                console.warn('No courses data received from Firebase');
                courses = [];
            }
            
            // Handle case where empty data is returned
            if (categories && !Array.isArray(categories)) {
                console.warn('Categories data is not an array, converting to array');
                categories = [];
            }
            
            if (courses && !Array.isArray(courses)) {
                console.warn('Courses data is not an array, converting to array');
                courses = [];
            }

            // Create category ID to name mapping
            categoryMap = {};
            if (categories && categories.length > 0) {
                categories.forEach(category => {
                    // Map both the ID and name for lookup
                    categoryMap[category.id] = category.name || category.id;
                });
            } else {
                console.warn('No categories found or empty categories array');
                // Provide default categories if none exist
                categories = [
                    { id: 'web-development', name: 'Web Development' },
                    { id: 'data-science', name: 'Data Science' },
                    { id: 'mobile-apps', name: 'Mobile Apps' },
                    { id: 'design', name: 'Design' }
                ];
                
                // Create mapping for default categories
                categories.forEach(category => {
                    categoryMap[category.id] = category.name;
                });
            }

            // Store all courses for filtering
            allCourses = courses || [];

            // Check if user is logged in to load their bookmarks and completed courses
            const user = firebaseServices.auth.currentUser;
            if (user) {
                await Promise.all([
                    loadUserBookmarks(user.uid),
                    loadUserCompletedCourses(user.uid)
                ]);
            }

            // Check if user is logged in to show personalized recommendations
            if (user) {
                // Load personalized recommendations
                loadRecommendations(user.uid, courses, categories);
            } else {
                // Hide recommendations section for non-logged in users
                if (recommendationsSection) {
                    recommendationsSection.style.display = 'none';
                }
            }

            // Render category filters
            renderCategoryFilters(categories);
            
            // Render instructor filters
            renderInstructorFilters(courses);
            
            // Render difficulty filters
            renderDifficultyFilters();

            // Handle case when no courses are available
            if ((!courses || courses.length === 0) && allCourses.length === 0) {
                console.warn('No courses available, showing empty state');
                // Provide sample courses if none exist in database
                courses = [
                    {
                        id: 'sample-1',
                        title: 'Getting Started with Online Learning',
                        description: 'Learn how to make the most of your online learning experience.',
                        category: 'web-development',
                        difficulty: 'Beginner',
                        duration: '2 hours',
                        rating: 4.5,
                        enrollmentCount: 0,
                        instructor: 'BYAMN Team',
                        thumbnail: 'https://placehold.co/400x200/6366f1/white?text=Getting+Started',
                        lessons: [
                            { id: 'lesson-1', title: 'Introduction to Online Learning', duration: 30 },
                            { id: 'lesson-2', title: 'Setting Up Your Learning Environment', duration: 45 }
                        ],
                        createdAt: new Date().toISOString()
                    }
                ];
                allCourses = courses;
            }
            
            // Render all courses by default
            renderCourses(courses || []);

            // Set the "All Courses" button as active
            const allCoursesButton = document.querySelector('.filter-btn[data-category="all"]');
            if (allCoursesButton) {
                allCoursesButton.classList.add('active');
            }
            

            
            // Update results count
            const courseCount = courses ? courses.length : 0;
            if (resultsCount) {
                resultsCount.textContent = `${courseCount} course${courseCount !== 1 ? 's' : ''} found`;
            }
            
            console.log('Finished loading categories and courses successfully');
        } catch (error) {
            console.error('Error loading categories and courses:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                name: error.name,
                stack: error.stack
            });
            
            // Show user-friendly error message
            let errorMessage = 'Error loading data: ' + error.message;
            
            // Provide more specific error messages based on error type
            if (error.code === 'PERMISSION_DENIED') {
                errorMessage = 'Access denied. Please check if you have permission to access the course data.';
            } else if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message.includes('database') || error.message.includes('Database')) {
                errorMessage = 'Database connection error. The course data may be temporarily unavailable.';
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorMessage = 'Request timeout. The server may be busy. Please try again later.';
            }
            
            utils.showNotification(errorMessage, 'error');

            // Show error state with option to load sample data
            if (coursesContainer) {
                coursesContainer.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 class="mt-6 text-2xl font-bold text-gray-900">Error Loading Data</h3>
                        <p class="mt-3 text-gray-600 max-w-md mx-auto">There was an error loading courses. Please try again later.</p>
                        <div class="mt-4 text-sm text-gray-500 mb-4">
                            <p>Error: ${errorMessage}</p>
                        </div>
                        <div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                            <button onclick="location.reload()" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300 shadow-md hover:shadow-lg">
                                Retry
                            </button>
                            <button onclick="loadSampleData()" class="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold transition duration-300 shadow-md hover:shadow-lg">
                                Load Sample Data
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Load personalized recommendations for logged-in users
    async function loadRecommendations(userId, courses, categories) {
        if (!recommendationsSection || !recommendationsContainer) return;

        try {
            // Show recommendations section
            recommendationsSection.style.display = 'block';

            // Fetch user data for recommendations
            const [enrollments, analytics, interactions] = await Promise.all([
                firebaseServices.getUserEnrollments(userId),
                firebaseServices.getUserAnalytics(userId),
                firebaseServices.getUserRecommendationInteractions(userId)
            ]);

            // Get personalized recommendations
            const recommendations = getPersonalizedRecommendations(
                enrollments, 
                courses, 
                analytics, 
                interactions
            );

            // Render recommendations
            renderRecommendations(recommendations, userId);
        } catch (error) {
            console.error('Error loading recommendations:', error);
            // Hide recommendations section on error
            recommendationsSection.style.display = 'none';
        }
    }

    // Get personalized course recommendations
    function getPersonalizedRecommendations(enrollments, courses, analytics, interactions) {
        if (!courses || courses.length === 0) return [];

        // Get user's favorite categories from analytics
        const favoriteCategories = analytics?.favoriteCategories || {};
        
        // Get completed and in-progress courses
        const completedCourseIds = enrollments
            .filter(e => e.progress === 100)
            .map(e => e.courseId) || [];
        
        const inProgressCourseIds = enrollments
            .filter(e => e.progress > 0 && e.progress < 100)
            .map(e => e.courseId) || [];
        
        // Get all enrolled course IDs
        const enrolledCourseIds = [...completedCourseIds, ...inProgressCourseIds];
        
        // Get user's previous recommendation interactions
        const clickedRecommendations = interactions
            .filter(i => i.action === 'click')
            .map(i => i.courseId) || [];
            
        const ignoredRecommendations = interactions
            .filter(i => i.action === 'view')
            .map(i => i.courseId) || [];

        // Score courses based on multiple factors
        const scoredCourses = courses.map(course => {
            let score = 0;
            const courseId = course.id;
            
            // Skip courses that are already enrolled in
            if (enrolledCourseIds.includes(courseId)) {
                return { ...course, score: -1 }; // Effectively exclude
            }
            
            // Boost score for courses in favorite categories
            if (course.category && favoriteCategories[course.category]) {
                score += favoriteCategories[course.category] * 15;
            }
            
            // Boost score for courses with good ratings
            const avgRating = window.reviewSystem ? window.reviewSystem.getAverageRating(courseId) : 0;
            if (avgRating >= 4.0) {
                score += avgRating * 3;
            }
            
            // Boost score for popular courses
            if (course.enrollmentCount && course.enrollmentCount > 50) {
                score += Math.log(course.enrollmentCount) * 2; // Logarithmic scaling
            }
            
            // Boost score for courses with completion-friendly durations
            if (course.lessons && Array.isArray(course.lessons)) {
                const totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
                // Prefer courses with moderate durations (1-6 hours)
                if (totalDuration > 3600 && totalDuration < 21600) {
                    score += 8;
                } else if (totalDuration > 0) {
                    // Still give some points for shorter courses
                    score += 3;
                }
            }
            
            // Boost score for courses with higher difficulty if user is progressing well
            if (analytics?.learningVelocity > 0 && course.difficulty) {
                const difficultyBoost = course.difficulty === 'Advanced' ? 12 : 
                                     course.difficulty === 'Intermediate' ? 8 : 4;
                score += difficultyBoost;
            }
            
            // Boost score for trending courses (recently popular)
            if (course.createdAt) {
                const createdDate = getNormalizedDate(course.createdAt);
                const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
                // Boost for courses created in the last 30 days
                if (daysSinceCreation < 30) {
                    score += Math.max(0, 10 - (daysSinceCreation / 3));
                }
            }
            
            // Penalize courses that user has seen but not clicked
            if (ignoredRecommendations.includes(courseId) && !clickedRecommendations.includes(courseId)) {
                score -= 5;
            }
            
            // Boost courses that are similar to recently completed courses
            if (completedCourseIds.length > 0) {
                const recentCompleted = completedCourseIds.slice(-3); // Last 3 completed
                const recentCourses = courses.filter(c => recentCompleted.includes(c.id));
                
                // Check for category similarity
                recentCourses.forEach(recentCourse => {
                    if (recentCourse.category === course.category) {
                        score += 7;
                    }
                });
            }
            
            return {
                ...course,
                score: Math.max(0, score) // Ensure non-negative score
            };
        });
        
        // Filter out courses with negative scores and sort by score
        return scoredCourses
            .filter(course => course.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6); // Return top 6 recommendations
    }

    // Render personalized recommendations
    function renderRecommendations(recommendations, userId) {
        if (!recommendationsContainer) return;

        if (!recommendations || recommendations.length === 0) {
            recommendationsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No personalized recommendations</h3>
                    <p class="mt-2 text-gray-500">Complete some courses to get personalized suggestions.</p>
                </div>
            `;
            return;
        }

        let recommendationsHTML = '';
        recommendations.forEach((course, index) => {
            // Get category name, mapping from ID if necessary
            let categoryName = 'General';
            if (course.category) {
                categoryName = categoryMap[course.category] || course.category;
            }

            // Determine badge color based on category
            let badgeClass = 'bg-indigo-100 text-indigo-800';
            if (categoryName) {
                const category = categoryName.toLowerCase();
                if (category.includes('web')) {
                    badgeClass = 'bg-blue-100 text-blue-800';
                } else if (category.includes('data')) {
                    badgeClass = 'bg-green-100 text-green-800';
                } else if (category.includes('design')) {
                    badgeClass = 'bg-purple-100 text-purple-800';
                } else if (category.includes('mobile')) {
                    badgeClass = 'bg-amber-100 text-amber-800';
                } else if (category.includes('business')) {
                    badgeClass = 'bg-indigo-100 text-indigo-800';
                } else {
                    badgeClass = 'bg-gray-100 text-gray-800';
                }
            }

            // Calculate average duration of lessons
            let totalDuration = 0;
            if (course.lessons && Array.isArray(course.lessons)) {
                totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
            }
            
            // Get average rating
            const avgRating = window.reviewSystem ? window.reviewSystem.getAverageRating(course.id) : 0;
            const reviewCount = window.reviewSystem ? window.reviewSystem.getCourseReviews(course.id).length : 0;

            recommendationsHTML += `
                <div class="course-card recommendation-card" data-course-id="${course.id}">
                    <div class="course-image-container">
                        <img
                            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMyIgcng9IjIiLz48cG9seWxpbmUgcG9pbnRzPSIxIDIwIDggMTMgMTMgMTgiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAyMCAxNi41IDE1LjUgMTQgMTgiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSI5IiB5Mj0iOSIvPjwvc3ZnPg=="
                            data-src="${course.thumbnail || 'https://placehold.co/400x200/6366f1/white?text=Course'}"
                            alt="${course.title}"
                            class="course-image lazy-load"
                            loading="lazy"
                            onerror="this.src='https://placehold.co/400x200/6366f1/white?text=Course';"
                        >
                        <button class="bookmark-btn ${bookmarkedCourses.has(course.id) ? 'bookmarked' : 'not-bookmarked'}" 
                                data-course-id="${course.id}"
                                title="${bookmarkedCourses.has(course.id) ? 'Remove from bookmarks' : 'Save for later'}">
                            <svg class="h-5 w-5 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    </div>
                    <div class="course-card-content">
                        <div class="flex justify-between items-start mb-4">
                            <span class="badge ${badgeClass}">
                                ${categoryName}
                            </span>
                            ${index < 2 ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200">Recommended</span>' : ''}
                        </div>
                        <h3 class="course-card-title">${course.title}</h3>
                        <p class="course-card-description">
                            ${course.description || 'No description available for this course.'}
                        </p>
                        
                        <!-- Reviews Section for Recommendations -->
                        <div class="mt-3 pt-3 border-t border-gray-100">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    ${window.reviewSystem ? window.reviewSystem.generateStarRating(Math.round(avgRating), 'w-3 h-3') : ''}
                                    <span class="ml-1 text-xs font-medium text-gray-600">${avgRating.toFixed(1)}</span>
                                    <span class="ml-1 text-xs text-gray-400">(${reviewCount})</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="course-card-meta">
                            <div class="flex items-center text-gray-600 text-sm">
                                <svg class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="font-medium">${formatDuration(Math.ceil(totalDuration)) || '0m 0s'}</span>
                                ${course.enrollmentCount ? `<span class="ml-3 badge bg-green-100 text-green-800">${course.enrollmentCount} enrolled</span>` : ''}
                            </div>
                            <button class="btn btn-primary enroll-btn" data-course-id="${course.id}">
                                Enroll Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        recommendationsContainer.innerHTML = recommendationsHTML;

        // Add event listeners to bookmark buttons in recommendations
        document.querySelectorAll('.recommendation-card .bookmark-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const courseId = this.getAttribute('data-course-id');
                toggleBookmark(courseId);
            });
        });

        // Add event listeners to recommendation cards for tracking
        document.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Only track if clicking on the card itself, not on buttons/links
                if (e.target.classList.contains('enroll-btn') || e.target.classList.contains('bookmark-btn')) return;
                
                const courseId = this.getAttribute('data-course-id');
                if (userId && courseId) {
                    firebaseServices.trackRecommendationInteraction(userId, courseId, 'click');
                }
            });
        });

        // Add event listeners to enroll buttons
        document.querySelectorAll('.enroll-btn').forEach(button => {
            button.addEventListener('click', function() {
                const courseId = this.getAttribute('data-course-id');
                if (userId && courseId) {
                    // Track enrollment from recommendation
                    firebaseServices.trackRecommendationInteraction(userId, courseId, 'enroll');
                }
                enrollInCourse(courseId);
            });
        });

        // Track recommendation views
        if (userId) {
            recommendations.forEach(course => {
                firebaseServices.trackRecommendationInteraction(userId, course.id, 'view');
            });
        }
    }

    // Render category filters
    function renderCategoryFilters(categories) {
        if (!categoryFilterContainer) return;

        console.log('Rendering category filters:', categories);

        // Start with "All Courses" button
        let filtersHTML = '<button class="category-btn filter-btn active" data-category="all">All Courses</button>';

        // Add buttons for each category
        if (categories && categories.length > 0) {
            // Get unique categories from courses
            const courseCategories = [...new Set(allCourses.map(course => course.category).filter(Boolean))];

            // Add buttons for each unique category
            courseCategories.forEach(category => {
                const categoryName = categoryMap[category] || category;
                console.log('Adding category button:', categoryName);
                filtersHTML += `<button class="category-btn filter-btn" data-category="${categoryName}">${categoryName}</button>`;
            });
        } else {
            // Fallback to categories from courses if none exist in database
            console.log('No categories found in database, using categories from courses');
            const courseCategories = [...new Set(allCourses.map(course => course.category).filter(Boolean))];

            courseCategories.forEach(category => {
                const categoryName = categoryMap[category] || category;
                console.log('Adding course category button:', categoryName);
                filtersHTML += `<button class="category-btn filter-btn" data-category="${categoryName}">${categoryName}</button>`;
            });
        }

        categoryFilterContainer.innerHTML = filtersHTML;

        // Add event listeners to filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                console.log('Category button clicked:', category);

                // Update active button styling
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-category') === category) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Update current filter and apply filters
                currentFilter = category;
                applyFilters();
            });
        });
    }
    
    // Render instructor filters
    function renderInstructorFilters(courses) {
        if (!instructorFilterSelect) return;
        
        // Get unique instructors
        const instructors = [...new Set(courses.map(course => course.instructor).filter(Boolean))];
        
        // Clear existing options except the first one
        instructorFilterSelect.innerHTML = '<option value="all">All Instructors</option>';
        
        // Add instructor options
        instructors.forEach(instructor => {
            const option = document.createElement('option');
            option.value = instructor;
            option.textContent = instructor;
            instructorFilterSelect.appendChild(option);
        });
    }
    
    // Render difficulty filters
    function renderDifficultyFilters() {
        // Difficulty filters are static, but we could enhance this in the future
        // For now, we'll just ensure the select element exists
        if (!difficultyFilterSelect) return;
        
        // The options are already in the HTML, but we could dynamically generate them if needed
        console.log('Difficulty filters rendered');
    }

    // Main function to render courses with prerequisites, reviews and collections button
    async function renderCourses(courses) {
        if (!coursesContainer) return;

        if (courses.length === 0) {
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-6 text-2xl font-bold text-gray-900">No courses found</h3>
                    <p class="mt-3 text-gray-600 max-w-md mx-auto">Try adjusting your search or filter criteria</p>
                    <div class="mt-8">
                        <button id="clear-filters-btn" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300 shadow-md hover:shadow-lg">
                            Clear Filters
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listener to clear filters button
            const clearFiltersBtn = document.getElementById('clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', function() {
                    // Reset all filters
                    currentSearchTerm = '';
                    currentFilter = 'all';
                    difficultyFilter = 'all';
                    durationFilter = 'all';
                    instructorFilter = 'all';
                    currentSort = 'newest';
                    
                    
                    
                    // Reset UI elements
                    if (searchInput) searchInput.value = '';
                    if (sortSelect) sortSelect.value = 'newest';
                    if (difficultyFilterSelect) difficultyFilterSelect.value = 'all';
                    if (durationFilterSelect) durationFilterSelect.value = 'all';
                    if (instructorFilterSelect) instructorFilterSelect.value = 'all';
                    
                    // Update active button styling
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        if (btn.getAttribute('data-category') === 'all') {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                    
                    applyFilters();
                });
            }
            
            return;
        }

        // Show loading state for prerequisites
        coursesContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <div class="loading-spinner mx-auto"></div>
                <p class="mt-4 text-gray-700 font-semibold">Loading course data...</p>
            </div>
        `;

        try {
            const user = firebaseServices.auth.currentUser;
            const isUserLoggedIn = !!user;
            
            // Create an array to store all course data with prerequisites
            const coursesWithPrerequisites = [];
            
            for (const course of courses) {
                // Get prerequisites for each course
                const prerequisiteIds = await getCoursePrerequisites(course.id);
                const prerequisiteDetails = await getPrerequisiteDetails(prerequisiteIds);
                
                coursesWithPrerequisites.push({
                    ...course,
                    prerequisiteDetails: prerequisiteDetails
                });
            }

            // Generate HTML for courses
            let coursesHTML = '';
            
            for (const course of coursesWithPrerequisites) {
                // Map category ID to name if it's an ID, otherwise use as is
                let categoryName = course.category || 'General';
                if (categoryMap && categoryMap[course.category]) {
                    categoryName = categoryMap[course.category];
                }
                
                // Get duration category
                const durationCategory = getDurationCategory(course.duration);
                let durationText = course.duration || 'N/A';
                if (durationCategory === 'short') durationText += ' (Short)';
                else if (durationCategory === 'medium') durationText += ' (Medium)';
                else if (durationCategory === 'long') durationText += ' (Long)';
                
                const isBookmarked = bookmarkedCourses.has(course.id);
                
                // Generate prerequisites section
                const prerequisitesSection = renderPrerequisitesSection(
                    course.prerequisiteDetails,
                    isUserLoggedIn
                );
                
                // Generate reviews section
                const reviewsSection = createReviewSection(course);

                coursesHTML += `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card relative">
                        <!-- Bookmark Button -->
                        <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : 'not-bookmarked'} absolute top-4 right-4 z-10" 
                                data-course-id="${course.id}"
                                title="${isBookmarked ? 'Remove from bookmarks' : 'Save for later'}">
                            <svg class="h-6 w-6 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                        
                        <!-- Add to Collection Button -->
                        <button class="add-to-collection-btn absolute top-4 right-28 z-10 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                                data-course-id="${course.id}"
                                title="Add to collection">
                            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                        
                        <div class="h-48 overflow-hidden">
                            <img class="w-full h-full object-cover lazy-load" data-src="${course.thumbnail || 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'}" alt="${course.title}" loading="lazy">
                        </div>
                        <div class="p-6">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900">${course.title}</h3>
                                    <p class="mt-1 text-sm text-gray-500">${categoryName} • ${course.difficulty || 'Beginner'}</p>
                                </div>
                                <div class="flex items-center text-amber-500">
                                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span class="ml-1 text-gray-600">${window.reviewSystem ? window.reviewSystem.getAverageRating(course.id).toFixed(1) : '0.0'}</span>
                                </div>
                            </div>
                            
                            <p class="mt-3 text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                            
                            <!-- PREREQUISITES SECTION -->
                            ${prerequisitesSection}
                            
                            <!-- REVIEWS SECTION -->
                            ${reviewsSection}
                            
                            <div class="mt-4 flex flex-wrap gap-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    ${course.lessons ? course.lessons.length : 0} lessons
                                </span>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    ${durationText}
                                </span>
                                ${course.instructor ? `
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    ${course.instructor}
                                </span>
                                ` : ''}
                                ${course.enrollmentCount ? `
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ${course.enrollmentCount} enrolled
                                </span>
                                ` : ''}
                            </div>
                            
                            <div class="mt-6 flex space-x-3">
                                <a href="player.html?courseId=${course.id}" class="flex-1 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center">
                                    View Course
                                </a>
                                <button class="bookmark-btn-text ${isBookmarked ? 'bookmarked' : 'not-bookmarked'} px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300 flex items-center justify-center"
                                        data-course-id="${course.id}">
                                    <svg class="h-5 w-5 mr-2 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    <span class="bookmark-text">${isBookmarked ? 'Saved' : 'Save'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            console.log('Generated courses HTML:', coursesHTML);
            coursesContainer.innerHTML = coursesHTML;
            console.log('Courses container updated with', courses.length, 'courses');
            
            // Add event listeners to bookmark buttons
            document.querySelectorAll('.bookmark-btn, .bookmark-btn-text').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const courseId = this.getAttribute('data-course-id');
                    toggleBookmark(courseId);
                });
            });
            
            // Add event listeners for collection buttons
            document.querySelectorAll('.add-to-collection-btn').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const courseId = this.getAttribute('data-course-id');
                    showAddToCollectionDropdown(courseId, this);
                });
            });
            
            // Observe images for lazy loading
            document.querySelectorAll('.lazy-load').forEach(img => {
                imageObserver.observe(img);
            });
            
            // Load reviews for each course
            courses.forEach(course => {
                loadCourseReviews(course.id);
            });
            
        } catch (error) {
            console.error('Error rendering courses with prerequisites:', error);
            utils.showNotification('Error loading course data', 'error');
            
            // Fallback to basic rendering without prerequisites
            renderBasicCourses(courses);
        }
    }

    // Fallback function to render courses without prerequisites
    function renderBasicCourses(courses) {
        if (!coursesContainer) return;

        let coursesHTML = '';
        courses.forEach(course => {
            let categoryName = course.category || 'General';
            if (categoryMap && categoryMap[course.category]) {
                categoryName = categoryMap[course.category];
            }
            
            const isBookmarked = bookmarkedCourses.has(course.id);
            
            // Generate reviews section
            const reviewsSection = createReviewSection(course);
            
            coursesHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card relative">
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : 'not-bookmarked'} absolute top-4 right-4 z-10" 
                            data-course-id="${course.id}"
                            title="${isBookmarked ? 'Remove from bookmarks' : 'Save for later'}">
                        <svg class="h-6 w-6 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                    
                    <!-- Add to Collection Button -->
                    <button class="add-to-collection-btn absolute top-4 right-28 z-10 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                            data-course-id="${course.id}"
                            title="Add to collection">
                        <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                    
                    <div class="h-48 overflow-hidden">
                        <img class="w-full h-full object-cover lazy-load" data-src="${course.thumbnail || 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'}" alt="${course.title}" loading="lazy">
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">${course.title}</h3>
                                <p class="mt-1 text-sm text-gray-500">${categoryName} • ${course.difficulty || 'Beginner'}</p>
                            </div>
                            <div class="flex items-center text-amber-500">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span class="ml-1 text-gray-600">${window.reviewSystem ? window.reviewSystem.getAverageRating(course.id).toFixed(1) : '0.0'}</span>
                            </div>
                        </div>
                        
                        <p class="mt-3 text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                        
                        <!-- REVIEWS SECTION -->
                        ${reviewsSection}
                        
                        <div class="mt-4 flex flex-wrap gap-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${course.lessons ? course.lessons.length : 0} lessons
                            </span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                ${course.duration || 'N/A'}
                            </span>
                            ${course.instructor ? `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                ${course.instructor}
                            </span>
                            ` : ''}
                            ${course.enrollmentCount ? `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ${course.enrollmentCount} enrolled
                            </span>
                            ` : ''}
                        </div>
                        
                        <div class="mt-6 flex space-x-3">
                            <a href="player.html?courseId=${course.id}" class="flex-1 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center">
                                View Course
                            </a>
                            <button class="bookmark-btn-text ${isBookmarked ? 'bookmarked' : 'not-bookmarked'} px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300 flex items-center justify-center"
                                    data-course-id="${course.id}">
                                <svg class="h-5 w-5 mr-2 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                <span class="bookmark-text">${isBookmarked ? 'Saved' : 'Save'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        coursesContainer.innerHTML = coursesHTML;
        
        // Add event listeners to bookmark buttons
        document.querySelectorAll('.bookmark-btn, .bookmark-btn-text').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const courseId = this.getAttribute('data-course-id');
                toggleBookmark(courseId);
            });
        });
        
        // Add event listeners for collection buttons
        document.querySelectorAll('.add-to-collection-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const courseId = this.getAttribute('data-course-id');
                showAddToCollectionDropdown(courseId, this);
            });
        });
        
        // Observe images for lazy loading
        document.querySelectorAll('.lazy-load').forEach(img => {
            imageObserver.observe(img);
        });
        
        // Load reviews for each course
        courses.forEach(course => {
            loadCourseReviews(course.id);
        });
    }
});