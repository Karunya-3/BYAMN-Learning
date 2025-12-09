/**
 * Export study schedule as CSV/ICS
 */
class CalendarExport {
    static exportToCSV() {
        const events = JSON.parse(localStorage.getItem('byamn_calendar_events') || '[]');
        
        if (events.length === 0) {
            alert('No study sessions to export');
            return;
        }
        
        const headers = ['Title', 'Date', 'Time', 'Duration', 'Course', 'Description'];
        const csvRows = [headers.join(',')];
        
        events.forEach(event => {
            const date = new Date(event.startTime);
            const row = [
                `"${event.title}"`,
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                event.duration,
                `"${event.courseData?.title || 'N/A'}"`,
                `"${event.description.replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `byamn-study-schedule-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    static exportToICS() {
        const events = JSON.parse(localStorage.getItem('byamn_calendar_events') || '[]');
        
        if (events.length === 0) {
            alert('No study sessions to export');
            return;
        }
        
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//BYAMN Learning//Study Schedule//EN',
            'CALSCALE:GREGORIAN'
        ];
        
        events.forEach((event, index) => {
            icsContent.push(
                'BEGIN:VEVENT',
                `UID:byamn-${event.id}-${index}`,
                `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}`,
                `DTSTART:${event.startTime}`,
                `DTEND:${event.endTime}`,
                `SUMMARY:${event.title}`,
                `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
                `LOCATION:${event.location}`,
                'END:VEVENT'
            );
        });
        
        icsContent.push('END:VCALENDAR');
        
        const icsData = icsContent.join('\n');
        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `byamn-study-schedule.ics`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Add export buttons to dashboard
document.addEventListener('DOMContentLoaded', function() {
    const calendarEventsContainer = document.getElementById('calendar-events-container');
    
    if (calendarEventsContainer) {
        const events = JSON.parse(localStorage.getItem('byamn_calendar_events') || '[]');
        
        if (events.length > 0) {
            const exportDiv = document.createElement('div');
            exportDiv.className = 'mt-4 pt-4 border-t border-gray-200';
            exportDiv.innerHTML = `
                <p class="text-sm font-medium text-gray-700 mb-2">Export Schedule:</p>
                <div class="flex space-x-2">
                    <button id="export-csv-btn" class="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
                        📊 Export as CSV
                    </button>
                    <button id="export-ics-btn" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">
                        📅 Export as ICS
                    </button>
                </div>
            `;
            
            calendarEventsContainer.appendChild(exportDiv);
            
            document.getElementById('export-csv-btn').addEventListener('click', CalendarExport.exportToCSV);
            document.getElementById('export-ics-btn').addEventListener('click', CalendarExport.exportToICS);
        }
    }
});