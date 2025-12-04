// Learning Path Visualization System for BYAMN Platform
// Shows course dependencies and "Where to go next" recommendations

class LearningPathVisualizer {
    constructor() {
        this.containerId = 'learning-path-container';
        this.currentUserId = null;
        this.enrolledCourses = [];
        this.allCourses = [];
        this.courseDependencies = {};
        this.visualizationType = 'roadmap'; // 'roadmap' or 'recommendations'
        this.isInitialized = false;
    }

    // Initialize the learning path visualizer
    async init(userId) {
        try {
            this.currentUserId = userId;
            
            // Create container if it doesn't exist
            this.createContainer();
            
            // Load data
            await this.loadData();
            
            // Render visualization
            this.render();
            
            this.isInitialized = true;
            console.log('Learning Path Visualizer initialized');
            
        } catch (error) {
            console.error('Error initializing learning path visualizer:', error);
            this.showError('Failed to load learning path visualization');
        }
    }

    // Create visualization container
    createContainer() {
        let container = document.getElementById(this.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'learning-path-container';
            
            // Add container to dashboard
            const dashboardSection = document.querySelector('#learning-patterns-container');
            if (dashboardSection) {
                dashboardSection.innerHTML = '';
                dashboardSection.appendChild(container);
            }
        }
        
        // Add header and controls
        container.innerHTML = `
            <div class="learning-path-header">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Learning Path</h3>
                <div class="flex space-x-2 mb-4">
                    <button id="path-roadmap-btn" class="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white">Roadmap</button>
                    <button id="path-recommendations-btn" class="px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700">Recommendations</button>
                </div>
            </div>
            <div id="path-visualization" class="relative h-96 bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="loading-spinner mx-auto"></div>
                        <p class="mt-4 text-gray-600">Loading learning path...</p>
                    </div>
                </div>
            </div>
            <div id="path-legend" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3"></div>
        `;
        
        // Add event listeners for buttons
        setTimeout(() => {
            document.getElementById('path-roadmap-btn')?.addEventListener('click', () => {
                this.switchVisualization('roadmap');
            });
            
            document.getElementById('path-recommendations-btn')?.addEventListener('click', () => {
                this.switchVisualization('recommendations');
            });
        }, 100);
    }

    // Load required data
    async loadData() {
        try {
            // Load enrolled courses
            this.enrolledCourses = await this.getUserEnrollments();
            
            // Load all courses
            this.allCourses = await this.getAllCourses();
            
            // Calculate dependencies (simulated - in real app, this would come from backend)
            this.calculateDependencies();
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    // Get user enrollments
    async getUserEnrollments() {
        if (!this.currentUserId) return [];
        
        try {
            if (window.firebaseServices && window.firebaseServices.getUserEnrollments) {
                return await window.firebaseServices.getUserEnrollments(this.currentUserId);
            }
            
            // Fallback: Use Firebase directly
            const snapshot = await firebase.database().ref('enrollments')
                .orderByChild('userId')
                .equalTo(this.currentUserId)
                .once('value');
            
            const enrollments = snapshot.val() || {};
            return Object.keys(enrollments).map(key => ({
                id: key,
                ...enrollments[key]
            }));
            
        } catch (error) {
            console.error('Error getting user enrollments:', error);
            return [];
        }
    }

    // Get all courses
    async getAllCourses() {
        try {
            if (window.firebaseServices && window.firebaseServices.getCourses) {
                return await window.firebaseServices.getCourses();
            }
            
            // Fallback: Use Firebase directly
            const snapshot = await firebase.database().ref('courses').once('value');
            const courses = snapshot.val() || {};
            return Object.keys(courses).map(key => ({
                id: key,
                ...courses[key]
            }));
            
        } catch (error) {
            console.error('Error getting all courses:', error);
            return [];
        }
    }

    // Calculate course dependencies (simulated logic)
    calculateDependencies() {
        // In a real application, this would come from the database
        // For now, we'll simulate some dependencies based on categories
        
        const categories = ['Web Development', 'Data Science', 'UI/UX Design', 'Business', 'Marketing'];
        
        this.courseDependencies = {};
        
        this.allCourses.forEach(course => {
            const category = course.category || 'General';
            const level = this.getCourseLevel(course);
            
            // Find prerequisite courses in the same category but lower level
            const prerequisites = this.allCourses.filter(c => 
                (c.category === category || c.category === 'General') &&
                this.getCourseLevel(c) < level &&
                c.id !== course.id
            ).slice(0, 2); // Limit to 2 prerequisites
            
            // Find next courses (what to take after this)
            const nextCourses = this.allCourses.filter(c => 
                (c.category === category || category === 'General') &&
                this.getCourseLevel(c) > level &&
                c.id !== course.id
            ).slice(0, 3); // Limit to 3 next courses
            
            this.courseDependencies[course.id] = {
                prerequisites: prerequisites.map(c => c.id),
                nextCourses: nextCourses.map(c => c.id)
            };
        });
    }

    // Determine course level based on difficulty
    getCourseLevel(course) {
        const difficulty = (course.difficulty || 'Beginner').toLowerCase();
        
        switch(difficulty) {
            case 'beginner': return 1;
            case 'intermediate': return 2;
            case 'advanced': return 3;
            default: return 1;
        }
    }

    // Switch visualization type
    switchVisualization(type) {
        if (this.visualizationType === type) return;
        
        this.visualizationType = type;
        
        // Update button states
        const roadmapBtn = document.getElementById('path-roadmap-btn');
        const recommendationsBtn = document.getElementById('path-recommendations-btn');
        
        if (roadmapBtn && recommendationsBtn) {
            if (type === 'roadmap') {
                roadmapBtn.className = 'px-3 py-1 text-sm rounded-md bg-indigo-600 text-white';
                recommendationsBtn.className = 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700';
            } else {
                roadmapBtn.className = 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700';
                recommendationsBtn.className = 'px-3 py-1 text-sm rounded-md bg-indigo-600 text-white';
            }
        }
        
        this.render();
    }

    // Render the visualization
    render() {
        const visualizationContainer = document.getElementById('path-visualization');
        if (!visualizationContainer) return;
        
        if (this.visualizationType === 'roadmap') {
            this.renderRoadmap(visualizationContainer);
        } else {
            this.renderRecommendations(visualizationContainer);
        }
        
        this.renderLegend();
    }

    // Render roadmap visualization
    renderRoadmap(container) {
        // Get completed courses
        const completedCourses = this.enrolledCourses.filter(e => e.progress === 100);
        const inProgressCourses = this.enrolledCourses.filter(e => e.progress > 0 && e.progress < 100);
        
        // Create SVG for visualization
        const svgHTML = `
            <div class="p-4">
                <div class="mb-6">
                    <h4 class="font-medium text-gray-900 mb-2">Your Learning Journey</h4>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                            <span class="text-sm text-gray-600">Completed (${completedCourses.length})</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                            <span class="text-sm text-gray-600">In Progress (${inProgressCourses.length})</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                            <span class="text-sm text-gray-600">Available</span>
                        </div>
                    </div>
                </div>
                
                <div class="relative">
                    <!-- Progress Timeline -->
                    <div class="absolute left-8 top-0 bottom-0 w-1 bg-gray-200"></div>
                    
                    <div class="space-y-6 pl-12">
                        ${this.renderRoadmapSteps(completedCourses, inProgressCourses)}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = svgHTML;
        
        // Add click handlers for course nodes
        setTimeout(() => {
            this.addCourseNodeEventListeners();
        }, 100);
    }

    // Render roadmap steps
    renderRoadmapSteps(completedCourses, inProgressCourses) {
        // Combine and sort courses by completion/progress
        const allUserCourses = [...completedCourses, ...inProgressCourses];
        
        if (allUserCourses.length === 0) {
            return `
                <div class="text-center py-8">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p class="mt-2 text-gray-600">Start your learning journey by enrolling in a course!</p>
                    <a href="./courses.html" class="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Browse Courses
                    </a>
                </div>
            `;
        }
        
        let stepsHTML = '';
        let stepNumber = 1;
        
        // Render completed courses first
        completedCourses.forEach(enrollment => {
            const course = this.allCourses.find(c => c.id === enrollment.courseId);
            if (course) {
                stepsHTML += this.renderRoadmapStep(stepNumber++, course, 'completed', enrollment);
            }
        });
        
        // Render in-progress courses
        inProgressCourses.forEach(enrollment => {
            const course = this.allCourses.find(c => c.id === enrollment.courseId);
            if (course) {
                stepsHTML += this.renderRoadmapStep(stepNumber++, course, 'in-progress', enrollment);
            }
        });
        
        // Render next recommendations
        const nextCourses = this.getNextRecommendations();
        if (nextCourses.length > 0) {
            stepsHTML += `
                <div class="pt-4 border-t border-gray-200">
                    <h5 class="font-medium text-gray-900 mb-3">What to Learn Next</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${nextCourses.map(course => this.renderRecommendationCard(course)).join('')}
                    </div>
                </div>
            `;
        }
        
        return stepsHTML;
    }

    // Render a single roadmap step
    renderRoadmapStep(stepNumber, course, status, enrollment = null) {
        const statusColors = {
            'completed': 'bg-green-500',
            'in-progress': 'bg-blue-500',
            'available': 'bg-gray-300'
        };
        
        const statusText = {
            'completed': 'Completed',
            'in-progress': 'In Progress',
            'available': 'Available'
        };
        
        const progress = enrollment ? enrollment.progress || 0 : 0;
        
        return `
            <div class="relative group">
                <!-- Step indicator -->
                <div class="absolute -left-12 top-4 w-8 h-8 rounded-full ${statusColors[status]} flex items-center justify-center text-white font-bold">
                    ${stepNumber}
                </div>
                
                <!-- Course card -->
                <div class="bg-white border ${status === 'completed' ? 'border-green-200' : status === 'in-progress' ? 'border-blue-200' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer course-node" data-course-id="${course.id}">
                    <div class="flex justify-between items-start mb-2">
                        <h5 class="font-medium text-gray-900">${course.title || 'Untitled Course'}</h5>
                        <span class="px-2 py-1 text-xs rounded-full ${status === 'completed' ? 'bg-green-100 text-green-800' : status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                            ${statusText[status]}
                        </span>
                    </div>
                    
                    ${course.category ? `<p class="text-sm text-gray-600 mb-2">${course.category}</p>` : ''}
                    
                    ${status === 'in-progress' ? `
                        <div class="mt-2">
                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${status === 'completed' && enrollment?.completedAt ? `
                        <p class="text-xs text-gray-500 mt-2">Completed on ${new Date(enrollment.completedAt).toLocaleDateString()}</p>
                    ` : ''}
                    
                    <div class="mt-3">
                        <a href="./player.html?courseId=${course.id}" class="text-sm ${status === 'completed' ? 'text-green-600 hover:text-green-800' : 'text-indigo-600 hover:text-indigo-800'} font-medium">
                            ${status === 'completed' ? 'Review Course' : 'Continue Learning'} →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Render recommendations visualization
    renderRecommendations(container) {
        const recommendations = this.getNextRecommendations();
        
        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p class="mt-2 text-gray-600">Complete some courses to get personalized recommendations!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="p-4">
                <h4 class="font-medium text-gray-900 mb-4">Personalized Course Recommendations</h4>
                <p class="text-sm text-gray-600 mb-6">Based on your learning history and progress</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${recommendations.map(course => this.renderRecommendationCard(course)).join('')}
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex">
                        <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h5 class="font-medium text-blue-800">How recommendations are generated</h5>
                            <p class="text-sm text-blue-700 mt-1">
                                Recommendations are based on your completed courses, learning patterns, and popular courses in similar categories.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers for recommendation cards
        setTimeout(() => {
            this.addRecommendationCardEventListeners();
        }, 100);
    }

    // Render a recommendation card
    renderRecommendationCard(course) {
        const difficulty = course.difficulty || 'Beginner';
        const difficultyColor = {
            'Beginner': 'bg-green-100 text-green-800',
            'Intermediate': 'bg-yellow-100 text-yellow-800',
            'Advanced': 'bg-red-100 text-red-800'
        }[difficulty] || 'bg-gray-100 text-gray-800';
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer recommendation-card" data-course-id="${course.id}">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h5 class="font-medium text-gray-900 line-clamp-1">${course.title || 'Untitled Course'}</h5>
                        ${course.category ? `<p class="text-sm text-gray-600 mt-1">${course.category}</p>` : ''}
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${difficultyColor}">
                        ${difficulty}
                    </span>
                </div>
                
                ${course.description ? `<p class="text-sm text-gray-600 mb-4 line-clamp-2">${course.description}</p>` : ''}
                
                <div class="flex justify-between items-center">
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ${this.formatDuration(course.duration) || 'Self-paced'}
                    </div>
                    <button class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 enroll-btn" data-course-id="${course.id}">
                        Enroll Now
                    </button>
                </div>
            </div>
        `;
    }

    // Get next course recommendations
    getNextRecommendations() {
        const completedCourses = this.enrolledCourses.filter(e => e.progress === 100);
        
        if (completedCourses.length === 0) {
            // If no completed courses, recommend popular beginner courses
            return this.allCourses
                .filter(course => (course.difficulty || 'Beginner').toLowerCase() === 'beginner')
                .sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))
                .slice(0, 6);
        }
        
        // Get categories of completed courses
        const completedCategories = {};
        completedCourses.forEach(enrollment => {
            const course = this.allCourses.find(c => c.id === enrollment.courseId);
            if (course && course.category) {
                completedCategories[course.category] = (completedCategories[course.category] || 0) + 1;
            }
        });
        
        // Find most common category
        let mostCommonCategory = 'General';
        let maxCount = 0;
        for (const [category, count] of Object.entries(completedCategories)) {
            if (count > maxCount) {
                mostCommonCategory = category;
                maxCount = count;
            }
        }
        
        // Recommend courses in the same category, not yet enrolled, with increasing difficulty
        const enrolledCourseIds = this.enrolledCourses.map(e => e.courseId);
        
        return this.allCourses
            .filter(course => {
                // Not already enrolled
                if (enrolledCourseIds.includes(course.id)) return false;
                
                // Same category or general
                if (course.category !== mostCommonCategory && course.category !== 'General') return false;
                
                // Next difficulty level
                const avgLevel = this.getAverageCompletedLevel();
                const courseLevel = this.getCourseLevel(course);
                
                return courseLevel <= avgLevel + 1; // Don't recommend courses too far ahead
            })
            .sort((a, b) => {
                // Sort by: 1. Same category, 2. Difficulty, 3. Popularity
                const aCategoryMatch = a.category === mostCommonCategory ? 1 : 0;
                const bCategoryMatch = b.category === mostCommonCategory ? 1 : 0;
                
                if (aCategoryMatch !== bCategoryMatch) {
                    return bCategoryMatch - aCategoryMatch;
                }
                
                return (b.enrollmentCount || 0) - (a.enrollmentCount || 0);
            })
            .slice(0, 6);
    }

    // Get average completed course level
    getAverageCompletedLevel() {
        const completedCourses = this.enrolledCourses.filter(e => e.progress === 100);
        
        if (completedCourses.length === 0) return 1;
        
        let totalLevel = 0;
        completedCourses.forEach(enrollment => {
            const course = this.allCourses.find(c => c.id === enrollment.courseId);
            if (course) {
                totalLevel += this.getCourseLevel(course);
            }
        });
        
        return Math.round(totalLevel / completedCourses.length);
    }

    // Render legend
    renderLegend() {
        const legendContainer = document.getElementById('path-legend');
        if (!legendContainer) return;
        
        legendContainer.innerHTML = `
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span class="text-sm text-gray-600">Completed Course</span>
            </div>
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span class="text-sm text-gray-600">In Progress</span>
            </div>
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                <span class="text-sm text-gray-600">Recommended</span>
            </div>
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                <span class="text-sm text-gray-600">Available</span>
            </div>
        `;
    }

    // Add event listeners for course nodes
    addCourseNodeEventListeners() {
        document.querySelectorAll('.course-node').forEach(node => {
            node.addEventListener('click', (e) => {
                if (!e.target.classList.contains('enroll-btn')) {
                    const courseId = node.dataset.courseId;
                    window.location.href = `./player.html?courseId=${courseId}`;
                }
            });
        });
    }

    // Add event listeners for recommendation cards
    addRecommendationCardEventListeners() {
        document.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('enroll-btn')) {
                    const courseId = card.dataset.courseId;
                    window.location.href = `./courses.html?highlight=${courseId}`;
                }
            });
        });
        
        document.querySelectorAll('.enroll-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const courseId = btn.dataset.courseId;
                await this.enrollInCourse(courseId);
            });
        });
    }

    // Enroll in a course
    async enrollInCourse(courseId) {
        try {
            if (!this.currentUserId) {
                window.location.href = './auth/login.html';
                return;
            }
            
            if (window.firebaseServices && window.firebaseServices.enrollUserInCourse) {
                await window.firebaseServices.enrollUserInCourse(this.currentUserId, courseId);
                window.showNotification('Successfully enrolled in course!', 'success');
                
                // Refresh the visualization
                setTimeout(() => {
                    this.init(this.currentUserId);
                }, 1000);
                
            } else {
                window.showNotification('Enrollment service not available', 'error');
            }
            
        } catch (error) {
            console.error('Error enrolling in course:', error);
            window.showNotification('Failed to enroll in course', 'error');
        }
    }

    // Format duration
    formatDuration(seconds) {
        if (!seconds) return '';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Show error message
    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex">
                        <svg class="h-5 w-5 text-red-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 class="text-sm font-medium text-red-800">Error Loading Learning Path</h3>
                            <p class="text-sm text-red-700 mt-1">${message}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Initialize learning path visualizer when dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth state
    setTimeout(async () => {
        const user = await new Promise(resolve => {
            firebase.auth().onAuthStateChanged(resolve);
        });
        
        if (user) {
            const visualizer = new LearningPathVisualizer();
            visualizer.init(user.uid);
            
            // Make it available globally for debugging
            window.learningPathVisualizer = visualizer;
        }
    }, 1000);
});