// assets/js/journal.js

class LearningJournal {
    constructor() {
        this.userId = null;
        this.initialize();
    }

    async initialize() {
        // Wait for auth state
        if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
            firebaseServices.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.userId = user.uid;
                    this.checkForReflections();
                }
            });
        }
    }

    // Save reflection for a lesson
    async saveReflection(courseId, lessonId, reflectionText) {
        try {
            if (!this.userId) {
                throw new Error('User not authenticated');
            }

            const { ref, set } = firebaseServices;
            const journalRef = ref(firebaseServices.rtdb, `journals/${this.userId}/${courseId}/${lessonId}`);
            
            const reflectionData = {
                text: reflectionText,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                courseId: courseId,
                lessonId: lessonId,
                lessonTitle: document.getElementById('lesson-title')?.textContent || 'Untitled Lesson'
            };

            await set(journalRef, reflectionData);

            // Show success notification
            if (window.utils && window.utils.showNotification) {
                window.utils.showNotification('Reflection saved successfully!', 'success');
            }

            return reflectionData;
        } catch (error) {
            console.error('Error saving reflection:', error);
            if (window.utils && window.utils.showNotification) {
                window.utils.showNotification('Error saving reflection: ' + error.message, 'error');
            }
            throw error;
        }
    }

    // Get all reflections for a user
    async getAllReflections() {
        try {
            if (!this.userId) {
                return [];
            }

            const { ref, get } = firebaseServices;
            const journalRef = ref(firebaseServices.rtdb, `journals/${this.userId}`);
            const snapshot = await get(journalRef);

            if (!snapshot.exists()) {
                return [];
            }

            const reflections = [];
            const data = snapshot.val();

            // Flatten the nested structure
            for (const courseId in data) {
                for (const lessonId in data[courseId]) {
                    reflections.push({
                        id: `${courseId}_${lessonId}`,
                        courseId: courseId,
                        lessonId: lessonId,
                        ...data[courseId][lessonId]
                    });
                }
            }

            // Sort by date (newest first)
            return reflections.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            console.error('Error fetching reflections:', error);
            return [];
        }
    }

    // Get reflections for a specific course
    async getCourseReflections(courseId) {
        try {
            if (!this.userId) {
                return [];
            }

            const { ref, get } = firebaseServices;
            const journalRef = ref(firebaseServices.rtdb, `journals/${this.userId}/${courseId}`);
            const snapshot = await get(journalRef);

            if (!snapshot.exists()) {
                return [];
            }

            const reflections = [];
            const data = snapshot.val();

            for (const lessonId in data) {
                reflections.push({
                    id: `${courseId}_${lessonId}`,
                    lessonId: lessonId,
                    ...data[lessonId]
                });
            }

            return reflections.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            console.error('Error fetching course reflections:', error);
            return [];
        }
    }

    // Check if user has reflections and show reminder
    async checkForReflections() {
        try {
            const reflections = await this.getAllReflections();
            const lastReflection = reflections[0];
            
            if (!lastReflection) {
                // No reflections yet, maybe show a welcome tip
                return;
            }

            const lastDate = new Date(lastReflection.createdAt);
            const today = new Date();
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays >= 2) { // 2+ days since last reflection
                this.showReflectionReminder(diffDays);
            }
        } catch (error) {
            console.error('Error checking reflections:', error);
        }
    }

    showReflectionReminder(days) {
        const messages = [
            `It's been ${days} days since your last reflection. Want to jot down what you've learned recently?`,
            "Regular reflections help reinforce learning! Consider writing about your recent lessons.",
            "Your learning journey grows with reflection. Take a moment to think about your progress."
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];
        
        // Create a subtle notification
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(message, 'info');
        }
    }

    // Export reflections as text file
    exportToFile(reflections) {
        if (!reflections || reflections.length === 0) {
            if (window.utils && window.utils.showNotification) {
                window.utils.showNotification('No reflections to export', 'warning');
            }
            return;
        }

        let content = `# BYAMN Learning Journal\n`;
        content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

        reflections.forEach((reflection, index) => {
            content += `## Reflection ${index + 1}\n`;
            content += `Date: ${new Date(reflection.createdAt).toLocaleDateString()}\n`;
            content += `Course: ${reflection.courseId}\n`;
            content += `Lesson: ${reflection.lessonTitle || 'Untitled'}\n\n`;
            content += `${reflection.text}\n\n`;
            content += `---\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `byamn-journal-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Delete a reflection
    async deleteReflection(courseId, lessonId) {
        try {
            if (!this.userId) {
                throw new Error('User not authenticated');
            }

            const { ref, remove } = firebaseServices;
            const journalRef = ref(firebaseServices.rtdb, `journals/${this.userId}/${courseId}/${lessonId}`);
            await remove(journalRef);

            if (window.utils && window.utils.showNotification) {
                window.utils.showNotification('Reflection deleted successfully', 'success');
            }

            return true;
        } catch (error) {
            console.error('Error deleting reflection:', error);
            if (window.utils && window.utils.showNotification) {
                window.utils.showNotification('Error deleting reflection: ' + error.message, 'error');
            }
            throw error;
        }
    }

    // Get reflection for specific lesson
    async getLessonReflection(courseId, lessonId) {
        try {
            if (!this.userId) {
                return null;
            }

            const { ref, get } = firebaseServices;
            const journalRef = ref(firebaseServices.rtdb, `journals/${this.userId}/${courseId}/${lessonId}`);
            const snapshot = await get(journalRef);

            if (!snapshot.exists()) {
                return null;
            }

            return snapshot.val();
        } catch (error) {
            console.error('Error fetching lesson reflection:', error);
            return null;
        }
    }
}

// Initialize global journal instance
window.learningJournal = new LearningJournal();