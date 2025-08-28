// Course Attendance System - Student Interface
class AttendanceApp {
    constructor() {
        this.initializeApp();
        this.setupEventListeners();
        this.loadTodayAttendance();
    }

    initializeApp() {
        // Set today's date for session lookup
        this.today = new Date().toISOString().split('T')[0];
        
        // Initialize localStorage structure if needed
        if (!localStorage.getItem('attendance_data')) {
            localStorage.setItem('attendance_data', JSON.stringify({}));
        }
    }

    setupEventListeners() {
        const checkInBtn = document.getElementById('check-in-btn');
        const checkOutBtn = document.getElementById('check-out-btn');
        
        // Add both click and touchstart for better mobile support
        checkInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.checkIn();
        });
        
        checkOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.checkOut();
        });
        
        // Also handle Enter key press in form fields
        document.getElementById('student-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('session-code').focus();
            }
        });
        
        document.getElementById('session-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkIn();
            }
        });
        
        // Debug toggle button
        document.getElementById('toggle-debug-btn').addEventListener('click', () => {
            this.toggleDebugInfo();
        });
        
        // Auto-refresh attendance summary every 30 seconds
        setInterval(() => this.loadTodayAttendance(), 30000);
    }

    toggleDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        const debugContent = document.getElementById('debug-content');
        const toggleBtn = document.getElementById('toggle-debug-btn');
        
        if (debugInfo.style.display === 'none') {
            debugInfo.style.display = 'block';
            toggleBtn.textContent = '🙈 Hide Debug Info';
            
            // Update debug content
            const debugData = {
                'Browser': navigator.userAgent,
                'Screen Size': `${screen.width}x${screen.height}`,
                'Viewport': `${window.innerWidth}x${window.innerHeight}`,
                'Touch Support': 'ontouchstart' in window ? 'Yes' : 'No',
                'Local Storage': typeof Storage !== "undefined" ? 'Available' : 'Not Available',
                'Current URL': window.location.href,
                'Timestamp': new Date().toLocaleString()
            };
            
            let debugHTML = '<div style="font-family: monospace; font-size: 12px;">';
            Object.entries(debugData).forEach(([key, value]) => {
                debugHTML += `<p><strong>${key}:</strong> ${value}</p>`;
            });
            debugHTML += '</div>';
            
            debugContent.innerHTML = debugHTML;
        } else {
            debugInfo.style.display = 'none';
            toggleBtn.textContent = '🔍 Show Debug Info';
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('status-message');
        messageDiv.textContent = message;
        messageDiv.className = `status-message ${type}`;
        messageDiv.style.display = 'block';
        
        // Scroll message into view for mobile
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Also log to console for debugging
        console.log(`Attendance App [${type}]: ${message}`);
        
        // Auto-hide after 7 seconds (longer for mobile users)
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 7000);
    }

    validateInputs() {
        const studentId = document.getElementById('student-id').value.trim();
        const sessionCode = document.getElementById('session-code').value.trim();
        
        if (!studentId) {
            this.showMessage('Please enter your Student ID number', 'error');
            return false;
        }
        
        // Basic Student ID validation (alphanumeric)
        if (!/^[0-9A-Za-z]+$/.test(studentId)) {
            this.showMessage('Student ID should contain only letters and numbers', 'error');
            return false;
        }
        
        if (!sessionCode) {
            this.showMessage('Please enter the session code', 'error');
            return false;
        }
        
        return { studentId, sessionCode };
    }

    validateSession(sessionCode, isCheckOut = false) {
        // Parse session code (might include rotation code)
        const parts = sessionCode.split('-');
        const baseSessionCode = parts[0];
        const providedRotationCode = parts[1];
        
        // Get active sessions from localStorage
        const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
        const session = activeSessions[baseSessionCode];
        
        if (!session) {
            this.showMessage('Invalid session code. Please check with your instructor.', 'error');
            return false;
        }
        
        // Check if session is expired
        const now = new Date().getTime();
        if (session.expiresAt && now > session.expiresAt) {
            this.showMessage('This session has expired. Please get a new code from your instructor.', 'error');
            return false;
        }
        
        // Check if session is for today
        if (session.date !== this.today) {
            this.showMessage('This session code is not for today\'s class.', 'error');
            return false;
        }
        
        // For check-in, allow current and previous time slot (in case of timing issues)
        // For check-out, require current time slot validation
        if (providedRotationCode) {
            const currentTimeSlot = Math.floor(now / (2 * 60 * 1000)); // 2-minute intervals
            const previousTimeSlot = currentTimeSlot - 1;
            
            const currentRotationCode = this.generateTimeBasedCode(baseSessionCode, currentTimeSlot);
            const previousRotationCode = this.generateTimeBasedCode(baseSessionCode, previousTimeSlot);
            
            if (isCheckOut) {
                // For check-out, require current time slot (stricter validation)
                if (providedRotationCode !== currentRotationCode) {
                    this.showMessage('Check-out code has expired. Please scan the current QR code displayed in class.', 'error');
                    return false;
                }
            } else {
                // For check-in, allow current or previous time slot
                if (providedRotationCode !== currentRotationCode && providedRotationCode !== previousRotationCode) {
                    this.showMessage('Session code has expired. Please scan the current QR code.', 'error');
                    return false;
                }
            }
        }
        
        return session;
    }

    generateTimeBasedCode(sessionCode, timeSlot) {
        // Generate a 3-character code based on time slot and session
        const combined = `${sessionCode}${timeSlot}`;
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

    checkIn() {
        try {
            console.log('Check-in attempt started');
            
            const inputs = this.validateInputs();
            if (!inputs) {
                console.log('Input validation failed');
                return;
            }
            
            console.log('Inputs validated:', inputs);
            
            const { studentId, sessionCode } = inputs;
            const session = this.validateSession(sessionCode);
            if (!session) {
                console.log('Session validation failed');
                return;
            }
            
            console.log('Session validated:', session);
        
        // Get attendance data
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const dateKey = this.today;
        
        if (!attendanceData[dateKey]) {
            attendanceData[dateKey] = {};
        }
        
        if (!attendanceData[dateKey][sessionCode]) {
            attendanceData[dateKey][sessionCode] = {
                sessionInfo: session,
                students: {}
            };
        }
        
        const studentData = attendanceData[dateKey][sessionCode].students[studentId];
        
        // Check if already checked in and not checked out
        if (studentData && studentData.checkIn && !studentData.checkOut) {
            this.showMessage('You are already checked in! Use "Check Out" when leaving.', 'info');
            return;
        }
        
        // Record check-in
        const now = new Date();
        if (!attendanceData[dateKey][sessionCode].students[studentId]) {
            attendanceData[dateKey][sessionCode].students[studentId] = {};
        }
        
        attendanceData[dateKey][sessionCode].students[studentId].checkIn = now.toISOString();
        attendanceData[dateKey][sessionCode].students[studentId].checkOut = null;
        
        localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
        
        console.log('Check-in successful');
        this.showMessage(`✅ Successfully checked in at ${now.toLocaleTimeString()}`, 'success');
        this.loadTodayAttendance();
        
        } catch (error) {
            console.error('Check-in error:', error);
            this.showMessage(`Error during check-in: ${error.message}. Please try again.`, 'error');
        }
    }

    checkOut() {
        const inputs = this.validateInputs();
        if (!inputs) return;
        
        const { studentId, sessionCode } = inputs;
        
        // Parse session code for base session
        const parts = sessionCode.split('-');
        const baseSessionCode = parts[0];
        
        // Validate session with strict check-out validation
        const session = this.validateSession(sessionCode, true);
        if (!session) return;
        
        // Get attendance data
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const dateKey = this.today;
        
        const studentData = attendanceData[dateKey]?.[baseSessionCode]?.students?.[studentId];
        
        if (!studentData || !studentData.checkIn) {
            this.showMessage('You must check in first before checking out.', 'error');
            return;
        }
        
        if (studentData.checkOut) {
            this.showMessage('You have already checked out for this session.', 'info');
            return;
        }
        
        // Prevent immediate check-out (must wait at least 5 minutes after check-in)
        const checkInTime = new Date(studentData.checkIn);
        const now = new Date();
        const timeSinceCheckIn = now.getTime() - checkInTime.getTime();
        const minStayTime = 5 * 60 * 1000; // 5 minutes
        
        if (timeSinceCheckIn < minStayTime) {
            const remainingMinutes = Math.ceil((minStayTime - timeSinceCheckIn) / (1000 * 60));
            this.showMessage(`Please wait ${remainingMinutes} more minute(s) before checking out to ensure you're attending class.`, 'error');
            return;
        }
        
        // No location verification required - relying on time-rotating codes for security
        
        // Record check-out
        attendanceData[dateKey][baseSessionCode].students[studentId].checkOut = now.toISOString();
        
        localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
        
        this.showMessage(`🚪 Successfully checked out at ${now.toLocaleTimeString()}`, 'success');
        this.loadTodayAttendance();
    }

    loadTodayAttendance() {
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
        const summaryDiv = document.getElementById('attendance-summary');
        
        const todayData = attendanceData[this.today];
        if (!todayData) {
            summaryDiv.innerHTML = '<p>No check-ins recorded for today</p>';
            return;
        }
        
        let summaryHtml = '';
        let totalSessions = 0;
        let totalTime = 0;
        
        Object.entries(todayData).forEach(([sessionCode, sessionData]) => {
            const studentId = document.getElementById('student-id').value.trim();
            const studentData = sessionData.students[studentId];
            
            if (studentData && studentData.checkIn) {
                totalSessions++;
                const checkInTime = new Date(studentData.checkIn);
                const checkOutTime = studentData.checkOut ? new Date(studentData.checkOut) : null;
                
                let duration = 'Still present';
                if (checkOutTime) {
                    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${minutes}m`;
                    totalTime += durationMs;
                }
                
                summaryHtml += `
                    <div class="attendance-record">
                        <strong>${sessionData.sessionInfo.courseName}</strong><br>
                        <small>Session: ${sessionCode}</small><br>
                        Check-in: ${checkInTime.toLocaleTimeString()}<br>
                        ${checkOutTime ? `Check-out: ${checkOutTime.toLocaleTimeString()}<br>` : ''}
                        Duration: ${duration}
                    </div>
                `;
            }
        });
        
        if (totalSessions === 0) {
            summaryDiv.innerHTML = '<p>No check-ins recorded for today</p>';
        } else {
            const totalHours = Math.floor(totalTime / (1000 * 60 * 60));
            const totalMinutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));
            
            summaryDiv.innerHTML = `
                <div class="attendance-stats">
                    <p><strong>Sessions attended today:</strong> ${totalSessions}</p>
                    <p><strong>Total time:</strong> ${totalHours}h ${totalMinutes}m</p>
                </div>
                ${summaryHtml}
            `;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Pre-fill session code from URL if present (QR code scan)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    const rotationCode = urlParams.get('rotation');
    
    if (sessionCode) {
        const fullCode = rotationCode ? `${sessionCode}-${rotationCode}` : sessionCode;
        document.getElementById('session-code').value = fullCode;
        console.log('Pre-filled session code from URL:', fullCode);
    }
    
    // Add mobile debugging info
    console.log('Device info:', {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        touchSupport: 'ontouchstart' in window,
        localStorage: typeof Storage !== "undefined"
    });
    
    new AttendanceApp();
});
