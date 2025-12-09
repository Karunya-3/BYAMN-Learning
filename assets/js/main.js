function logActivity(activityData) {
    if (typeof firebaseServices !== 'undefined') {
        try {
            const { ref, push, set } = firebaseServices;
            const activityRef = push(ref('activities'));
            const activity = {
                ...activityData,
                timestamp: new Date().toISOString()
            };
            set(activityRef, activity);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}

// 🌐 Language/Locale Detection System
class LanguageDetector {
    constructor() {
        this.supportedLanguages = {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어',
            'ar': 'العربية',
            'hi': 'हिन्दी'
        };
        
        this.welcomeMessages = {
            'en': 'Welcome! Start your journey today.',
            'es': '¡Bienvenido! Comienza tu viaje hoy.',
            'fr': 'Bienvenue ! Commencez votre voyage aujourd\'hui.',
            'de': 'Willkommen! Beginnen Sie heute Ihre Reise.',
            'it': 'Benvenuto! Inizia il tuo viaggio oggi.',
            'pt': 'Bem-vindo! Comece sua jornada hoje.',
            'ru': 'Добро пожаловать! Начните свое путешествие сегодня.',
            'zh': '欢迎！今天就开始您的旅程。',
            'ja': 'ようこそ！今日から旅を始めましょう。',
            'ko': '환영합니다! 오늘부터 여정을 시작하세요.',
            'ar': 'مرحبًا! ابدأ رحلتك اليوم.',
            'hi': 'स्वागत है! आज ही अपनी यात्रा शुरू करें।'
        };
        
        this.defaultLanguage = 'en';
        this.currentLanguage = this.detectLanguage();
    }
    
    // Auto-detect browser language
    detectLanguage() {
        let browserLang = navigator.language || navigator.userLanguage;
        
        // Extract language code (e.g., "en-US" -> "en")
        if (browserLang && browserLang.includes('-')) {
            browserLang = browserLang.split('-')[0];
        }
        
        // Check if detected language is supported
        if (browserLang && this.supportedLanguages[browserLang]) {
            return browserLang;
        }
        
        // Check for language variations
        if (browserLang === 'zh-CN' || browserLang === 'zh-TW') {
            return 'zh';
        }
        
        return this.defaultLanguage;
    }
    
    // Get welcome message in user's language
    getWelcomeMessage() {
        return this.welcomeMessages[this.currentLanguage] || this.welcomeMessages[this.defaultLanguage];
    }
    
    // Get all supported languages
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    // Set language manually
    setLanguage(langCode) {
        if (this.supportedLanguages[langCode]) {
            this.currentLanguage = langCode;
            this.saveLanguagePreference();
            this.applyLanguage();
            return true;
        }
        return false;
    }
    
    // Save language preference to localStorage
    saveLanguagePreference() {
        try {
            localStorage.setItem('preferredLanguage', this.currentLanguage);
        } catch (e) {
            console.warn('Could not save language preference:', e);
        }
    }
    
    // Load saved language preference
    loadLanguagePreference() {
        try {
            const savedLang = localStorage.getItem('preferredLanguage');
            if (savedLang && this.supportedLanguages[savedLang]) {
                this.currentLanguage = savedLang;
                return true;
            }
        } catch (e) {
            console.warn('Could not load language preference:', e);
        }
        return false;
    }
    
    // Apply language to the page
    applyLanguage() {
        // Update welcome message if element exists
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement) {
            welcomeElement.textContent = this.getWelcomeMessage();
        }
        
        // Update page title based on language
        this.updatePageTitle();
        
        // Dispatch event for other components to update
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
        
        // Log language detection activity
        this.logLanguageDetection();
    }
    
    // Update page title based on language
    updatePageTitle() {
        const titles = {
            'en': 'Welcome to Our Platform',
            'es': 'Bienvenido a Nuestra Plataforma',
            'fr': 'Bienvenue sur Notre Plateforme',
            'de': 'Willkommen auf unserer Plattform',
            'it': 'Benvenuto nella Nostra Piattaforma',
            'pt': 'Bem-vindo à Nossa Plataforma',
            'ru': 'Добро пожаловать на нашу платформу',
            'zh': '欢迎来到我们的平台',
            'ja': '私たちのプラットフォームへようこそ',
            'ko': '우리 플랫폼에 오신 것을 환영합니다',
            'ar': 'مرحبًا بك في منصتنا',
            'hi': 'हमारे प्लेटफ़ॉर्म में आपका स्वागत है'
        };
        
        const title = titles[this.currentLanguage] || titles[this.defaultLanguage];
        if (title && document.title.includes('Welcome')) {
            document.title = title;
        }
    }
    
    // Log language detection for analytics
    logLanguageDetection() {
        const activityData = {
            type: 'language_detected',
            language: this.currentLanguage,
            browserLanguage: navigator.language,
            userAgent: navigator.userAgent
        };
        logActivity(activityData);
    }
    
    // Initialize language system
    initialize() {
        // Load saved preference first
        const hasSavedPref = this.loadLanguagePreference();
        
        // If no saved preference, auto-detect
        if (!hasSavedPref) {
            this.currentLanguage = this.detectLanguage();
        }
        
        // Apply language immediately
        this.applyLanguage();
    }
}

// Initialize language detector globally
window.languageDetector = new LanguageDetector();

// Initialize PrintUtils
let printUtils = null;

function initPrintUtils() {
    if (typeof PrintUtils !== 'undefined') {
        printUtils = new PrintUtils();
        console.log('Print utilities initialized');
        
        // Add print buttons to course player if it exists
        setTimeout(addPrintButtonsToCoursePlayer, 1000);
        
        // Add print button to dashboard if it exists
        setTimeout(addPrintButtonsToDashboard, 1000);
    }
}

function addPrintButtonsToCoursePlayer() {
    const lessonInfoSection = document.querySelector('.lesson-info');
    if (lessonInfoSection) {
        // Add print notes button
        const printNotesBtn = document.createElement('button');
        printNotesBtn.className = 'btn btn-outline print-btn';
        printNotesBtn.innerHTML = `
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Notes
        `;
        printNotesBtn.onclick = printCurrentLessonNotes;
        
        const actionsDiv = lessonInfoSection.querySelector('.actions');
        if (actionsDiv) {
            actionsDiv.appendChild(printNotesBtn);
        }
    }
}

function addPrintButtonsToDashboard() {
    const dashboardStats = document.querySelector('.stats-grid');
    if (dashboardStats && printUtils) {
        const printDashboardBtn = document.createElement('button');
        printDashboardBtn.className = 'btn btn-outline print-btn mt-4';
        printDashboardBtn.innerHTML = `
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Dashboard Summary
        `;
        printDashboardBtn.onclick = printDashboardSummary;
        
        dashboardStats.parentNode.insertBefore(printDashboardBtn, dashboardStats.nextSibling);
    }
}

function printCurrentLessonNotes() {
    if (!printUtils) {
        alert('Print utilities not loaded');
        return;
    }
    
    const lessonData = {
        title: document.getElementById('lesson-title')?.textContent || 'Current Lesson',
        description: document.getElementById('lesson-description')?.textContent || 'No description available',
        courseTitle: document.querySelector('.course-card-title')?.textContent || 'Current Course',
        duration: document.getElementById('lesson-duration')?.textContent || 'N/A'
    };
    
    printUtils.printLessonNotes(lessonData);
}

function printDashboardSummary() {
    if (!printUtils) {
        alert('Print utilities not loaded');
        return;
    }
    
    // Get user data from auth
    if (typeof firebase !== 'undefined' && firebase.auth()) {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Please login to print dashboard');
            return;
        }
        
        const userData = {
            displayName: user.displayName,
            email: user.email
        };
        
        // Get analytics data from dashboard
        const analytics = {
            totalStudyTime: parseInt(document.getElementById('study-time')?.textContent?.replace(/[^0-9]/g, '') || 0) * 3600,
            lessonsCompleted: parseInt(document.getElementById('lessons-completed')?.textContent || 0),
            coursesCompleted: parseInt(document.getElementById('completed-count')?.textContent || 0),
            currentStreak: parseInt(document.getElementById('learning-streak')?.textContent || 0),
            longestStreak: parseInt(document.getElementById('learning-streak')?.textContent || 0) // Simplified
        };
        
        printUtils.printDashboardSummary(userData, analytics);
    } else {
        alert('Firebase not available. Please login first.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 🌐 Initialize language detection system
    window.languageDetector.initialize();

    // ✅ Redirect to home when clicking logo  
    const logoElement = document.getElementById('site-logo');
    if (logoElement) {
        logoElement.addEventListener('click', function () {
            window.location.href = './index.html';
        });
    }

    // Theme toggle elements
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    // Mobile menu elements
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // User action elements
    const userActionsDesktop = document.getElementById('user-actions-desktop');
    const userActionsMobile = document.getElementById('user-actions-mobile');

    // Set initial theme to light mode only
    function initTheme() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    function toggleTheme() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    function toggleMobileMenu() {
        if (mobileMenu) {
            mobileMenu.classList.toggle('hidden');
        }
    }

    // Initialize streak system when user logs in
    function initializeUserStreakSystem(user) {
        if (user) {
            // Small delay to ensure other systems are initialized
            setTimeout(() => {
                if (typeof window.initializeStreakManager === 'function') {
                    window.initializeStreakManager();
                }
            }, 2000);
        }
    }

    // Create language selector dropdown
    function createLanguageSelector(container, isMobile = false) {
        if (!container) return;
        
        // Clear any existing language selector
        const existingSelector = container.querySelector('#language-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        if (isMobile) {
            // Mobile version - simple select
            const languageHTML = `
                <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700" id="language-selector">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Language</span>
                        <select class="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                onchange="window.languageDetector.setLanguage(this.value)">
                            ${Object.entries(window.languageDetector.supportedLanguages).map(([code, name]) => `
                                <option value="${code}" ${window.languageDetector.currentLanguage === code ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', languageHTML);
        } else {
            // Desktop version - dropdown
            const languageHTML = `
                <div class="relative group" id="language-selector">
                    <button class="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span class="text-sm font-medium">${window.languageDetector.currentLanguage.toUpperCase()}</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-50">
                        <div class="py-1">
                            ${Object.entries(window.languageDetector.supportedLanguages).map(([code, name]) => `
                                <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${window.languageDetector.currentLanguage === code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}"
                                        onclick="window.languageDetector.setLanguage('${code}')">
                                    <span>${name}</span>
                                    ${window.languageDetector.currentLanguage === code ? 
                                        '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : 
                                        ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('afterbegin', languageHTML);
        }
    }

    // Update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./dashboard.html" class="btn btn-primary">Dashboard</a>
                    <button id="logout-btn" class="btn btn-outline">Logout</button>
                `;
                createLanguageSelector(userActionsDesktop, false);
                
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function() {
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => window.location.href = './index.html')
                                .catch((error) => utils.showNotification('Logout failed: ' + error.message, 'error'));
                        }
                    });
                }
            }

            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./dashboard.html" class="block w-full text-center btn btn-primary mb-2">Dashboard</a>
                    <button id="mobile-logout-btn" class="block w-full text-center btn btn-outline mb-2">Logout</button>
                `;
                createLanguageSelector(userActionsMobile, true);
                
                const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
                if (mobileLogoutBtn) {
                    mobileLogoutBtn.addEventListener('click', function() {
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => window.location.href = './index.html')
                                .catch((error) => utils.showNotification('Logout failed: ' + error.message, 'error'));
                        }
                    });
                }
            }

            // Initialize streak system for logged-in users
            initializeUserStreakSystem(user);
        } else {
            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./auth/login.html" class="btn btn-outline">Login</a>
                    <a href="./auth/register.html" class="btn btn-primary">Get Started</a>
                `;
                createLanguageSelector(userActionsDesktop, false);
            }
            
            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./auth/login.html" class="block w-full text-center btn btn-outline mb-2">Login</a>
                    <a href="./auth/register.html" class="block w-full text-center btn btn-primary mb-2">Get Started</a>
                `;
                createLanguageSelector(userActionsMobile, true);
            }
        }
        
        // Listen for language changes to update UI
        document.addEventListener('languageChanged', function(e) {
            const welcomeElement = document.getElementById('welcome-message');
            if (welcomeElement) {
                welcomeElement.textContent = window.languageDetector.getWelcomeMessage();
            }
            
            // Update language selector indicators
            const langButtons = document.querySelectorAll('[onclick*="setLanguage"]');
            langButtons.forEach(btn => {
                const match = btn.onclick.toString().match(/setLanguage\('([^']+)'\)/);
                if (match && match[1] === e.detail.language) {
                    btn.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
                } else {
                    btn.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400');
                }
            });
            
            // Update select dropdowns
            const langSelects = document.querySelectorAll('select[onchange*="setLanguage"]');
            langSelects.forEach(select => {
                select.value = e.detail.language;
            });
            
            // Update language code display
            const langCodeSpans = document.querySelectorAll('#language-selector span.text-sm.font-medium');
            langCodeSpans.forEach(span => {
                span.textContent = e.detail.language.toUpperCase();
            });
        });
    }

    initTheme();

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', toggleMobileMenu);

    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.classList.contains('hidden') &&
            !mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
        firebaseServices.onAuthStateChanged(updateAuthUI);
    } else {
        // Initialize UI without Firebase for non-auth pages
        updateAuthUI(null);
    }
    
    // Load PrintUtils script
    const script = document.createElement('script');
    script.src = 'assets/js/print-utils.js';
    script.onload = initPrintUtils;
    document.head.appendChild(script);
});

// text animation
function textAnimation(){
    const texts = ['Create' , 'Build' , 'Lead' ,'Succeed' , 'Grow']; 
    let count = 0;
    let index = 0; 
    let currentText = "";
    let letter = "";

    function type(){
        if(count === texts.length){
            count = 0;
        }
        currentText = texts[count];
        letter = currentText.slice(0 , ++index);
        const textElement = document.getElementById("text");
        if (textElement) {
            textElement.textContent = letter;
        }
        if(letter.length === currentText.length){
            count++;
            index = 0; 
            setTimeout(type , 1500); //pause 
        }else{
            setTimeout(type , 120);
        }
    }
    
    // Only start animation if element exists
    if (document.getElementById("text")) {
        type();
    }
}

// Initialize text animation when DOM is loaded
document.addEventListener('DOMContentLoaded', textAnimation);

// Utility functions
function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-6 right-6 px-6 py-4 rounded-xl shadow-xl z-50 max-w-sm ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    } text-white transform transition-all duration-300 ease-out opacity-0 translate-y-2`;
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="pr-4">${message}</div>
            <button id="notification-close" class="text-lg hover:text-gray-200 transition-colors">×</button>
        </div>`;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-y-2');
        notification.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    notification.querySelector('#notification-close').addEventListener('click', () => {
        notification.classList.remove('opacity-100', 'translate-y-0');
        notification.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('opacity-100', 'translate-y-0');
            notification.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function timeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    
    if (seconds < 60) {
        return 'just now';
    }
    
    const units = [
        [31536000, "year"],
        [2592000, "month"], 
        [86400, "day"],
        [3600, "hour"], 
        [60, "minute"]
    ];
    
    for (const [sec, name] of units) {
        const val = Math.floor(seconds / sec);
        if (val >= 1) {
            return val === 1 ? `1 ${name} ago` : `${val} ${name}s ago`;
        }
    }
    
    return Math.floor(seconds) + " seconds ago";
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Safely export utilities
if (typeof window !== 'undefined') {
    window.utils = { 
        showNotification, 
        formatDate, 
        formatNumber, 
        timeAgo, 
        debounce 
    };
}

// Chart utility functions
function generateBarChart(data, labels, colors, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48 text-gray-400">
                <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p class="text-sm">No data available</p>
            </div>
        `;
        return;
    }
    
    const maxValue = Math.max(...data, 1);
    let chartHTML = `<div class="flex items-end justify-between h-48 px-2 space-x-1">`;
    
    data.forEach((value, index) => {
        const heightPercent = Math.max((value / maxValue) * 90, 4); // Minimum 4% height
        const label = labels && labels[index] ? labels[index] : `Item ${index + 1}`;
        const color = colors && colors[index] ? colors[index] : 'bg-indigo-500';
        
        chartHTML += `
            <div class="flex flex-col items-center flex-1">
                <div class="flex flex-col items-center justify-end w-full h-full">
                    <div class="w-3/4 ${color} rounded-t-md transition-all duration-300 hover:opacity-80" 
                         style="height: ${heightPercent}%" 
                         title="${label}: ${value}">
                        <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            ${value}
                        </div>
                    </div>
                </div>
                <div class="mt-2 text-center w-full">
                    <p class="text-xs font-medium text-gray-900 truncate">${value}</p>
                    <p class="text-xs text-gray-500 truncate" title="${label}">${label}</p>
                </div>
            </div>
        `;
    });
    
    chartHTML += `</div>`;
    container.innerHTML = chartHTML;
}

function generateLineChart(data, labels, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48 text-gray-400">
                <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <p class="text-sm">No data available</p>
            </div>
        `;
        return;
    }
    
    // Simple SVG line chart implementation
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue;
    const width = container.clientWidth || 400;
    const height = 200;
    const padding = 40;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    
    // Generate SVG path
    let pathData = '';
    data.forEach((value, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
        const y = padding + plotHeight - ((value - minValue) / range) * plotHeight;
        
        if (index === 0) {
            pathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }
    });
    
    const svgHTML = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="w-full">
            <!-- Grid lines -->
            <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#grid)"/>
            
            <!-- Line chart -->
            <path d="${pathData}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Data points -->
            ${data.map((value, index) => {
                const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
                const y = padding + plotHeight - ((value - minValue) / range) * plotHeight;
                return `<circle cx="${x}" cy="${y}" r="4" fill="#4f46e5" stroke="white" stroke-width="2"/>`;
            }).join('')}
            
            <!-- X-axis labels -->
            ${labels && labels.map((label, index) => {
                const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
                return `<text x="${x}" y="${height - 5}" text-anchor="middle" class="text-xs fill-gray-500">${label}</text>`;
            }).join('')}
        </svg>
    `;
    
    container.innerHTML = svgHTML;
}

// Safely export chart utilities
if (typeof window !== 'undefined') {
    window.chartUtils = { 
        generateBarChart, 
        generateLineChart 
    };
}

// Fix logo path depending on folder depth
function fixLogoPath() {
    const logoLink = document.getElementById("logoLink");
    const logoImg = document.getElementById("siteLogo");
    
    if (!logoLink || !logoImg) return;
    
    const path = window.location.pathname;
    
    if (path.includes("/auth/")) {
        // inside /auth/ folder
        logoLink.href = "../index.html";
        logoImg.src = "../logo.png";
    } else if (path.includes("/dashboard") || path.includes("/profile") || path.includes("/settings")) {
        // inside other subfolders (adjust as needed)
        logoLink.href = "./index.html";
        logoImg.src = "./logo.png";
    } else {
        // root pages
        logoLink.href = "./index.html";
        logoImg.src = "./logo.png";
    }
    
    // Add error handling for broken images
    logoImg.onerror = function() {
        console.warn('Logo image failed to load, using fallback');
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjN0Y0NkU1IiByeD0iOCIvPgo8dGV4dCB4PSIyMCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj5Mb2dvPC90ZXh0Pgo8L3N2Zz4K';
    };
}

// Initialize logo path fix when DOM is loaded
document.addEventListener('DOMContentLoaded', fixLogoPath);
