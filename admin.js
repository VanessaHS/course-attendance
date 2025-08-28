// Course Attendance System - Admin Interface
class AttendanceAdmin {
    constructor() {
        this.currentSession = null;
        this.refreshInterval = null;
        this.initializeAdmin();
        this.setupEventListeners();
        this.loadCurrentSession();
        this.loadSettings();
    }

    initializeAdmin() {
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('session-date').value = today;
        document.getElementById('history-date').value = today;
        
        // Initialize localStorage structure
        if (!localStorage.getItem('attendance_data')) {
            localStorage.setItem('attendance_data', JSON.stringify({}));
        }
        if (!localStorage.getItem('active_sessions')) {
            localStorage.setItem('active_sessions', JSON.stringify({}));
        }
        if (!localStorage.getItem('admin_settings')) {
            localStorage.setItem('admin_settings', JSON.stringify({
                anonymousMode: false,
                autoDelete: false
            }));
        }
    }

    setupEventListeners() {
        document.getElementById('generate-session-btn').addEventListener('click', () => this.generateNewSession());
        document.getElementById('end-session-btn').addEventListener('click', () => this.endCurrentSession());
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshLiveAttendance());
        document.getElementById('load-history-btn').addEventListener('click', () => this.loadAttendanceHistory());
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearOldData());
        
        // Manual check-out functionality
        document.getElementById('manual-checkout-btn').addEventListener('click', () => this.showManualCheckout());
        document.getElementById('confirm-manual-checkout').addEventListener('click', () => this.performManualCheckout());
        document.getElementById('cancel-manual-checkout').addEventListener('click', () => this.hideManualCheckout());
        
        // Settings
        document.getElementById('anonymous-mode').addEventListener('change', () => this.saveSettings());
        document.getElementById('auto-delete').addEventListener('change', () => this.saveSettings());
        
        // Auto-refresh every 30 seconds when session is active
        this.startAutoRefresh();
    }

    generateSessionCode() {
        // Generate a 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    generateNewSession() {
        const courseName = document.getElementById('course-name').value.trim();
        const sessionDate = document.getElementById('session-date').value;
        
        if (!courseName) {
            alert('Please enter a course name');
            return;
        }
        
        if (!sessionDate) {
            alert('Please select a session date');
            return;
        }
        
        // Generate unique session code
        let sessionCode;
        let attempts = 0;
        const activeSessions = JSON.parse(localStorage.getItem('active_sessions'));
        
        do {
            sessionCode = this.generateSessionCode();
            attempts++;
        } while (activeSessions[sessionCode] && attempts < 10);
        
        if (attempts >= 10) {
            alert('Unable to generate unique session code. Please try again.');
            return;
        }
        
        // Create session
        const session = {
            code: sessionCode,
            courseName: courseName,
            date: sessionDate,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).getTime(), // 8 hours from now
            active: true
        };
        
        // Save session
        activeSessions[sessionCode] = session;
        localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
        
        this.currentSession = session;
        this.displayCurrentSession();
        this.generateQRCode();
        this.refreshLiveAttendance();
        
        this.showMessage('New session created successfully!', 'success');
    }

    endCurrentSession() {
        if (!this.currentSession) {
            alert('No active session to end');
            return;
        }
        
        if (confirm('Are you sure you want to end the current session?')) {
            // Mark session as inactive
            const activeSessions = JSON.parse(localStorage.getItem('active_sessions'));
            if (activeSessions[this.currentSession.code]) {
                activeSessions[this.currentSession.code].active = false;
                activeSessions[this.currentSession.code].endedAt = new Date().toISOString();
                localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
            }
            
            this.currentSession = null;
            this.displayCurrentSession();
            document.getElementById('qr-display').style.display = 'none';
            // Hide the session banner
            document.getElementById('session-code-banner').style.display = 'none';
            
            this.showMessage('Session ended successfully', 'info');
        }
    }

    loadCurrentSession() {
        const activeSessions = JSON.parse(localStorage.getItem('active_sessions'));
        const today = new Date().toISOString().split('T')[0];
        
        // Find active session for today
        for (const [code, session] of Object.entries(activeSessions)) {
            if (session.active && session.date === today) {
                this.currentSession = session;
                this.displayCurrentSession();
                this.generateQRCode();
                break;
            }
        }
        
        this.refreshLiveAttendance();
    }

    displayCurrentSession() {
        const sessionInfo = document.getElementById('session-info');
        
        if (!this.currentSession) {
            sessionInfo.innerHTML = '<p>No active session</p>';
            // Hide the banner when no session
            document.getElementById('session-code-banner').style.display = 'none';
            return;
        }
        
        const createdTime = new Date(this.currentSession.createdAt).toLocaleString();
        const expiresTime = new Date(this.currentSession.expiresAt).toLocaleString();
        
        sessionInfo.innerHTML = `
            <div class="session-active">
                <p><strong>Course:</strong> ${this.currentSession.courseName}</p>
                <p><strong>Session Code:</strong> <code>${this.currentSession.code}</code></p>
                <p><strong>Date:</strong> ${this.currentSession.date}</p>
                <p><strong>Created:</strong> ${createdTime}</p>
                <p><strong>Expires:</strong> ${expiresTime}</p>
                <span class="status-indicator status-present">ACTIVE</span>
            </div>
        `;
    }

    generateQRCode() {
        if (!this.currentSession) return;
        
        const qrDisplay = document.getElementById('qr-display');
        const canvas = document.getElementById('qr-canvas');
        const sessionCodeSpan = document.getElementById('display-session-code');
        const expirySpan = document.getElementById('session-expiry');
        
        // Generate time-based rotation code (changes every 2 minutes)
        const now = new Date();
        const timeSlot = Math.floor(now.getTime() / (2 * 60 * 1000)); // 2-minute intervals
        const rotationCode = this.generateTimeBasedCode(timeSlot);
        
        // Create URL that includes session code and time-based rotation
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const qrData = `${baseUrl}?session=${this.currentSession.code}&rotation=${rotationCode}&timestamp=${timeSlot}`;
        
        // Generate QR code
        QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        sessionCodeSpan.textContent = `${this.currentSession.code}-${rotationCode}`;
        
        // Show next rotation time
        const nextRotation = new Date((timeSlot + 1) * 2 * 60 * 1000);
        expirySpan.textContent = `Next code: ${nextRotation.toLocaleTimeString()}`;
        
        // Update the prominent banner display
        this.updateSessionBanner(`${this.currentSession.code}-${rotationCode}`, nextRotation);
        
        qrDisplay.style.display = 'block';
        
        // Auto-refresh QR code every 2 minutes
        if (this.qrRefreshInterval) {
            clearTimeout(this.qrRefreshInterval);
        }
        
        const msUntilNext = nextRotation.getTime() - now.getTime();
        this.qrRefreshInterval = setTimeout(() => {
            this.generateQRCode();
        }, msUntilNext + 1000); // Add 1 second buffer
    }

    generateTimeBasedCode(timeSlot) {
        // Generate a 3-character code based on time slot and session
        const combined = `${this.currentSession.code}${timeSlot}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let absHash = Math.abs(hash);
        for (let i = 0; i < 3; i++) {
            code += chars[absHash % chars.length];
            absHash = Math.floor(absHash / chars.length);
        }
        return code;
    }

    updateSessionBanner(sessionCode, nextRotation) {
        const banner = document.getElementById('session-code-banner');
        const codeSpan = document.getElementById('banner-session-code');
        const rotationSpan = document.getElementById('banner-next-rotation');
        
        if (this.currentSession) {
            banner.style.display = 'block';
            codeSpan.textContent = sessionCode;
            rotationSpan.textContent = `Next rotation: ${nextRotation.toLocaleTimeString()}`;
        } else {
            banner.style.display = 'none';
        }
    }

    refreshLiveAttendance() {
        if (!this.currentSession) {
            document.getElementById('live-attendance-list').innerHTML = '<p>No active session</p>';
            this.updateStats(0, 0, '00:00');
            return;
        }
        
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const sessionData = attendanceData[this.currentSession.date]?.[this.currentSession.code];
        
        if (!sessionData || !sessionData.students) {
            document.getElementById('live-attendance-list').innerHTML = '<p>No students checked in yet</p>';
            this.updateStats(0, 0, '00:00');
            return;
        }
        
        let currentlyPresent = 0;
        let totalToday = 0;
        let attendanceHtml = '';
        
        const students = Object.entries(sessionData.students);
        totalToday = students.length;
        
        students.forEach(([studentId, data]) => {
            if (!data.checkIn) return;
            
            const checkInTime = new Date(data.checkIn);
            const checkOutTime = data.checkOut ? new Date(data.checkOut) : null;
            const isPresent = !checkOutTime;
            
            if (isPresent) currentlyPresent++;
            
            let duration = 'Present';
            if (checkOutTime) {
                const durationMs = checkOutTime.getTime() - checkInTime.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = `${hours}h ${minutes}m`;
            }
            
            attendanceHtml += `
                <div class="attendance-item">
                    <div class="student-info">
                        <div class="student-name">${studentId}</div>
                        <div class="student-times">
                            In: ${checkInTime.toLocaleTimeString()}
                            ${checkOutTime ? ` | Out: ${checkOutTime.toLocaleTimeString()}` : ''}
                        </div>
                    </div>
                    <div class="attendance-duration">${duration}</div>
                    <span class="status-indicator ${isPresent ? 'status-present' : 'status-left'}">
                        ${isPresent ? 'Present' : 'Left'}
                    </span>
                </div>
            `;
        });
        
        document.getElementById('live-attendance-list').innerHTML = attendanceHtml;
        
        // Calculate session duration
        const sessionStart = new Date(this.currentSession.createdAt);
        const now = new Date();
        const sessionDurationMs = now.getTime() - sessionStart.getTime();
        const sessionHours = Math.floor(sessionDurationMs / (1000 * 60 * 60));
        const sessionMinutes = Math.floor((sessionDurationMs % (1000 * 60 * 60)) / (1000 * 60));
        const sessionDuration = `${sessionHours.toString().padStart(2, '0')}:${sessionMinutes.toString().padStart(2, '0')}`;
        
        this.updateStats(currentlyPresent, totalToday, sessionDuration);
    }

    updateStats(present, total, duration) {
        document.getElementById('total-checked-in').textContent = present;
        document.getElementById('total-today').textContent = total;
        document.getElementById('session-duration').textContent = duration;
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (this.currentSession) {
                this.refreshLiveAttendance();
            }
        }, 30000); // Refresh every 30 seconds
    }

    loadAttendanceHistory() {
        const selectedDate = document.getElementById('history-date').value;
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }
        
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const dayData = attendanceData[selectedDate];
        
        const historyDiv = document.getElementById('attendance-history');
        
        if (!dayData) {
            historyDiv.innerHTML = '<p>No attendance data found for this date</p>';
            return;
        }
        
        let historyHtml = '';
        Object.entries(dayData).forEach(([sessionCode, sessionData]) => {
            const studentsCount = Object.keys(sessionData.students).length;
            
            historyHtml += `
                <div class="session-history">
                    <h4>${sessionData.sessionInfo.courseName} (${sessionCode})</h4>
                    <p>Students: ${studentsCount}</p>
                    <div class="student-list">
            `;
            
            Object.entries(sessionData.students).forEach(([studentId, data]) => {
                if (!data.checkIn) return;
                
                const checkIn = new Date(data.checkIn).toLocaleTimeString();
                const checkOut = data.checkOut ? new Date(data.checkOut).toLocaleTimeString() : 'Not checked out';
                
                historyHtml += `
                    <div class="history-student">
                        <strong>${studentId}</strong><br>
                        In: ${checkIn} | Out: ${checkOut}
                    </div>
                `;
            });
            
            historyHtml += '</div></div>';
        });
        
        historyDiv.innerHTML = historyHtml;
    }

    exportData() {
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        
        if (Object.keys(attendanceData).length === 0) {
            alert('No data to export');
            return;
        }
        
        // Convert to CSV format
        let csvContent = 'Date,Session Code,Course,Student ID,Check In,Check Out,Duration (minutes)\n';
        
        Object.entries(attendanceData).forEach(([date, dayData]) => {
            Object.entries(dayData).forEach(([sessionCode, sessionData]) => {
                Object.entries(sessionData.students).forEach(([studentId, data]) => {
                    if (!data.checkIn) return;
                    
                    const checkIn = data.checkIn;
                    const checkOut = data.checkOut || '';
                    
                    let duration = '';
                    if (data.checkOut) {
                        const durationMs = new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime();
                        duration = Math.round(durationMs / (1000 * 60)); // minutes
                    }
                    
                    csvContent += `${date},${sessionCode},${sessionData.sessionInfo.courseName},"${studentId}",${checkIn},${checkOut},${duration}\n`;
                });
            });
        });
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Data exported successfully!', 'success');
    }

    clearOldData() {
        if (!confirm('This will delete attendance data older than 90 days. Are you sure?')) {
            return;
        }
        
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffString = cutoffDate.toISOString().split('T')[0];
        
        let deletedCount = 0;
        Object.keys(attendanceData).forEach(date => {
            if (date < cutoffString) {
                delete attendanceData[date];
                deletedCount++;
            }
        });
        
        localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
        this.showMessage(`Deleted ${deletedCount} days of old attendance data`, 'info');
    }

    saveSettings() {
        const settings = {
            anonymousMode: document.getElementById('anonymous-mode').checked,
            autoDelete: document.getElementById('auto-delete').checked
        };
        
        localStorage.setItem('admin_settings', JSON.stringify(settings));
        this.showMessage('Settings saved', 'success');
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
        
        document.getElementById('anonymous-mode').checked = settings.anonymousMode || false;
        document.getElementById('auto-delete').checked = settings.autoDelete || false;
    }

    showManualCheckout() {
        if (!this.currentSession) {
            alert('No active session. Please start a session first.');
            return;
        }
        
        document.getElementById('manual-checkout-form').style.display = 'block';
        document.getElementById('checkout-student-id').focus();
    }

    hideManualCheckout() {
        document.getElementById('manual-checkout-form').style.display = 'none';
        document.getElementById('checkout-student-id').value = '';
    }

    performManualCheckout() {
        const studentId = document.getElementById('checkout-student-id').value.trim();
        
        if (!studentId) {
            alert('Please enter a student identifier');
            return;
        }
        
        if (!this.currentSession) {
            alert('No active session');
            return;
        }
        
        // Get attendance data
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const dateKey = this.currentSession.date;
        const sessionCode = this.currentSession.code;
        
        const studentData = attendanceData[dateKey]?.[sessionCode]?.students?.[studentId];
        
        if (!studentData || !studentData.checkIn) {
            alert('Student has not checked in yet');
            return;
        }
        
        if (studentData.checkOut) {
            alert('Student has already checked out');
            return;
        }
        
        if (confirm(`Are you sure you want to manually check out "${studentId}"?\n\nThis should only be used for students who forgot to check out or had technical issues.`)) {
            // Record manual check-out
            const now = new Date();
            attendanceData[dateKey][sessionCode].students[studentId].checkOut = now.toISOString();
            attendanceData[dateKey][sessionCode].students[studentId].manualCheckout = true;
            
            localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
            
            this.hideManualCheckout();
            this.refreshLiveAttendance();
            this.showMessage(`Manually checked out ${studentId} at ${now.toLocaleTimeString()}`, 'success');
        }
    }

    showMessage(message, type = 'info') {
        // Create temporary message div
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.className = `status-message ${type}`;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '1000';
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }
}

// Pre-fill session code from URL if present
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    if (sessionCode) {
        document.getElementById('session-code').value = sessionCode;
    }
    
    new AttendanceAdmin();
});
