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
        
        // Test session code button
        document.getElementById('test-session-btn').addEventListener('click', () => {
            this.testSessionCode();
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
            const now = new Date();
            const currentTimeSlot = Math.floor(now.getTime() / (2 * 60 * 1000));
            const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
            
            const debugData = {
                'Browser': navigator.userAgent,
                'Screen Size': `${screen.width}x${screen.height}`,
                'Viewport': `${window.innerWidth}x${window.innerHeight}`,
                'Touch Support': 'ontouchstart' in window ? 'Yes' : 'No',
                'Local Storage': typeof Storage !== "undefined" ? 'Available' : 'Not Available',
                'Current URL': window.location.href,
                'Timestamp': now.toLocaleString(),
                'UTC Timestamp': now.toUTCString(),
                'Current Time Slot': currentTimeSlot,
                'Active Sessions': Object.keys(activeSessions).join(', ') || 'None',
                'Today Date Key': this.today
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
            // Also hide test results
            document.getElementById('test-results').style.display = 'none';
        }
    }

    testSessionCode() {
        const sessionCodeInput = document.getElementById('session-code').value.trim();
        const testResults = document.getElementById('test-results');
        const testOutput = document.getElementById('test-output');
        
        if (!sessionCodeInput) {
            alert('Please enter a session code first, then click Test Session Code');
            return;
        }
        
        // Show results section
        testResults.style.display = 'block';
        
        // Run detailed validation test
        let output = '<h5>🧪 Session Code Validation Test</h5>';
        output += `<p><strong>Input:</strong> "${sessionCodeInput}"</p>`;
        
        try {
            // Clean the code like our validation does
            const cleanedCode = sessionCodeInput.toUpperCase().replace(/[^\w-]/g, '');
            output += `<p><strong>Cleaned:</strong> "${cleanedCode}"</p>`;
            
            // Parse the code
            const parts = cleanedCode.split('-');
            const baseCode = parts[0];
            const rotationCode = parts[1];
            
            output += `<p><strong>Base Code:</strong> "${baseCode}"</p>`;
            output += `<p><strong>Rotation Code:</strong> "${rotationCode || 'None'}"</p>`;
            
            // Check active sessions
            const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
            output += `<p><strong>Available Sessions:</strong> [${Object.keys(activeSessions).join(', ') || 'None'}]</p>`;
            
            const session = activeSessions[baseCode];
            if (session) {
                output += `<p><strong>✅ Base Session Found</strong></p>`;
                output += `<p><strong>Session Date:</strong> ${session.date}</p>`;
                output += `<p><strong>Today:</strong> ${this.today}</p>`;
                output += `<p><strong>Date Match:</strong> ${session.date === this.today ? '✅ Yes' : '❌ No'}</p>`;
                
                if (rotationCode) {
                    // Test rotation codes
                    const now = new Date().getTime();
                    const currentTimeSlot = Math.floor(now / (2 * 60 * 1000));
                    const previousTimeSlot = currentTimeSlot - 1;
                    const nextTimeSlot = currentTimeSlot + 1;
                    
                    const currentRotation = this.generateTimeBasedCode(baseCode, currentTimeSlot);
                    const previousRotation = this.generateTimeBasedCode(baseCode, previousTimeSlot);
                    const nextRotation = this.generateTimeBasedCode(baseCode, nextTimeSlot);
                    
                    output += `<p><strong>Time Slot:</strong> ${currentTimeSlot}</p>`;
                    output += `<p><strong>Expected Current:</strong> "${currentRotation}"</p>`;
                    output += `<p><strong>Expected Previous:</strong> "${previousRotation}"</p>`;
                    output += `<p><strong>Expected Next:</strong> "${nextRotation}"</p>`;
                    
                    if (rotationCode === currentRotation) {
                        output += `<p><strong>✅ Rotation Code MATCHES Current</strong></p>`;
                    } else if (rotationCode === previousRotation) {
                        output += `<p><strong>✅ Rotation Code MATCHES Previous</strong></p>`;
                    } else if (rotationCode === nextRotation) {
                        output += `<p><strong>✅ Rotation Code MATCHES Next</strong></p>`;
                    } else {
                        output += `<p><strong>❌ Rotation Code DOES NOT MATCH</strong></p>`;
                    }
                }
                
                output += `<p><strong>🎯 Overall Result:</strong> ${this.validateSession(cleanedCode) ? '✅ VALID' : '❌ INVALID'}</p>`;
                
            } else {
                output += `<p><strong>❌ Base Session NOT Found</strong></p>`;
                output += `<p><strong>Reason:</strong> No session exists with code "${baseCode}"</p>`;
            }
            
        } catch (error) {
            output += `<p><strong>❌ Test Error:</strong> ${error.message}</p>`;
        }
        
        testOutput.innerHTML = output;
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
        let sessionCode = document.getElementById('session-code').value.trim();
        
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
        
        // MOBILE FIX: Convert session code to uppercase and remove any invisible characters
        sessionCode = sessionCode.toUpperCase().replace(/[^\w-]/g, '');
        
        console.log('Original session code:', document.getElementById('session-code').value);
        console.log('Cleaned session code:', sessionCode);
        
        // Update the input field with the cleaned code
        document.getElementById('session-code').value = sessionCode;
        
        return { studentId, sessionCode };
    }

    validateSession(sessionCode, isCheckOut = false) {
        console.log('=== SESSION VALIDATION DEBUG ===');
        console.log('Input session code:', sessionCode);
        console.log('Is check out:', isCheckOut);
        
        // Parse session code (might include rotation code)
        // New mode: single rotating 6-char code (no dash)
        let baseSessionCode = sessionCode;
        let providedRotationCode = '';
        if (sessionCode.includes('-')) {
            const parts = sessionCode.split('-');
            baseSessionCode = parts[0];
            providedRotationCode = parts[1];
        }
        
        console.log('Base session code:', baseSessionCode);
        console.log('Provided rotation code:', providedRotationCode);
        
        // Get active sessions from localStorage
        const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
        console.log('Active sessions:', Object.keys(activeSessions));
        
        const session = activeSessions[baseSessionCode];
        
        if (!session) {
            console.log('ERROR: Session not found');
            console.log('Available session codes:', Object.keys(activeSessions));
            this.showMessage(`Invalid session code "${baseSessionCode}". Please check with your instructor.`, 'error');
            return false;
        }
        
        console.log('Session found:', session);
        
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
        if (providedRotationCode || sessionCode.length === 6) {
            console.log('=== ROTATION CODE VALIDATION ===');
            console.log('Current timestamp:', now);
            console.log('Current date/time:', new Date(now).toLocaleString());
            
            const currentTimeSlot = Math.floor(now / (2 * 60 * 1000)); // 2-minute intervals
            const previousTimeSlot = currentTimeSlot - 1;
            const nextTimeSlot = currentTimeSlot + 1;
            
            console.log('Current time slot:', currentTimeSlot);
            console.log('Previous time slot:', previousTimeSlot);
            console.log('Next time slot:', nextTimeSlot);
            
            // Visual code is derived from base code and slot
            const currentRotationCode = this.generateVisualCode(baseSessionCode, currentTimeSlot);
            const previousRotationCode = this.generateVisualCode(baseSessionCode, previousTimeSlot);
            const nextRotationCode = this.generateVisualCode(baseSessionCode, nextTimeSlot);
            
            console.log('Current rotation code:', currentRotationCode);
            console.log('Previous rotation code:', previousRotationCode);  
            console.log('Next rotation code:', nextRotationCode);
            console.log('Provided rotation code:', providedRotationCode);
            
            if (isCheckOut) {
                // For check-out, require current time slot (stricter validation)
                if (providedRotationCode !== currentRotationCode) {
                    console.log('ERROR: Check-out code validation failed');
                    this.showMessage('Check-out code has expired. Please scan the current QR code displayed in class.', 'error');
                    return false;
                }
            } else {
                // MOBILE FIX: For check-in, allow current, previous, OR next time slot (more tolerant)
                const candidate = providedRotationCode || sessionCode; // allow pure 6-char code
                if (candidate !== currentRotationCode && 
                    candidate !== previousRotationCode && 
                    candidate !== nextRotationCode) {
                    console.log('ERROR: Check-in code validation failed');
                    console.log('None of the time slots matched');
                    this.showMessage('Session code has expired. Please scan the current QR code or try again in a few seconds.', 'error');
                    return false;
                }
            }
            
            console.log('Rotation code validation PASSED');
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

    generateVisualCode(baseCode, slot) {
        // Deterministic 6-char code based on baseCode and slot (must match admin)
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
    
    // Extract base session code (remove rotation part if present)
    let baseSessionCode = sessionCode;
    if (sessionCode.includes('-')) {
        baseSessionCode = sessionCode.split('-')[0];
    }
    console.log('Using base session code for storage:', baseSessionCode);
    
    // Get attendance data
    const attendanceData = JSON.parse(localStorage.getItem('attendance_data'));
    const dateKey = this.today;
    
    if (!attendanceData[dateKey]) {
        attendanceData[dateKey] = {};
    }
    
    if (!attendanceData[dateKey][baseSessionCode]) {
        attendanceData[dateKey][baseSessionCode] = {
            sessionInfo: session,
            students: {}
        };
    }
    
    const studentData = attendanceData[dateKey][baseSessionCode].students[studentId];
        
        // Check if already checked in and not checked out
        if (studentData && studentData.checkIn && !studentData.checkOut) {
            this.showMessage('You are already checked in! Use "Check Out" when leaving.', 'info');
            return;
        }
        
        // Record check-in
        const now = new Date();
        if (!attendanceData[dateKey][baseSessionCode].students[studentId]) {
            attendanceData[dateKey][baseSessionCode].students[studentId] = {};
        }
        
        attendanceData[dateKey][baseSessionCode].students[studentId].checkIn = now.toISOString();
        attendanceData[dateKey][baseSessionCode].students[studentId].checkOut = null;
        
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
    // Pre-fill from stateless payload in QR if present
    const urlParams = new URLSearchParams(window.location.search);
    const payloadB64 = urlParams.get('p');
    const sessionCode = urlParams.get('session'); // legacy
    const rotationCode = urlParams.get('rotation'); // legacy
    
    if (payloadB64) {
        try {
            const decoded = JSON.parse(atob(payloadB64));
            // expected: { v, code, date, expiresAt, rotation, slot, course }
            if (decoded && decoded.code && decoded.rotation) {
                const fullCode = `${decoded.code}-${decoded.rotation}`;
                document.getElementById('session-code').value = fullCode;
                
                // Seed local active_sessions so validation works on mobile
                const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
                activeSessions[decoded.code] = {
                    code: decoded.code,
                    courseName: decoded.course || 'Course',
                    date: decoded.date,
                    createdAt: new Date().toISOString(),
                    expiresAt: decoded.expiresAt,
                    active: true
                };
                localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
                
                // Also persist payload for debugging/reference
                sessionStorage.setItem(`payload_session_${decoded.code}`, JSON.stringify(decoded));
                console.log('Pre-filled from QR payload:', decoded);
            }
        } catch (e) {
            console.warn('Failed to parse QR payload', e);
        }
    } else if (sessionCode) {
        // Legacy support
        const fullCode = rotationCode ? `${sessionCode}-${rotationCode}` : sessionCode;
        document.getElementById('session-code').value = fullCode;
        console.log('Pre-filled session code from URL (legacy):', fullCode);
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
