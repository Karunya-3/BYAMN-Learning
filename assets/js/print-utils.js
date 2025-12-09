// print-utils.js
// Print utilities for BYAMN platform

class PrintUtils {
    constructor() {
        this.printStyles = `
            @media print {
                /* Hide unnecessary elements */
                header, 
                footer, 
                .user-controls,
                .theme-toggle,
                .btn:not(.print-btn),
                .video-section,
                .mobile-menu-button,
                #logout-btn,
                #mobile-menu,
                nav,
                .hero,
                .feature-card,
                .stats-grid,
                .verification-form,
                .search-bar,
                .category-filters,
                #sort-options {
                    display: none !important;
                }

                /* Print-specific styling */
                body {
                    background: white !important;
                    color: black !important;
                    font-size: 12pt !important;
                    line-height: 1.6 !important;
                    margin: 0 !important;
                    padding: 20px !important;
                }

                .print-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* Keep headings readable */
                h1, h2, h3, h4, h5, h6 {
                    color: black !important;
                    page-break-after: avoid;
                    page-break-inside: avoid;
                }

                h1 { font-size: 24pt !important; margin-bottom: 20px !important; }
                h2 { font-size: 18pt !important; margin: 15px 0 10px 0 !important; }
                h3 { font-size: 16pt !important; margin: 12px 0 8px 0 !important; }

                /* Links should be visible */
                a {
                    color: #0000EE !important;
                    text-decoration: underline !important;
                }

                a::after {
                    content: " (" attr(href) ")";
                    font-size: 10pt;
                    color: #666;
                }

                /* Lists */
                ul, ol {
                    margin: 10px 0 !important;
                    padding-left: 30px !important;
                }

                li {
                    margin: 5px 0 !important;
                    page-break-inside: avoid;
                }

                /* Code blocks */
                code, pre {
                    background: #f5f5f5 !important;
                    border: 1px solid #ddd !important;
                    border-radius: 3px !important;
                    font-family: 'Courier New', monospace !important;
                    padding: 2px 4px !important;
                    page-break-inside: avoid;
                }

                pre {
                    padding: 10px !important;
                    margin: 10px 0 !important;
                    overflow-wrap: break-word !important;
                    white-space: pre-wrap !important;
                }

                /* Tables */
                table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    page-break-inside: avoid;
                }

                th, td {
                    border: 1px solid #000 !important;
                    padding: 8px !important;
                    text-align: left !important;
                }

                th {
                    background: #f0f0f0 !important;
                    font-weight: bold !important;
                }

                /* Images */
                img {
                    max-width: 100% !important;
                    height: auto !important;
                    page-break-inside: avoid;
                }

                /* Page breaks */
                .page-break {
                    page-break-before: always;
                }

                .avoid-break {
                    page-break-inside: avoid;
                }

                /* Print header */
                .print-header {
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }

                .print-header img {
                    height: 60px;
                    width: auto;
                }

                .print-footer {
                    text-align: center;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                    margin-top: 20px;
                    font-size: 10pt;
                    color: #666;
                }

                /* Course notes specific */
                .lesson-notes {
                    border: 1px solid #ddd;
                    padding: 15px;
                    margin: 15px 0;
                    background: #f9f9f9;
                }

                .notes-timestamp {
                    font-size: 10pt;
                    color: #666;
                    margin-bottom: 10px;
                }

                /* Progress report */
                .progress-summary {
                    border: 2px solid #000;
                    padding: 20px;
                    margin: 20px 0;
                }

                .progress-bar-print {
                    height: 20px;
                    background: #f0f0f0;
                    border: 1px solid #000;
                    margin: 10px 0;
                    position: relative;
                }

                .progress-fill-print {
                    height: 100%;
                    background: #4f46e5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 10pt;
                }
            }

            @page {
                margin: 0.5in;
                @top-center {
                    content: "BYAMN Learning Platform";
                    font-size: 10pt;
                    color: #666;
                }
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10pt;
                    color: #666;
                }
            }
        `;
    }

    /**
     * Print lesson notes
     * @param {Object} lessonData - Lesson information
     * @param {Array} notes - Array of user notes
     */
    printLessonNotes(lessonData, notes = []) {
        const printContent = this.generateLessonNotesHTML(lessonData, notes);
        this.printContent(printContent, `BYAMN - ${lessonData.title} Notes`);
    }

    /**
     * Print course progress report
     * @param {Object} courseData - Course information
     * @param {Object} progressData - Progress data
     */
    printProgressReport(courseData, progressData) {
        const printContent = this.generateProgressReportHTML(courseData, progressData);
        this.printContent(printContent, `BYAMN - ${courseData.title} Progress Report`);
    }

    /**
     * Print user dashboard summary
     * @param {Object} userData - User information
     * @param {Object} analytics - Analytics data
     */
    printDashboardSummary(userData, analytics) {
        const printContent = this.generateDashboardSummaryHTML(userData, analytics);
        this.printContent(printContent, `BYAMN - Learning Dashboard Summary`);
    }

    /**
     * Generate HTML for lesson notes
     */
    generateLessonNotesHTML(lessonData, notes) {
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="print-container">
                <div class="print-header">
                    <h1>BYAMN Learning Platform</h1>
                    <h2>Lesson Notes: ${lessonData.title}</h2>
                    <p>Printed on: ${date}</p>
                    <p>Course: ${lessonData.courseTitle || 'N/A'}</p>
                    <p>Duration: ${lessonData.duration || 'N/A'}</p>
                </div>

                <div class="lesson-content">
                    <h3>Lesson Description</h3>
                    <p>${lessonData.description || 'No description available'}</p>

                    ${lessonData.youtubeUrl ? `
                        <div class="lesson-resources">
                            <h3>Lesson Resources</h3>
                            <p><strong>YouTube URL:</strong> ${lessonData.youtubeUrl}</p>
                        </div>
                    ` : ''}

                    <div class="user-notes-section">
                        <h3>Your Notes</h3>
                        ${notes.length > 0 ? this.renderNotesList(notes) : `
                            <p>No notes added yet.</p>
                        `}
                    </div>

                    <div class="notes-template">
                        <h3>Notes Template</h3>
                        <div class="lesson-notes avoid-break">
                            <h4>Key Points:</h4>
                            <ul>
                                <li>[Add your key takeaways here]</li>
                                <li>[Important concepts to remember]</li>
                                <li>[Questions to research later]</li>
                            </ul>
                            
                            <h4>Action Items:</h4>
                            <ul>
                                <li>[Practice exercises to complete]</li>
                                <li>[Resources to review]</li>
                                <li>[Projects to start]</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="print-footer">
                    <p>BYAMN Learning Platform - Empowering learners worldwide</p>
                    <p>https://byamn.vercel.app</p>
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML for progress report
     */
    generateProgressReportHTML(courseData, progressData) {
        const completionDate = progressData.completedAt 
            ? new Date(progressData.completedAt).toLocaleDateString()
            : 'In Progress';

        const lessonsCompleted = progressData.completedLessons?.length || 0;
        const totalLessons = courseData.lessons?.length || 1;
        const progressPercent = Math.round((lessonsCompleted / totalLessons) * 100);

        return `
            <div class="print-container">
                <div class="print-header">
                    <h1>BYAMN Learning Platform</h1>
                    <h2>Course Progress Report</h2>
                    <p>Printed on: ${new Date().toLocaleDateString()}</p>
                </div>

                <div class="course-info">
                    <h3>Course Information</h3>
                    <table>
                        <tr>
                            <th>Course Title:</th>
                            <td>${courseData.title}</td>
                        </tr>
                        <tr>
                            <th>Category:</th>
                            <td>${courseData.category || 'N/A'}</td>
                        </tr>
                        <tr>
                            <th>Difficulty:</th>
                            <td>${courseData.difficulty || 'N/A'}</td>
                        </tr>
                        <tr>
                            <th>Instructor:</th>
                            <td>${courseData.instructor || 'N/A'}</td>
                        </tr>
                        <tr>
                            <th>Enrollment Date:</th>
                            <td>${progressData.enrolledAt ? new Date(progressData.enrolledAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    </table>
                </div>

                <div class="progress-summary">
                    <h3>Progress Summary</h3>
                    
                    <div class="progress-details">
                        <table>
                            <tr>
                                <th>Total Lessons:</th>
                                <td>${totalLessons}</td>
                            </tr>
                            <tr>
                                <th>Lessons Completed:</th>
                                <td>${lessonsCompleted}</td>
                            </tr>
                            <tr>
                                <th>Progress:</th>
                                <td>${progressPercent}%</td>
                            </tr>
                            <tr>
                                <th>Status:</th>
                                <td>${progressPercent === 100 ? 'Completed' : 'In Progress'}</td>
                            </tr>
                            ${progressData.completedAt ? `
                                <tr>
                                    <th>Completion Date:</th>
                                    <td>${completionDate}</td>
                                </tr>
                            ` : ''}
                        </table>

                        <div class="progress-visualization">
                            <h4>Progress Visualization</h4>
                            <div class="progress-bar-print">
                                <div class="progress-fill-print" style="width: ${progressPercent}%">
                                    ${progressPercent}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                ${lessonsCompleted > 0 ? `
                    <div class="completed-lessons">
                        <h3>Completed Lessons</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Lesson Title</th>
                                    <th>Completed Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderCompletedLessons(progressData.completedLessons || [], courseData.lessons || [])}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${progressData.certificateId ? `
                    <div class="certificate-info">
                        <h3>Certificate Information</h3>
                        <table>
                            <tr>
                                <th>Certificate ID:</th>
                                <td>${progressData.certificateId}</td>
                            </tr>
                            <tr>
                                <th>Verification URL:</th>
                                <td>https://byamn.vercel.app/verification.html?certId=${progressData.certificateId}</td>
                            </tr>
                        </table>
                    </div>
                ` : ''}

                <div class="print-footer">
                    <p>BYAMN Learning Platform - Empowering learners worldwide</p>
                    <p>https://byamn.vercel.app | Certificate Verification: https://byamn.vercel.app/verification.html</p>
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML for dashboard summary
     */
    generateDashboardSummaryHTML(userData, analytics) {
        const studyTimeHours = Math.round((analytics.totalStudyTime || 0) / 3600);
        const avgStudyTime = Math.round((analytics.avgStudyTimePerDay || 0) / 60);

        return `
            <div class="print-container">
                <div class="print-header">
                    <h1>BYAMN Learning Platform</h1>
                    <h2>Learning Dashboard Summary</h2>
                    <p>Printed on: ${new Date().toLocaleDateString()}</p>
                    <p>User: ${userData.displayName || userData.email}</p>
                </div>

                <div class="learning-statistics">
                    <h3>Learning Statistics</h3>
                    <table>
                        <tr>
                            <th>Total Study Time:</th>
                            <td>${studyTimeHours} hours</td>
                        </tr>
                        <tr>
                            <th>Average Daily Study:</th>
                            <td>${avgStudyTime} minutes</td>
                        </tr>
                        <tr>
                            <th>Lessons Completed:</th>
                            <td>${analytics.lessonsCompleted || 0}</td>
                        </tr>
                        <tr>
                            <th>Courses Completed:</th>
                            <td>${analytics.coursesCompleted || 0}</td>
                        </tr>
                        <tr>
                            <th>Current Learning Streak:</th>
                            <td>${analytics.currentStreak || 0} days</td>
                        </tr>
                        <tr>
                            <th>Longest Learning Streak:</th>
                            <td>${analytics.longestStreak || 0} days</td>
                        </tr>
                    </table>
                </div>

                ${analytics.favoriteCategories && Object.keys(analytics.favoriteCategories).length > 0 ? `
                    <div class="category-analysis">
                        <h3>Favorite Categories</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Engagement Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderCategoryAnalysis(analytics.favoriteCategories)}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div class="achievements-summary">
                    <h3>Achievements Summary</h3>
                    ${analytics.achievements && Object.keys(analytics.achievements).length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Achievement</th>
                                    <th>Earned On</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderAchievements(analytics.achievements)}
                            </tbody>
                        </table>
                    ` : `
                        <p>No achievements earned yet. Keep learning!</p>
                    `}
                </div>

                <div class="study-recommendations">
                    <h3>Study Recommendations</h3>
                    <div class="recommendation-list">
                        <ul>
                            <li>Maintain your current learning streak of ${analytics.currentStreak || 0} days</li>
                            <li>Complete at least one lesson daily to improve consistency</li>
                            <li>Review your favorite categories for related courses</li>
                            <li>Set a goal to complete one course this month</li>
                        </ul>
                    </div>
                </div>

                <div class="print-footer">
                    <p>BYAMN Learning Platform - Empowering learners worldwide</p>
                    <p>https://byamn.vercel.app | Keep learning, keep growing!</p>
                </div>
            </div>
        `;
    }

    /**
     * Render notes list
     */
    renderNotesList(notes) {
        return notes.map((note, index) => `
            <div class="lesson-notes ${index > 0 ? 'page-break-before' : ''}">
                <div class="notes-timestamp">
                    Note #${index + 1} - ${note.timestamp ? new Date(note.timestamp).toLocaleString() : 'No date'}
                </div>
                <div class="notes-content">
                    ${note.content || 'No content'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render completed lessons
     */
    renderCompletedLessons(completedLessonIds, allLessons) {
        const lessonMap = {};
        allLessons.forEach(lesson => {
            lessonMap[lesson.id] = lesson;
        });

        return completedLessonIds.map((lessonId, index) => {
            const lesson = lessonMap[lessonId] || { title: `Lesson ${index + 1}` };
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${lesson.title}</td>
                    <td>${lesson.completedDate || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render category analysis
     */
    renderCategoryAnalysis(favoriteCategories) {
        return Object.entries(favoriteCategories)
            .sort((a, b) => b[1] - a[1])
            .map(([category, score]) => `
                <tr>
                    <td>${category}</td>
                    <td>${score}</td>
                </tr>
            `).join('');
    }

    /**
     * Render achievements
     */
    renderAchievements(achievements) {
        return Object.entries(achievements)
            .map(([achievementId, achievement]) => `
                <tr>
                    <td>${achievement.name || achievementId}</td>
                    <td>${achievement.earnedDate ? new Date(achievement.earnedDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `).join('');
    }

    /**
     * Print content with styles
     */
    printContent(content, title = 'BYAMN Print') {
        // Create print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print.');
            return;
        }

        // Add print styles and content
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>${this.printStyles}</style>
                <style>
                    body { font-family: Arial, sans-serif; }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    // Auto print after loading
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            // Close window after printing
                            setTimeout(() => window.close(), 500);
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    /**
     * Print current page (simplified version)
     */
    printCurrentPage() {
        window.print();
    }
    

    /**
     * Save as PDF (using browser's print to PDF)
     */
    saveAsPDF(content, filename = 'byamn-document.pdf') {
        // For actual PDF generation, you would need a PDF library
        // This method uses browser's print to PDF feature
        const printContent = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                ${content}
            </div>
        `;
        this.printContent(printContent, filename);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintUtils;
} else {
    window.PrintUtils = PrintUtils;
}