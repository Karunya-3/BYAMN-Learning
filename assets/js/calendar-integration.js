/**
 * Learning Calendar Integration
 * Allows users to schedule study sessions in Google/Outlook calendar
 */

class CalendarIntegration {
    constructor() {
        this.calendarEvents = JSON.parse(localStorage.getItem('byamn_calendar_events') || '[]');
        this.initialize();
    }

    initialize() {
        console.log('Calendar Integration initialized');
        this.renderCalendarButtons();
        this.setupEventListeners();
    }

    /**
     * Generate calendar event data for a course
     */
    generateCalendarEvent(course, lesson = null, duration = 'PT1H') {
        const courseTitle = course.title || 'BYAMN Course';
        const lessonTitle = lesson ? ` - ${lesson.title}` : '';
        const description = this.generateEventDescription(course, lesson);
        
        // Calculate suggested study time (default 1 hour)
        const eventDuration = this.calculateStudyDuration(course, lesson) || duration;
        
        // Create start date (tomorrow at 6 PM as default)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(18, 0, 0, 0);
        
        const endDate = new Date(startDate.getTime());
        endDate.setHours(startDate.getHours() + 1);

        return {
            title: `Study: ${courseTitle}${lessonTitle}`,
            description: description,
            location: 'BYAMN Learning Platform',
            startTime: startDate.toISOString().replace(/-|:|\.\d+/g, ''),
            endTime: endDate.toISOString().replace(/-|:|\.\d+/g, ''),
            duration: eventDuration,
            courseId: course.id,
            lessonId: lesson ? lesson.id : null,
            courseData: course,
            lessonData: lesson
        };
    }

    /**
     * Generate event description with course details
     */
    generateEventDescription(course, lesson) {
        let description = `Study session for ${course.title}\n\n`;
        
        if (lesson) {
            description += `Lesson: ${lesson.title}\n`;
            description += `Description: ${lesson.description || 'No description available'}\n\n`;
        }
        
        description += `Course Description: ${course.description || 'No description available'}\n`;
        description += `Course URL: ${window.location.origin}/player.html?courseId=${course.id}`;
        
        if (lesson) {
            description += `&lessonId=${lesson.id}`;
        }
        
        description += `\n\nPowered by BYAMN Learning Platform`;
        return description;
    }

    /**
     * Calculate suggested study duration based on course/lesson
     */
    calculateStudyDuration(course, lesson) {
        if (lesson && lesson.duration) {
            // Add buffer time (25% more)
            const lessonMinutes = Math.ceil(lesson.duration / 60 * 1.25);
            return `PT${lessonMinutes}M`;
        }
        
        if (course.estimatedTime) {
            // Course has estimated time in minutes
            return `PT${course.estimatedTime}M`;
        }
        
        // Default duration
        return 'PT1H';
    }

    /**
     * Create Google Calendar URL
     */
    createGoogleCalendarUrl(event) {
        const baseUrl = 'https://calendar.google.com/calendar/render';
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            details: event.description,
            location: event.location,
            dates: `${event.startTime}/${event.endTime}`,
            ctz: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Create Outlook Calendar URL
     */
    createOutlookCalendarUrl(event) {
        const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
        const params = new URLSearchParams({
            path: '/calendar/action/compose',
            rru: 'addevent',
            subject: event.title,
            body: event.description,
            location: event.location,
            startdt: new Date(event.startTime).toISOString(),
            enddt: new Date(event.endTime).toISOString()
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Create Apple Calendar file
     */
    createAppleCalendarFile(event) {
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `DTSTART:${event.startTime}`,
            `DTEND:${event.endTime}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
            `LOCATION:${event.location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n');
        
        return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
    }

    /**
     * Save event to localStorage
     */
    saveCalendarEvent(event) {
        this.calendarEvents.push({
            ...event,
            created: new Date().toISOString(),
            id: Date.now().toString()
        });
        
        // Keep only last 50 events
        if (this.calendarEvents.length > 50) {
            this.calendarEvents = this.calendarEvents.slice(-50);
        }
        
        localStorage.setItem('byamn_calendar_events', JSON.stringify(this.calendarEvents));
        
        // Show success message
        this.showNotification('Study session added to calendar!', 'success');
        
        // Log analytics
        this.logCalendarEvent(event);
    }

    /**
     * Show calendar picker modal
     */
    showCalendarPicker(event, course, lesson = null) {
        const modal = document.createElement('div');
        modal.className = 'calendar-picker-modal';
        modal.innerHTML = `
            <div class="calendar-picker-content">
                <div class="calendar-picker-header">
                    <h3>📅 Schedule Study Session</h3>
                    <button class="calendar-close-btn">&times;</button>
                </div>
                <div class="calendar-picker-body">
                    <div class="event-preview">
                        <h4>${event.title}</h4>
                        <p><strong>Duration:</strong> ${this.formatDuration(event.duration)}</p>
                        <p><strong>When:</strong> ${new Date(event.startTime).toLocaleString()}</p>
                        <p class="text-sm text-gray-600 mt-2">${event.description.split('\n')[0]}</p>
                    </div>
                    
                    <div class="calendar-options mt-4">
                        <p class="text-sm font-medium mb-2">Add to calendar:</p>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <a href="${this.createGoogleCalendarUrl(event)}" target="_blank" 
                               class="calendar-option-btn bg-red-100 hover:bg-red-200 text-red-700">
                                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                </svg>
                                Google Calendar
                            </a>
                            <a href="${this.createOutlookCalendarUrl(event)}" target="_blank" 
                               class="calendar-option-btn bg-blue-100 hover:bg-blue-200 text-blue-700">
                                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M18 4h2v16h-2V4zM2 4h2v16H2V4zm8 0h2v4h-2V4zm0 6h2v4h-2v-4zm0 6h2v4h-2v-4z"/>
                                </svg>
                                Outlook Calendar
                            </a>
                            <a href="${this.createAppleCalendarFile(event)}" download="study-session.ics" 
                               class="calendar-option-btn bg-gray-100 hover:bg-gray-200 text-gray-700">
                                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.31-2.33 1.05-3.11z"/>
                                </svg>
                                Apple Calendar
                            </a>
                        </div>
                    </div>
                    
                    <div class="calendar-options mt-4">
                        <p class="text-sm font-medium mb-2">Customize time:</p>
                        <div class="flex flex-col space-y-3">
                            <div class="flex items-center">
                                <input type="date" id="calendar-date" 
                                       value="${new Date(event.startTime).toISOString().split('T')[0]}" 
                                       class="flex-1 px-3 py-2 border rounded-md">
                                <input type="time" id="calendar-time" 
                                       value="18:00" 
                                       class="ml-2 px-3 py-2 border rounded-md">
                            </div>
                            <div class="flex items-center">
                                <label class="mr-3 text-sm">Duration:</label>
                                <select id="calendar-duration" class="flex-1 px-3 py-2 border rounded-md">
                                    <option value="PT30M">30 minutes</option>
                                    <option value="PT1H" selected>1 hour</option>
                                    <option value="PT1H30M">1.5 hours</option>
                                    <option value="PT2H">2 hours</option>
                                    <option value="PT3H">3 hours</option>
                                </select>
                            </div>
                            <button id="update-calendar-time" 
                                    class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                Update & Generate New Links
                            </button>
                        </div>
                    </div>
                </div>
                <div class="calendar-picker-footer">
                    <button id="save-calendar-event" 
                            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        💾 Save to Study Schedule
                    </button>
                    <button class="calendar-cancel-btn ml-2 px-4 py-2 border rounded-md hover:bg-gray-100">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add modal styles
        this.addModalStyles();

        // Setup event listeners
        this.setupModalListeners(modal, event, course, lesson);
    }

    /**
     * Format duration for display
     */
    formatDuration(duration) {
        const match = duration.match(/PT(\d+)([HM])/);
        if (!match) return '1 hour';
        
        const [, amount, unit] = match;
        if (unit === 'H') {
            return `${amount} hour${amount === '1' ? '' : 's'}`;
        } else {
            return `${amount} minutes`;
        }
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners(modal, originalEvent, course, lesson) {
        const closeBtn = modal.querySelector('.calendar-close-btn');
        const cancelBtn = modal.querySelector('.calendar-cancel-btn');
        const saveBtn = modal.querySelector('#save-calendar-event');
        const updateBtn = modal.querySelector('#update-calendar-time');

        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Save event
        saveBtn.addEventListener('click', () => {
            this.saveCalendarEvent(originalEvent);
            closeModal();
        });

        // Update time
        updateBtn.addEventListener('click', () => {
            const dateInput = modal.querySelector('#calendar-date').value;
            const timeInput = modal.querySelector('#calendar-time').value;
            const durationInput = modal.querySelector('#calendar-duration').value;
            
            if (dateInput && timeInput) {
                const [hours, minutes] = timeInput.split(':');
                const newStartDate = new Date(`${dateInput}T${hours}:${minutes}:00`);
                const newEndDate = new Date(newStartDate.getTime());
                
                // Calculate end time based on duration
                const durationMatch = durationInput.match(/PT(\d+)([HM])/);
                if (durationMatch) {
                    const [, amount, unit] = durationMatch;
                    if (unit === 'H') {
                        newEndDate.setHours(newEndDate.getHours() + parseInt(amount));
                    } else {
                        newEndDate.setMinutes(newEndDate.getMinutes() + parseInt(amount));
                    }
                }
                
                // Update event
                originalEvent.startTime = newStartDate.toISOString().replace(/-|:|\.\d+/g, '');
                originalEvent.endTime = newEndDate.toISOString().replace(/-|:|\.\d+/g, '');
                originalEvent.duration = durationInput;
                
                // Update links
                modal.querySelectorAll('.calendar-option-btn').forEach(btn => {
                    if (btn.textContent.includes('Google')) {
                        btn.href = this.createGoogleCalendarUrl(originalEvent);
                    } else if (btn.textContent.includes('Outlook')) {
                        btn.href = this.createOutlookCalendarUrl(originalEvent);
                    } else if (btn.textContent.includes('Apple')) {
                        btn.href = this.createAppleCalendarFile(originalEvent);
                    }
                });
                
                // Update preview
                const preview = modal.querySelector('.event-preview');
                preview.querySelector('h4').textContent = originalEvent.title;
                preview.querySelectorAll('p')[1].innerHTML = `<strong>When:</strong> ${newStartDate.toLocaleString()}`;
                preview.querySelectorAll('p')[0].innerHTML = `<strong>Duration:</strong> ${this.formatDuration(durationInput)}`;
                
                this.showNotification('Calendar times updated!', 'info');
            }
        });
    }

    /**
     * Add modal styles to page
     */
    addModalStyles() {
        if (document.getElementById('calendar-styles')) return;

        const style = document.createElement('style');
        style.id = 'calendar-styles';
        style.textContent = `
            .calendar-picker-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }
            
            .calendar-picker-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                animation: slideUp 0.3s ease;
            }
            
            .calendar-picker-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .calendar-picker-header h3 {
                font-size: 1.25rem;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }
            
            .calendar-close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #6b7280;
                cursor: pointer;
                padding: 0.25rem;
                line-height: 1;
            }
            
            .calendar-picker-body {
                padding: 1.5rem;
            }
            
            .event-preview {
                background: #f9fafb;
                border-radius: 8px;
                padding: 1rem;
                border-left: 4px solid #6366f1;
            }
            
            .calendar-option-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.75rem 1rem;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.2s ease;
                text-align: center;
                border: 1px solid transparent;
            }
            
            .calendar-option-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .calendar-picker-footer {
                padding: 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .calendar-btn {
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                background: #10b981;
                color: white;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
                font-size: 0.875rem;
            }
            
            .calendar-btn:hover {
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
            }
            
            .calendar-btn-sm {
                padding: 0.375rem 0.75rem;
                font-size: 0.75rem;
            }
            
            .calendar-btn-outline {
                background: transparent;
                border: 1px solid #6366f1;
                color: #6366f1;
            }
            
            .calendar-btn-outline:hover {
                background: #6366f1;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Render calendar buttons on page
     */
    renderCalendarButtons() {
        // This will be called after courses are loaded
        setTimeout(() => {
            const courseCards = document.querySelectorAll('.course-card');
            courseCards.forEach(card => {
                const buttonContainer = card.querySelector('.calendar-button-container');
                if (!buttonContainer) {
                    const actionsDiv = card.querySelector('.actions') || card.querySelector('.course-card-meta');
                    if (actionsDiv) {
                        const calendarBtn = document.createElement('button');
                        calendarBtn.className = 'calendar-btn calendar-btn-sm mt-2';
                        calendarBtn.innerHTML = `
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Schedule Study
                        `;
                        
                        // Get course data from data attributes or nearby elements
                        const courseTitle = card.querySelector('.course-card-title')?.textContent || 'Course';
                        const courseId = card.getAttribute('data-course-id') || Date.now();
                        
                        calendarBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const course = {
                                id: courseId,
                                title: courseTitle,
                                description: card.querySelector('.course-card-description')?.textContent || ''
                            };
                            
                            const event = this.generateCalendarEvent(course);
                            this.showCalendarPicker(event, course);
                        });
                        
                        actionsDiv.appendChild(calendarBtn);
                    }
                }
            });
        }, 1000);
    }

    /**
     * Setup event listeners for existing buttons
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-calendar')) {
                e.preventDefault();
                const btn = e.target.closest('.add-to-calendar');
                const courseId = btn.getAttribute('data-course-id');
                const lessonId = btn.getAttribute('data-lesson-id');
                
                // This will be handled by the specific page's implementation
                console.log('Calendar button clicked:', courseId, lessonId);
            }
        });
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use existing notification system or create one
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white ${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        }
    }

    /**
     * Log calendar event for analytics
     */
    logCalendarEvent(event) {
        if (window.firebaseServices) {
            try {
                const userId = firebase.auth().currentUser?.uid;
                if (userId) {
                    firebaseServices.ref(firebaseServices.rtdb, `userAnalytics/${userId}/calendarEvents`).push({
                        ...event,
                        loggedAt: new Date().toISOString(),
                        userId: userId
                    });
                }
            } catch (error) {
                console.log('Failed to log calendar event:', error);
            }
        }
    }
}

// Initialize calendar integration
let calendarIntegration;

document.addEventListener('DOMContentLoaded', function() {
    calendarIntegration = new CalendarIntegration();
    
    // Make available globally
    window.calendarIntegration = calendarIntegration;
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarIntegration;
}