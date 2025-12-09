// collections.js - Course Collections/Playlists Feature
// Allow users to create custom collections of courses

// Store user collections
let userCollections = [];
let activeCollectionId = null;

// Initialize collections system
function initCollections() {
    loadUserCollections();
    setupCollectionsUI();
}

// Load user collections from localStorage and Firebase
async function loadUserCollections() {
    const user = firebaseServices.auth.currentUser;
    
    try {
        // First, load from localStorage for quick access
        const savedCollections = localStorage.getItem('userCollections');
        if (savedCollections) {
            userCollections = JSON.parse(savedCollections);
        }
        
        // If user is logged in, sync with Firebase
        if (user) {
            const firebaseCollections = await firebaseServices.getUserCollections(user.uid);
            
            if (firebaseCollections && firebaseCollections.length > 0) {
                // Merge Firebase collections with local ones
                const firebaseCollectionIds = new Set(firebaseCollections.map(c => c.id));
                
                // Remove local collections that exist in Firebase (to avoid duplicates)
                userCollections = userCollections.filter(c => !firebaseCollectionIds.has(c.id));
                
                // Add Firebase collections
                userCollections = [...userCollections, ...firebaseCollections];
                
                // Save merged collections
                saveUserCollections();
            }
        }
        
        renderCollectionsList();
    } catch (error) {
        console.error('Error loading collections:', error);
        utils.showNotification('Error loading your collections', 'error');
    }
}

// Save user collections to localStorage and Firebase
async function saveUserCollections() {
    const user = firebaseServices.auth.currentUser;
    
    try {
        // Save to localStorage
        localStorage.setItem('userCollections', JSON.stringify(userCollections));
        
        // If user is logged in, save to Firebase
        if (user) {
            await firebaseServices.saveUserCollections(user.uid, userCollections);
        }
    } catch (error) {
        console.error('Error saving collections:', error);
    }
}

// Create a new collection
async function createCollection(name, description = '', isPublic = false) {
    const user = firebaseServices.auth.currentUser;
    const userId = user ? user.uid : 'anonymous';
    
    const newCollection = {
        id: generateCollectionId(),
        name: name,
        description: description,
        isPublic: isPublic,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        courseIds: [],
        courseCount: 0,
        thumbnail: null
    };
    
    userCollections.push(newCollection);
    await saveUserCollections();
    
    utils.showNotification(`Collection "${name}" created successfully!`, 'success');
    renderCollectionsList();
    
    return newCollection;
}

// Update an existing collection
async function updateCollection(collectionId, updates) {
    const collectionIndex = userCollections.findIndex(c => c.id === collectionId);
    
    if (collectionIndex === -1) {
        utils.showNotification('Collection not found', 'error');
        return null;
    }
    
    userCollections[collectionIndex] = {
        ...userCollections[collectionIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    await saveUserCollections();
    renderCollectionsList();
    
    // If this is the active collection, update its display
    if (activeCollectionId === collectionId) {
        renderCollectionCourses(collectionId);
    }
    
    utils.showNotification('Collection updated successfully!', 'success');
    return userCollections[collectionIndex];
}

// Delete a collection
async function deleteCollection(collectionId) {
    const collectionIndex = userCollections.findIndex(c => c.id === collectionId);
    
    if (collectionIndex === -1) {
        utils.showNotification('Collection not found', 'error');
        return false;
    }
    
    const collectionName = userCollections[collectionIndex].name;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the collection "${collectionName}"?`)) {
        return false;
    }
    
    userCollections.splice(collectionIndex, 1);
    await saveUserCollections();
    
    // If the deleted collection was active, clear the active collection
    if (activeCollectionId === collectionId) {
        activeCollectionId = null;
        clearCollectionView();
    }
    
    utils.showNotification(`Collection "${collectionName}" deleted`, 'success');
    renderCollectionsList();
    
    return true;
}

// Add course to collection
async function addCourseToCollection(collectionId, courseId) {
    const collectionIndex = userCollections.findIndex(c => c.id === collectionId);
    
    if (collectionIndex === -1) {
        utils.showNotification('Collection not found', 'error');
        return false;
    }
    
    const collection = userCollections[collectionIndex];
    
    // Check if course is already in collection
    if (collection.courseIds.includes(courseId)) {
        utils.showNotification('Course is already in this collection', 'info');
        return false;
    }
    
    // Add course to collection
    collection.courseIds.push(courseId);
    collection.courseCount = collection.courseIds.length;
    collection.updatedAt = new Date().toISOString();
    
    // Update collection thumbnail if empty
    if (!collection.thumbnail) {
        const course = await getCourseById(courseId);
        if (course && course.thumbnail) {
            collection.thumbnail = course.thumbnail;
        }
    }
    
    userCollections[collectionIndex] = collection;
    await saveUserCollections();
    
    utils.showNotification('Course added to collection!', 'success');
    
    // Update UI if this collection is active
    if (activeCollectionId === collectionId) {
        renderCollectionCourses(collectionId);
    }
    
    return true;
}

// Remove course from collection
async function removeCourseFromCollection(collectionId, courseId) {
    const collectionIndex = userCollections.findIndex(c => c.id === collectionId);
    
    if (collectionIndex === -1) {
        utils.showNotification('Collection not found', 'error');
        return false;
    }
    
    const collection = userCollections[collectionIndex];
    const courseIndex = collection.courseIds.indexOf(courseId);
    
    if (courseIndex === -1) {
        utils.showNotification('Course not found in collection', 'error');
        return false;
    }
    
    // Remove course from collection
    collection.courseIds.splice(courseIndex, 1);
    collection.courseCount = collection.courseIds.length;
    collection.updatedAt = new Date().toISOString();
    
    // Update collection thumbnail if needed
    if (collection.courseIds.length === 0) {
        collection.thumbnail = null;
    } else if (collection.thumbnail) {
        // Check if removed course was providing the thumbnail
        const course = await getCourseById(courseId);
        if (course && course.thumbnail === collection.thumbnail) {
            // Get thumbnail from another course in collection
            const anotherCourseId = collection.courseIds[0];
            const anotherCourse = await getCourseById(anotherCourseId);
            if (anotherCourse && anotherCourse.thumbnail) {
                collection.thumbnail = anotherCourse.thumbnail;
            }
        }
    }
    
    userCollections[collectionIndex] = collection;
    await saveUserCollections();
    
    utils.showNotification('Course removed from collection', 'success');
    
    // Update UI if this collection is active
    if (activeCollectionId === collectionId) {
        renderCollectionCourses(collectionId);
    }
    
    return true;
}

// Get course by ID (helper function)
async function getCourseById(courseId) {
    try {
        const courses = await firebaseServices.getCourses();
        return courses.find(c => c.id === courseId);
    } catch (error) {
        console.error('Error fetching course:', error);
        return null;
    }
}

// Generate unique collection ID
function generateCollectionId() {
    return 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get collection by ID
function getCollectionById(collectionId) {
    return userCollections.find(c => c.id === collectionId);
}

// Render collections list in sidebar
function renderCollectionsList() {
    const collectionsList = document.getElementById('collections-list');
    const collectionsCount = document.getElementById('collections-count');
    const emptyCollectionsMsg = document.getElementById('empty-collections');
    
    if (!collectionsList) return;
    
    if (userCollections.length === 0) {
        if (collectionsList) collectionsList.innerHTML = '';
        if (collectionsCount) collectionsCount.textContent = '0 collections';
        if (emptyCollectionsMsg) emptyCollectionsMsg.style.display = 'block';
        return;
    }
    
    if (emptyCollectionsMsg) emptyCollectionsMsg.style.display = 'none';
    if (collectionsCount) collectionsCount.textContent = `${userCollections.length} collection${userCollections.length !== 1 ? 's' : ''}`;
    
    let collectionsHTML = '';
    
    userCollections.forEach(collection => {
        const isActive = activeCollectionId === collection.id;
        const activeClass = isActive ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50';
        
        collectionsHTML += `
            <div class="collection-item ${activeClass} border rounded-lg p-3 mb-2 cursor-pointer transition-colors" 
                 data-collection-id="${collection.id}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="collection-thumbnail w-10 h-10 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                            ${collection.thumbnail ? 
                                `<img src="${collection.thumbnail}" alt="${collection.name}" class="w-full h-full object-cover">` :
                                `<div class="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>`
                            }
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900 truncate max-w-[150px]">${collection.name}</h4>
                            <p class="text-xs text-gray-500">${collection.courseCount} course${collection.courseCount !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    ${isActive ? 
                        `<span class="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">Active</span>` : 
                        ''
                    }
                </div>
            </div>
        `;
    });
    
    collectionsList.innerHTML = collectionsHTML;
    
    // Add click event listeners to collection items
    document.querySelectorAll('.collection-item').forEach(item => {
        item.addEventListener('click', function() {
            const collectionId = this.getAttribute('data-collection-id');
            viewCollection(collectionId);
        });
    });
}

// View a collection (set as active and show courses)
async function viewCollection(collectionId) {
    const collection = getCollectionById(collectionId);
    
    if (!collection) {
        utils.showNotification('Collection not found', 'error');
        return;
    }
    
    activeCollectionId = collectionId;
    
    // Update UI to show this collection is active
    document.querySelectorAll('.collection-item').forEach(item => {
        const itemCollectionId = item.getAttribute('data-collection-id');
        if (itemCollectionId === collectionId) {
            item.classList.add('bg-indigo-50', 'border-indigo-200');
            item.classList.remove('hover:bg-gray-50');
        } else {
            item.classList.remove('bg-indigo-50', 'border-indigo-200');
            item.classList.add('hover:bg-gray-50');
        }
    });
    
    // Show collection view
    await renderCollectionView(collection);
}

// Render collection view with courses
async function renderCollectionView(collection) {
    const collectionView = document.getElementById('collection-view');
    const coursesContainer = document.getElementById('collection-courses-container');
    const backToAllCourses = document.getElementById('back-to-all-courses');
    
    if (!collectionView || !coursesContainer) return;
    
    // Show collection view
    collectionView.classList.remove('hidden');
    
    // Hide main courses view if it exists
    const mainCoursesView = document.getElementById('courses-container');
    if (mainCoursesView) {
        mainCoursesView.classList.add('hidden');
    }
    
    // Update collection header
    document.getElementById('collection-name').textContent = collection.name;
    document.getElementById('collection-description').textContent = collection.description || 'No description';
    document.getElementById('collection-course-count').textContent = `${collection.courseCount} course${collection.courseCount !== 1 ? 's' : ''}`;
    
    // Update collection thumbnail
    const thumbnailElement = document.getElementById('collection-thumbnail');
    if (thumbnailElement) {
        if (collection.thumbnail) {
            thumbnailElement.innerHTML = `<img src="${collection.thumbnail}" alt="${collection.name}" class="w-full h-full object-cover rounded-lg">`;
        } else {
            thumbnailElement.innerHTML = `
                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                    <svg class="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </div>
            `;
        }
    }
    
    // Render collection courses
    await renderCollectionCourses(collection.id);
    
    // Setup back button
    if (backToAllCourses) {
        backToAllCourses.onclick = () => {
            clearCollectionView();
        };
    }
    
    // Setup collection actions
    setupCollectionActions(collection.id);
}

// Render courses in the active collection
async function renderCollectionCourses(collectionId) {
    const collection = getCollectionById(collectionId);
    const coursesContainer = document.getElementById('collection-courses-container');
    
    if (!collection || !coursesContainer) return;
    
    if (collection.courseIds.length === 0) {
        coursesContainer.innerHTML = `
            <div class="col-span-full text-center py-16">
                <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="mt-6 text-xl font-bold text-gray-900">No courses in this collection</h3>
                <p class="mt-3 text-gray-600">Add courses to get started with your learning path</p>
                <button onclick="showAddCoursesModal('${collectionId}')" class="mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300">
                    Add Courses
                </button>
            </div>
        `;
        return;
    }
    
    // Show loading state
    coursesContainer.innerHTML = `
        <div class="col-span-full text-center py-10">
            <div class="loading-spinner mx-auto"></div>
            <p class="mt-4 text-gray-700 font-semibold">Loading collection courses...</p>
        </div>
    `;
    
    try {
        // Get all courses
        const allCourses = await firebaseServices.getCourses();
        
        // Filter courses that are in this collection
        const collectionCourses = allCourses.filter(course => 
            collection.courseIds.includes(course.id)
        );
        
        // Sort courses in the order they were added (optional)
        const sortedCourses = collection.courseIds
            .map(courseId => collectionCourses.find(c => c.id === courseId))
            .filter(Boolean);
        
        // Render courses
        let coursesHTML = '';
        
        if (sortedCourses.length === 0) {
            coursesHTML = `
                <div class="col-span-full text-center py-16">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-6 text-xl font-bold text-gray-900">No courses found</h3>
                    <p class="mt-3 text-gray-600">Some courses may have been removed</p>
                </div>
            `;
        } else {
            sortedCourses.forEach((course, index) => {
                const categoryName = categoryMap && categoryMap[course.category] ? categoryMap[course.category] : course.category;
                const isBookmarked = bookmarkedCourses.has(course.id);
                
                coursesHTML += `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card relative">
                        <!-- Collection Course Actions -->
                        <div class="absolute top-4 right-4 z-10 flex space-x-2">
                            <button class="remove-from-collection-btn p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                                    data-course-id="${course.id}"
                                    data-collection-id="${collectionId}"
                                    title="Remove from collection">
                                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : 'not-bookmarked'} p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                                    data-course-id="${course.id}"
                                    title="${isBookmarked ? 'Remove from bookmarks' : 'Save for later'}">
                                <svg class="w-4 h-4 bookmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Course Order Badge -->
                        <div class="absolute top-4 left-4 z-10 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            ${index + 1}
                        </div>
                        
                        <div class="h-48 overflow-hidden">
                            <img class="w-full h-full object-cover lazy-load" 
                                 data-src="${course.thumbnail || 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'}" 
                                 alt="${course.title}" 
                                 loading="lazy">
                        </div>
                        <div class="p-6">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900">${course.title}</h3>
                                    <p class="mt-1 text-sm text-gray-500">${categoryName || 'General'} • ${course.difficulty || 'Beginner'}</p>
                                </div>
                            </div>
                            
                            <p class="mt-3 text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                            
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
                            </div>
                            
                            <div class="mt-6 flex space-x-3">
                                <a href="player.html?courseId=${course.id}" class="flex-1 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center">
                                    View Course
                                </a>
                                <button class="remove-from-collection-btn-text px-4 py-2 rounded-md border border-red-300 text-red-700 font-medium hover:bg-red-50 transition duration-300 flex items-center justify-center"
                                        data-course-id="${course.id}"
                                        data-collection-id="${collectionId}">
                                    <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        coursesContainer.innerHTML = coursesHTML;
        
        // Add event listeners
        setupCollectionCourseEventListeners(collectionId);
        
        // Observe images for lazy loading
        document.querySelectorAll('.lazy-load').forEach(img => {
            if (imageObserver) {
                imageObserver.observe(img);
            }
        });
        
    } catch (error) {
        console.error('Error rendering collection courses:', error);
        coursesContainer.innerHTML = `
            <div class="col-span-full text-center py-16">
                <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 class="mt-6 text-xl font-bold text-gray-900">Error Loading Courses</h3>
                <p class="mt-3 text-gray-600">Unable to load courses for this collection</p>
                <button onclick="renderCollectionCourses('${collectionId}')" class="mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Setup collection course event listeners
function setupCollectionCourseEventListeners(collectionId) {
    // Remove from collection buttons
    document.querySelectorAll('.remove-from-collection-btn, .remove-from-collection-btn-text').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.stopPropagation();
            const courseId = this.getAttribute('data-course-id');
            
            const confirmed = confirm('Are you sure you want to remove this course from the collection?');
            if (confirmed) {
                await removeCourseFromCollection(collectionId, courseId);
            }
        });
    });
    
    // Bookmark buttons
    document.querySelectorAll('.bookmark-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const courseId = this.getAttribute('data-course-id');
            toggleBookmark(courseId);
        });
    });
}

// Setup collection actions (edit, delete, share)
function setupCollectionActions(collectionId) {
    const editCollectionBtn = document.getElementById('edit-collection-btn');
    const deleteCollectionBtn = document.getElementById('delete-collection-btn');
    const shareCollectionBtn = document.getElementById('share-collection-btn');
    const addCoursesBtn = document.getElementById('add-courses-btn');
    
    if (editCollectionBtn) {
        editCollectionBtn.onclick = () => showEditCollectionModal(collectionId);
    }
    
    if (deleteCollectionBtn) {
        deleteCollectionBtn.onclick = () => deleteCollection(collectionId);
    }
    
    if (shareCollectionBtn) {
        shareCollectionBtn.onclick = () => shareCollection(collectionId);
    }
    
    if (addCoursesBtn) {
        addCoursesBtn.onclick = () => showAddCoursesModal(collectionId);
    }
}

// Clear collection view (go back to all courses)
function clearCollectionView() {
    const collectionView = document.getElementById('collection-view');
    const mainCoursesView = document.getElementById('courses-container');
    
    if (collectionView) {
        collectionView.classList.add('hidden');
    }
    
    if (mainCoursesView) {
        mainCoursesView.classList.remove('hidden');
    }
    
    activeCollectionId = null;
    
    // Reset collection items styling
    document.querySelectorAll('.collection-item').forEach(item => {
        item.classList.remove('bg-indigo-50', 'border-indigo-200');
        item.classList.add('hover:bg-gray-50');
    });
}

// Show create collection modal
function showCreateCollectionModal() {
    const modalHTML = `
        <div id="create-collection-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Create New Collection</h3>
                    <button onclick="closeModal('create-collection-modal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form id="create-collection-form">
                    <div class="mb-4">
                        <label for="collection-name" class="block text-sm font-medium text-gray-700 mb-2">Collection Name *</label>
                        <input type="text" id="collection-name" name="name" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                               placeholder="e.g., My Frontend Learning Path">
                    </div>
                    
                    <div class="mb-4">
                        <label for="collection-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="collection-description" name="description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Describe what this collection is about..."></textarea>
                    </div>
                    
                    <div class="mb-6">
                        <label class="flex items-center">
                            <input type="checkbox" id="collection-public" name="isPublic"
                                   class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            <span class="ml-2 text-sm text-gray-700">Make this collection public (shareable)</span>
                        </label>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal('create-collection-modal')"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit"
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Create Collection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission
    const form = document.getElementById('create-collection-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('collection-name').value;
        const description = document.getElementById('collection-description').value;
        const isPublic = document.getElementById('collection-public').checked;
        
        if (!name.trim()) {
            utils.showNotification('Please enter a collection name', 'error');
            return;
        }
        
        await createCollection(name, description, isPublic);
        closeModal('create-collection-modal');
    });
}

// Show edit collection modal
function showEditCollectionModal(collectionId) {
    const collection = getCollectionById(collectionId);
    if (!collection) return;
    
    const modalHTML = `
        <div id="edit-collection-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Edit Collection</h3>
                    <button onclick="closeModal('edit-collection-modal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form id="edit-collection-form">
                    <div class="mb-4">
                        <label for="edit-collection-name" class="block text-sm font-medium text-gray-700 mb-2">Collection Name *</label>
                        <input type="text" id="edit-collection-name" name="name" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                               value="${collection.name}">
                    </div>
                    
                    <div class="mb-4">
                        <label for="edit-collection-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="edit-collection-description" name="description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Describe what this collection is about...">${collection.description || ''}</textarea>
                    </div>
                    
                    <div class="mb-6">
                        <label class="flex items-center">
                            <input type="checkbox" id="edit-collection-public" name="isPublic"
                                   class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                   ${collection.isPublic ? 'checked' : ''}>
                            <span class="ml-2 text-sm text-gray-700">Make this collection public (shareable)</span>
                        </label>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal('edit-collection-modal')"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit"
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission
    const form = document.getElementById('edit-collection-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('edit-collection-name').value;
        const description = document.getElementById('edit-collection-description').value;
        const isPublic = document.getElementById('edit-collection-public').checked;
        
        if (!name.trim()) {
            utils.showNotification('Please enter a collection name', 'error');
            return;
        }
        
        await updateCollection(collectionId, { name, description, isPublic });
        closeModal('edit-collection-modal');
    });
}

// Show add courses modal
function showAddCoursesModal(collectionId) {
    const modalHTML = `
        <div id="add-courses-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Add Courses to Collection</h3>
                    <button onclick="closeModal('add-courses-modal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Search and filter -->
                <div class="mb-6">
                    <div class="flex space-x-4">
                        <div class="flex-1">
                            <input type="text" id="add-courses-search" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                   placeholder="Search courses...">
                        </div>
                        <select id="add-courses-category" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="all">All Categories</option>
                            ${Object.entries(categoryMap || {}).map(([id, name]) => 
                                `<option value="${name}">${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- Courses grid -->
                <div id="add-courses-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                    <!-- Courses will be loaded here -->
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal('add-courses-modal')"
                            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load and display available courses
    loadAvailableCoursesForCollection(collectionId);
    
    // Setup search functionality
    const searchInput = document.getElementById('add-courses-search');
    const categorySelect = document.getElementById('add-courses-category');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterAvailableCourses(collectionId, this.value, categorySelect.value);
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            filterAvailableCourses(collectionId, searchInput.value, this.value);
        });
    }
}

// Load available courses for adding to collection
async function loadAvailableCoursesForCollection(collectionId) {
    const container = document.getElementById('add-courses-container');
    if (!container) return;
    
    
    container.innerHTML = `
        <div class="col-span-full text-center py-10">
            <div class="loading-spinner mx-auto"></div>
            <p class="mt-4 text-gray-700 font-semibold">Loading courses...</p>
        </div>
    `;
    
    try {
        const allCourses = await firebaseServices.getCourses();
        const collection = getCollectionById(collectionId);
        
        // Filter out courses already in the collection
        const availableCourses = allCourses.filter(course => 
            !collection.courseIds.includes(course.id)
        );
        
        renderAvailableCourses(availableCourses, collectionId);
    } catch (error) {
        console.error('Error loading available courses:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 class="mt-4 text-lg font-bold text-gray-900">Error Loading Courses</h3>
                <p class="mt-2 text-gray-600">Unable to load available courses</p>
            </div>
        `;
    }
}

// Render available courses for adding to collection
function renderAvailableCourses(courses, collectionId) {
    const container = document.getElementById('add-courses-container');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="mt-4 text-lg font-bold text-gray-900">No courses available</h3>
                <p class="mt-2 text-gray-600">All courses are already in this collection</p>
            </div>
        `;
        return;
    }
    
    let coursesHTML = '';
    
    courses.forEach(course => {
        const categoryName = categoryMap && categoryMap[course.category] ? categoryMap[course.category] : course.category;
        
        coursesHTML += `
            <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-start space-x-3">
                    <div class="w-16 h-16 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                        <img src="${course.thumbnail || 'https://placehold.co/100x60/6366f1/white?text=Course'}" 
                             alt="${course.title}" 
                             class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-900 truncate">${course.title}</h4>
                        <p class="text-sm text-gray-500 truncate">${categoryName || 'General'} • ${course.difficulty || 'Beginner'}</p>
                        <div class="mt-2 flex items-center justify-between">
                            <span class="text-xs text-gray-500">${course.lessons ? course.lessons.length : 0} lessons</span>
                            <button onclick="addCourseToCollectionFromModal('${collectionId}', '${course.id}')"
                                    class="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = coursesHTML;
}

// Filter available courses
async function filterAvailableCourses(collectionId, searchTerm, category) {
    try {
        const allCourses = await firebaseServices.getCourses();
        const collection = getCollectionById(collectionId);
        
        // Filter out courses already in the collection
        let availableCourses = allCourses.filter(course => 
            !collection.courseIds.includes(course.id)
        );
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            availableCourses = availableCourses.filter(course =>
                course.title.toLowerCase().includes(term) ||
                (course.description && course.description.toLowerCase().includes(term))
            );
        }
        
        // Apply category filter
        if (category && category !== 'all') {
            availableCourses = availableCourses.filter(course => {
                const courseCategoryName = categoryMap && categoryMap[course.category] ? categoryMap[course.category] : course.category;
                return courseCategoryName === category;
            });
        }
        
        renderAvailableCourses(availableCourses, collectionId);
    } catch (error) {
        console.error('Error filtering courses:', error);
    }
}

// Add course to collection from modal
async function addCourseToCollectionFromModal(collectionId, courseId) {
    const success = await addCourseToCollection(collectionId, courseId);
    
    if (success) {
        // Update the modal view
        const searchInput = document.getElementById('add-courses-search');
        const categorySelect = document.getElementById('add-courses-category');
        
        filterAvailableCourses(collectionId, searchInput.value, categorySelect.value);
    }
}

// Share collection
function shareCollection(collectionId) {
    const collection = getCollectionById(collectionId);
    if (!collection) return;
    
    if (!collection.isPublic) {
        utils.showNotification('This collection is private. Make it public to share.', 'error');
        return;
    }
    
    // Generate shareable URL (in a real app, this would be a unique URL)
    const shareUrl = `${window.location.origin}/collection.html?id=${collectionId}`;
    
    // Show share options
    const shareModalHTML = `
        <div id="share-collection-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Share Collection</h3>
                    <button onclick="closeModal('share-collection-modal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">Share "${collection.name}" with others:</p>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
                        <div class="flex">
                            <input type="text" id="share-link" readonly
                                   value="${shareUrl}"
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                            <button onclick="copyShareLink()"
                                    class="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 transition-colors">
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end">
                    <button onclick="closeModal('share-collection-modal')"
                            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', shareModalHTML);
}

// Copy share link to clipboard
function copyShareLink() {
    const shareLinkInput = document.getElementById('share-link');
    if (!shareLinkInput) return;
    
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        utils.showNotification('Link copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        utils.showNotification('Failed to copy link', 'error');
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Setup collections UI
function setupCollectionsUI() {
    // Create collections sidebar if it doesn't exist
    if (!document.getElementById('collections-sidebar')) {
        createCollectionsSidebar();
    }
    
    // Add "Add to Collection" buttons to course cards
    setupAddToCollectionButtons();
}

// Create collections sidebar HTML
function createCollectionsSidebar() {
    // Check if we're on the courses page
    const coursesPage = document.querySelector('.courses-page-container');
    if (!coursesPage) return;
    
    // Create sidebar HTML
    const sidebarHTML = `
        <div id="collections-sidebar" class="collections-sidebar">
            <div class="sidebar-header">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-900">My Collections</h3>
                    <button onclick="showCreateCollectionModal()" 
                            class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Create new collection">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                
                <div id="collections-count" class="text-sm text-gray-500 mb-2">0 collections</div>
            </div>
            
            <div id="collections-list" class="collections-list space-y-2">
                <!-- Collections will be loaded here -->
            </div>
            
            <div id="empty-collections" class="text-center py-8 hidden">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p class="mt-2 text-sm text-gray-500">No collections yet</p>
                <button onclick="showCreateCollectionModal()" 
                        class="mt-4 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Create Collection
                </button>
            </div>
        </div>
    `;
    
    // Add sidebar to courses page
    coursesPage.insertAdjacentHTML('afterbegin', sidebarHTML);
}

// Setup "Add to Collection" buttons on course cards
function setupAddToCollectionButtons() {
    // This will be called after courses are rendered
    // We'll add a small button to each course card
}

// Add "Add to Collection" button to a course card
function addToCollectionButtonToCourseCard(courseId, courseCard) {
    if (!courseCard) return;
    
    // Create button
    const buttonHTML = `
        <button class="add-to-collection-btn absolute top-4 right-16 z-10 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                data-course-id="${courseId}"
                title="Add to collection">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
        </button>
    `;
    
    // Insert button into course card
    const bookmarkBtn = courseCard.querySelector('.bookmark-btn');
    if (bookmarkBtn && bookmarkBtn.parentElement) {
        bookmarkBtn.parentElement.insertAdjacentHTML('beforeend', buttonHTML);
    }
    
    // Add event listener
    const addBtn = courseCard.querySelector('.add-to-collection-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showAddToCollectionDropdown(courseId, this);
        });
    }
}

// Show dropdown for adding to collections
function showAddToCollectionDropdown(courseId, buttonElement) {
    // Remove existing dropdowns
    const existingDropdowns = document.querySelectorAll('.collection-dropdown');
    existingDropdowns.forEach(dropdown => dropdown.remove());
    
    // Create dropdown
    const dropdownHTML = `
        <div class="collection-dropdown absolute z-50 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
            <div class="px-4 py-2 border-b border-gray-100">
                <h4 class="font-medium text-gray-900">Add to Collection</h4>
            </div>
            
            <div class="max-h-48 overflow-y-auto">
                ${userCollections.length > 0 ? 
                    userCollections.map(collection => `
                        <button class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                                onclick="addCourseToCollection('${collection.id}', '${courseId}'); this.closest('.collection-dropdown').remove();">
                            <span>${collection.name}</span>
                            ${collection.courseIds.includes(courseId) ? 
                                '<span class="text-xs text-green-600">✓ Added</span>' : 
                                '<span class="text-xs text-gray-500">Add</span>'
                            }
                        </button>
                    `).join('') :
                    `<div class="px-4 py-3 text-center text-gray-500">
                        No collections yet
                    </div>`
                }
            </div>
            
            <div class="border-t border-gray-100 px-4 py-2">
                <button onclick="showCreateCollectionModal(); this.closest('.collection-dropdown').remove();"
                        class="w-full text-center text-indigo-600 hover:text-indigo-800 font-medium">
                    + Create New Collection
                </button>
            </div>
        </div>
    `;
    
    // Add dropdown to button parent
    buttonElement.parentElement.insertAdjacentHTML('beforeend', dropdownHTML);
    
    // Position dropdown
    const dropdown = buttonElement.parentElement.querySelector('.collection-dropdown');
    const rect = buttonElement.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
    }, 0);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize collections system
    initCollections();
    
    // Listen for auth state changes to reload collections
    if (firebaseServices && firebaseServices.auth) {
        firebaseServices.auth.onAuthStateChanged(function(user) {
            if (user) {
                loadUserCollections();
            }
        });
    }
});

// Export functions to global scope
window.collections = {
    initCollections,
    loadUserCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addCourseToCollection,
    removeCourseFromCollection,
    viewCollection,
    showCreateCollectionModal,
    showEditCollectionModal,
    showAddCoursesModal,
    shareCollection,
    closeModal
};