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
        
        // Start boundary-aligned refresh system
        this.startBoundaryScheduler();
        
        // Add window focus/blur handling for better performance
        this.setupWindowEventHandlers();
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
        
        // Start boundary-aligned refresh system for this session
        this.startBoundaryScheduler();
        
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
            
            // Stop all refresh intervals
            this.stopAllRefreshIntervals();
            
            console.log('🛑 Session ended - all refresh intervals stopped');
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
                
                // Start boundary-aligned refresh for existing session
                this.startBoundaryScheduler();
                console.log('🔄 Resumed session with boundary-aligned refresh');
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

    async generateQRCode() {
        if (!this.currentSession) return;
        
        const qrDisplay = document.getElementById('qr-display');
        const canvas = document.getElementById('qr-canvas');
        const sessionCodeSpan = document.getElementById('display-session-code');
        const expirySpan = document.getElementById('session-expiry');
        
        // Ensure QRCode library is available
        try {
            await this.loadQRCodeLibIfNeeded();
        } catch (e) {
            console.error('Failed to load QRCode library:', e);
            return;
        }
        
        // Compute current slot and visual rotating code (changes every 2 minutes)
        const now = new Date();
        const timeSlot = Math.floor(now.getTime() / (2 * 60 * 1000)); // 2-minute intervals
        const visualCode = this.generateVisualCode(this.currentSession.code, timeSlot);
        
        // Stateless payload embedded in QR
        const payload = {
            v: 1,
            code: this.currentSession.code,
            date: this.currentSession.date,
            expiresAt: this.currentSession.expiresAt,
            rotation: visualCode, // expose the visual code students see
            slot: timeSlot,
            course: this.currentSession.courseName
        };
        const payloadB64 = btoa(JSON.stringify(payload));
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const qrData = `${baseUrl}?p=${encodeURIComponent(payloadB64)}`;
        
        // Generate QR code
        QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        sessionCodeSpan.textContent = `${visualCode}`;
        
        // Show next rotation time
        const nextRotation = new Date((timeSlot + 1) * 2 * 60 * 1000);
        expirySpan.textContent = `Next code: ${nextRotation.toLocaleTimeString()}`;
        
        // Update the prominent banner display
        this.updateSessionBanner(`${visualCode}`, nextRotation);
        
        qrDisplay.style.display = 'block';
        
        // Log QR code generation for debugging
        console.log(`🎯 QR Code generated: ${visualCode} (expires ${nextRotation.toLocaleTimeString()})`);
        
        // No individual timeouts - master refresh handles this
    }

    loadQRCodeLibIfNeeded() {
        return new Promise((resolve, reject) => {
            if (typeof QRCode !== 'undefined') {
                resolve();
                return;
            }
            // Attempt to find existing script tag
            const existing = Array.from(document.scripts).find(s => s.src && s.src.includes('qrcode'));
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error('Existing QRCode script failed to load')));
                return;
            }
            // Inject script dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load QRCode script'));
            document.head.appendChild(script);
        });
    }

    generateVisualCode(baseCode, slot) {
        // Deterministic 6-char code based on baseCode and slot
        const combined = `${baseCode}:${slot}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash |= 0;
        }
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let value = Math.abs(hash);
        for (let i = 0; i < 6; i++) {
            code += chars[value % chars.length];
            value = Math.floor(value / chars.length) ^ (value << 1);
            value = Math.abs(value);
        }
        return code;
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
        const slotIndexSpan = document.getElementById('slot-index');
        const slotRotationSpan = document.getElementById('slot-rotation');
        const lastRenderedSpan = document.getElementById('last-rendered');
        
        if (this.currentSession) {
            banner.style.display = 'block';
            codeSpan.textContent = sessionCode;
            rotationSpan.textContent = `Next rotation: ${nextRotation.toLocaleTimeString()}`;
            if (typeof this.currentSlot !== 'undefined') {
                slotIndexSpan.textContent = `slot=${this.currentSlot}`;
            }
            if (this.currentRotationCode) {
                slotRotationSpan.textContent = `rot=${this.currentRotationCode}`;
            }
            if (typeof this.lastRenderedSlot !== 'undefined') {
                lastRenderedSpan.textContent = `last=${this.lastRenderedSlot}`;
            }
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

    startBoundaryScheduler() {
        // Clear any existing intervals
        this.stopAllRefreshIntervals();
        
        const scheduleNext = () => {
            if (!this.currentSession || !this.currentSession.active) return;
            const now = Date.now();
            const slotMs = 2 * 60 * 1000; // 2 minutes
            const nextBoundary = Math.ceil(now / slotMs) * slotMs;
            const delay = Math.max(0, nextBoundary - now + 50); // small buffer
            
            this.boundaryTimeout = setTimeout(() => {
                this.performBoundaryRefresh();
                scheduleNext();
            }, delay);
            
            // Also refresh attendance every 20s for live view
            this.liveInterval = setInterval(() => {
                if (this.currentSession && this.currentSession.active) {
                    this.refreshLiveAttendance();
                }
            }, 20000);
            console.log('⏱️ Boundary scheduler armed. Next in', Math.round(delay/1000), 's');
        };
        
        // Do an initial refresh now, then arm the boundary scheduler
        this.performBoundaryRefresh();
        scheduleNext();
    }

    stopAllRefreshIntervals() {
        // Clear all possible intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        if (this.qrRefreshInterval) {
            clearTimeout(this.qrRefreshInterval);
            this.qrRefreshInterval = null;
        }
        if (this.qrAutoRefreshInterval) {
            clearInterval(this.qrAutoRefreshInterval);
            this.qrAutoRefreshInterval = null;
        }
        if (this.masterRefreshInterval) {
            clearInterval(this.masterRefreshInterval);
            this.masterRefreshInterval = null;
        }
        if (this.backupCheckInterval) {
            clearInterval(this.backupCheckInterval);
            this.backupCheckInterval = null;
        }
        if (this.boundaryTimeout) {
            clearTimeout(this.boundaryTimeout);
            this.boundaryTimeout = null;
        }
        if (this.liveInterval) {
            clearInterval(this.liveInterval);
            this.liveInterval = null;
        }
        
        console.log('🛑 All refresh intervals cleared');
    }

    performBoundaryRefresh() {
        if (!this.currentSession || !this.currentSession.active) return;
        
        // Compute current slot and rotation
        const now = Date.now();
        const slotMs = 2 * 60 * 1000;
        const slot = Math.floor(now / slotMs);
        this.currentSlot = slot;
        const rotation = this.generateVisualCode(this.currentSession.code, slot);
        this.currentRotationCode = rotation; // now equals the full visual code
        
        // Only re-render if slot changed
        if (this.lastRenderedSlot !== slot) {
            this.generateQRCode();
            this.refreshLiveAttendance();
            this.lastRenderedSlot = slot;
        }
        
        // Update banner with details each tick
        const nextRotation = new Date((slot + 1) * slotMs);
        this.updateSessionBanner(`${rotation}`, nextRotation);
        this.showRefreshIndicator();
        console.log('✅ Boundary refresh executed at', new Date().toLocaleTimeString());
    }

    showRefreshIndicator() {
        const banner = document.getElementById('session-code-banner');
        const refreshStatus = document.getElementById('refresh-status');
        
        if (banner && refreshStatus) {
            // Update refresh indicator
            const now = new Date();
            const refreshText = document.querySelector('.refresh-text');
            if (refreshText) {
                refreshText.textContent = `Last refresh: ${now.toLocaleTimeString()}`;
                
                // Reset text after 3 seconds
                setTimeout(() => {
                    refreshText.textContent = 'Auto-refreshing every 10s';
                }, 3000);
            }
            
            // Add brief visual feedback to banner
            banner.style.boxShadow = '0 8px 32px rgba(46, 204, 113, 0.4)';
            setTimeout(() => {
                banner.style.boxShadow = '0 8px 32px rgba(66, 153, 225, 0.3)';
            }, 500);
        }
    }

    setupWindowEventHandlers() {
        // Reduce refresh frequency when window loses focus
        window.addEventListener('focus', () => {
            console.log('👁️ Window focused - resuming normal refresh');
            if (this.currentSession) {
                // Re-arm boundary scheduler instead of calling removed master refresh
                this.startBoundaryScheduler();
            }
        });

        window.addEventListener('blur', () => {
            console.log('😴 Window blurred - reducing refresh frequency');
            // Don't completely stop, just reduce frequency when not viewing
        });

        // Handle page visibility changes (mobile, tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('🙈 Page hidden - pausing refresh');
                // Pause refresh to save resources
            } else {
                console.log('👀 Page visible - resuming refresh');
                if (this.currentSession && this.currentSession.active) {
                    // Force immediate refresh when coming back
                    setTimeout(() => this.performBoundaryRefresh(), 500);
                }
            }
        });
    }

    // Backup refresh mechanism in case master refresh fails
    ensureRefreshIsRunning() {
        if (this.currentSession && this.currentSession.active && !this.masterRefreshInterval) {
            console.log('⚠️ Detected missing refresh interval - restarting');
            this.startMasterRefresh();
        }
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

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    new AttendanceAdmin();
});
