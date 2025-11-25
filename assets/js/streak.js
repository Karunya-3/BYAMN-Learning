// assets/js/streak.js

class LearningStreakManager {
    constructor() {
        this.currentStreak = 0;
        this.longestStreak = 0;
        this.lastLearningDate = null;
        this.streakData = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.loadStreakData();
            await this.checkAndUpdateStreak();
            this.isInitialized = true;
            console.log('Streak manager initialized successfully');
        } catch (error) {
            console.error('Error initializing streak manager:', error);
            this.initializeDefaultStreak();
        }
    }

    // Load streak data from Firebase or localStorage
    async loadStreakData() {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user logged in, skipping streak initialization');
            this.initializeDefaultStreak();
            return;
        }

        try {
            // Try to load from Firebase first
            if (window.firebaseServices && window.firebaseServices.getUserAnalytics) {
                try {
                    const analytics = await window.firebaseServices.getUserAnalytics(user.uid);
                    if (analytics && analytics.streakData) {
                        this.streakData = analytics.streakData;
                        this.updateLocalStreakData();
                        console.log('Streak data loaded from Firebase');
                        return;
                    }
                } catch (firebaseError) {
                    console.warn('Failed to load from Firebase, trying localStorage:', firebaseError);
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem(`streak_${user.uid}`);
            if (localData) {
                this.streakData = JSON.parse(localData);
                this.updateLocalStreakData();
                console.log('Streak data loaded from localStorage');
            } else {
                // Initialize new streak data
                this.initializeDefaultStreak();
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
            this.initializeDefaultStreak();
        }
    }

    // Initialize new streak data structure
    initializeStreakData() {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastLearningDate: null,
            learningHistory: [],
            totalLearningDays: 0,
            streakStartDate: null,
            lastUpdated: new Date().toISOString()
        };
    }

    // Update local variables from streak data
    updateLocalStreakData() {
        if (!this.streakData) return;
        
        this.currentStreak = this.streakData.currentStreak || 0;
        this.longestStreak = this.streakData.longestStreak || 0;
        this.lastLearningDate = this.streakData.lastLearningDate;
    }

    // Check and update streak based on today's activity
    async checkAndUpdateStreak() {
        const today = this.getTodayDateString();
        
        // If no last learning date, initialize with today
        if (!this.lastLearningDate) {
            this.currentStreak = 1;
            this.lastLearningDate = today;
            this.streakData.currentStreak = 1;
            this.streakData.lastLearningDate = today;
            this.streakData.streakStartDate = today;
            this.addToLearningHistory(today);
            await this.saveStreakData();
            return;
        }

        // Check if user already learned today
        if (this.lastLearningDate === today) {
            console.log('Already learned today, streak maintained');
            return;
        }

        const yesterday = this.getPreviousDay(today);
        
        if (this.lastLearningDate === yesterday) {
            // Continue streak
            this.currentStreak++;
            console.log(`Streak continued: ${this.currentStreak} days`);
        } else {
            // Broken streak - check if it's been more than 1 day
            const daysMissed = this.getDaysBetweenDates(this.lastLearningDate, today);
            if (daysMissed > 1) {
                console.log(`Streak broken after ${this.currentStreak} days. Missed ${daysMissed - 1} days`);
                if (this.currentStreak > this.longestStreak) {
                    this.longestStreak = this.currentStreak;
                }
                this.currentStreak = 1; // Start new streak
                this.streakData.streakStartDate = today;
            } else {
                // Just one day missed, continue streak
                this.currentStreak++;
                console.log(`Missed one day but streak continued: ${this.currentStreak} days`);
            }
        }

        // Update streak data
        this.lastLearningDate = today;
        this.streakData.currentStreak = this.currentStreak;
        this.streakData.longestStreak = Math.max(this.longestStreak, this.currentStreak);
        this.streakData.lastLearningDate = today;

        // Add to learning history
        this.addToLearningHistory(today);

        // Save updated data
        await this.saveStreakData();

        // Show streak motivation if streak increased
        if (this.currentStreak > 1) {
            this.showStreakMotivation();
        }
    }

    // Get days between two dates
    getDaysBetweenDates(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Get today's date in YYYY-MM-DD format
    getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    // Record learning activity
    async recordLearningActivity(duration = 0) {
        if (!this.isInitialized) {
            await this.init();
        }

        await this.checkAndUpdateStreak();
        
        // Update today's learning duration
        const today = this.getTodayDateString();
        const todayIndex = this.streakData.learningHistory.findIndex(day => day.date === today);
        
        if (todayIndex !== -1) {
            this.streakData.learningHistory[todayIndex].duration += duration;
            this.streakData.learningHistory[todayIndex].lessonsCompleted += 1;
        } else {
            this.streakData.learningHistory.push({
                date: today,
                duration: duration,
                lessonsCompleted: 1
            });
        }

        // Update total learning days
        this.streakData.totalLearningDays = this.streakData.learningHistory.length;

        await this.saveStreakData();
        
        console.log(`Learning activity recorded: ${duration} seconds, streak: ${this.currentStreak} days`);
    }

    // Add day to learning history
    addToLearningHistory(date) {
        const existingDay = this.streakData.learningHistory.find(day => day.date === date);
        
        if (!existingDay) {
            this.streakData.learningHistory.push({
                date: date,
                duration: 0,
                lessonsCompleted: 0
            });
            
            // Keep only last 365 days of history
            if (this.streakData.learningHistory.length > 365) {
                this.streakData.learningHistory = this.streakData.learningHistory.slice(-365);
            }
            
            this.streakData.totalLearningDays = this.streakData.learningHistory.length;
        }
    }

    // Get previous day
    getPreviousDay(dateString) {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    // Save streak data to Firebase and localStorage
    async saveStreakData() {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.warn('No user logged in, cannot save streak data');
            return;
        }

        this.streakData.lastUpdated = new Date().toISOString();

        try {
            // Save to localStorage
            localStorage.setItem(`streak_${user.uid}`, JSON.stringify(this.streakData));

            // Save to Firebase if available
            if (window.firebaseServices && window.firebaseServices.updateDoc) {
                try {
                    const userAnalyticsRef = window.firebaseServices.doc(
                        window.firebaseServices.db, 
                        'userAnalytics', 
                        user.uid
                    );
                    
                    await window.firebaseServices.updateDoc(userAnalyticsRef, {
                        streakData: this.streakData,
                        lastUpdated: new Date().toISOString()
                    });
                    console.log('Streak data saved to Firebase');
                } catch (firebaseError) {
                    console.warn('Failed to save to Firebase, using localStorage only:', firebaseError);
                }
            }
        } catch (error) {
            console.error('Error saving streak data:', error);
        }
    }

    // Get streak statistics
    getStreakStats() {
        if (!this.streakData) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalLearningDays: 0,
                streakStartDate: null,
                learningHistory: []
            };
        }

        return {
            currentStreak: this.currentStreak,
            longestStreak: this.longestStreak,
            totalLearningDays: this.streakData.totalLearningDays || 0,
            streakStartDate: this.streakData.streakStartDate,
            learningHistory: this.streakData.learningHistory || [],
            lastUpdated: this.streakData.lastUpdated
        };
    }

    // Get motivational message based on streak
    getMotivationalMessage() {
        const messages = {
            1: "Great start! Learning something new every day builds powerful habits. 🚀",
            2: "Two days in a row! You're building momentum. Keep going! 💪",
            3: "3-day streak! You're forming a solid learning routine. 🌟",
            5: "5 days! You're becoming a consistent learner. Amazing work! 🎯",
            7: "One week streak! You've built a strong learning habit. 🏆",
            14: "Two weeks! Your dedication is inspiring. Keep crushing it! 🔥",
            21: "21 days! You've officially formed a learning habit. Legend! ⚡",
            30: "30 DAY STREAK! You're a learning machine! Incredible! 🎉",
            50: "50 days! You're in the top 1% of consistent learners! 🌈",
            100: "100 DAY STREAK! You're a learning superstar! Unstoppable! 💎"
        };

        // Exact match
        if (messages[this.currentStreak]) {
            return messages[this.currentStreak];
        }

        // Milestone approaching
        const milestones = [7, 14, 21, 30, 50, 100];
        const nextMilestone = milestones.find(m => m > this.currentStreak);
        
        if (nextMilestone) {
            const daysToGo = nextMilestone - this.currentStreak;
            if (daysToGo <= 3) {
                return `Only ${daysToGo} day${daysToGo > 1 ? 's' : ''} until your ${nextMilestone}-day streak! Keep going! 🎯`;
            }
        }

        // Generic encouragement based on streak length
        if (this.currentStreak >= 50) {
            return "You're an inspiration! Your consistency is remarkable. 🌟";
        } else if (this.currentStreak >= 30) {
            return "Incredible dedication! You're mastering the art of consistency. 💎";
        } else if (this.currentStreak >= 14) {
            return "Outstanding commitment! Your learning habit is strong. 🔥";
        } else if (this.currentStreak >= 7) {
            return "Great work! You're building a powerful learning routine. ⚡";
        } else if (this.currentStreak >= 3) {
            return "Keep it up! You're developing a valuable habit. 💪";
        }

        // Random generic encouragement
        const genericMessages = [
            "Keep the streak alive! Every day counts. 🌟",
            "Your consistency is paying off! 🚀",
            "Learning every day is the secret to mastery. 💪",
            "You're building an incredible skill - consistency! 🔥",
            "The compound effect of daily learning is powerful! ⚡"
        ];

        return genericMessages[Math.floor(Math.random() * genericMessages.length)];
    }

    // Show streak motivation notification
    showStreakMotivation() {
        if (this.currentStreak <= 1) return;

        const message = this.getMotivationalMessage();
        
        // Show browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Learning Streak Update!', {
                body: message,
                icon: '/logo.png'
            });
        }

        // Show in-app notification
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(message, 'success');
        }

        console.log(`Streak motivation: ${message}`);
    }

    // Get weekly learning pattern
    getWeeklyPattern() {
        const history = this.streakData?.learningHistory || [];
        const last7Days = this.getLastNDays(7);
        
        const weeklyData = last7Days.map(day => {
            const dayData = history.find(d => d.date === day.date);
            return {
                day: day.dayName,
                date: day.date,
                learned: !!dayData && (dayData.duration > 0 || dayData.lessonsCompleted > 0),
                duration: dayData?.duration || 0,
                lessonsCompleted: dayData?.lessonsCompleted || 0
            };
        });

        return weeklyData;
    }

    // Get last N days with day names
    getLastNDays(n) {
        const days = [];
        for (let i = n - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en', { weekday: 'short' });
            days.push({ date: dateString, dayName });
        }
        return days;
    }

    // Get current streak progress (0-100)
    getStreakProgress() {
        const nextMilestone = this.getNextMilestone();
        if (!nextMilestone) return 100;
        
        return Math.min(100, Math.round((this.currentStreak / nextMilestone) * 100));
    }

    // Get next milestone
    getNextMilestone() {
        const milestones = [3, 7, 14, 21, 30, 50, 100];
        return milestones.find(m => m > this.currentStreak) || 100;
    }

    // Initialize default streak when no data exists
    initializeDefaultStreak() {
        this.streakData = this.initializeStreakData();
        this.updateLocalStreakData();
        console.log('Default streak data initialized');
    }

    // Reset streak (for testing purposes)
    resetStreak() {
        this.streakData = this.initializeStreakData();
        this.updateLocalStreakData();
        this.saveStreakData();
        console.log('Streak reset');
    }

    // Check if user learned today
    hasLearnedToday() {
        const today = this.getTodayDateString();
        return this.lastLearningDate === today;
    }

    // Get today's learning activity
    getTodaysActivity() {
        const today = this.getTodayDateString();
        return this.streakData?.learningHistory.find(day => day.date === today) || {
            date: today,
            duration: 0,
            lessonsCompleted: 0
        };
    }
}

// Initialize streak manager
let streakManager = null;

function initializeStreakManager() {
    if (!streakManager) {
        streakManager = new LearningStreakManager();
        window.streakManager = streakManager;
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    return streakManager;
}

// Export for use in other files
window.initializeStreakManager = initializeStreakManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase auth to be ready
    setTimeout(() => {
        if (firebase.auth().currentUser) {
            initializeStreakManager();
        }
    }, 1000);
});