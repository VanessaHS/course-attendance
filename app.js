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
                // For check-out, allow current and previous time slot (more forgiving)
                const candidate = providedRotationCode || sessionCode;
                if (candidate !== currentRotationCode && candidate !== previousRotationCode) {
                    console.log('ERROR: Check-out code validation failed');
                    console.log('Check-out code not current or previous');
                    this.showMessage('Check-out code has expired. Please scan the current QR code displayed in class.', 'error');
                    return false;
                }
                console.log('✅ Check-out code validation passed (current or previous slot)');
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

    async checkIn() {
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
        
        console.log('Check-in successful - stored data:', {
            sessionCode: baseSessionCode,
            studentId: studentId,
            date: dateKey,
            attendanceData: attendanceData[dateKey][baseSessionCode]
        });
        
        // Save to GitHub for cross-device sync
        if (window.githubStorage) {
            const token = window.githubStorage.getToken();
            console.log('📤 Saving check-in to GitHub:', { baseSessionCode, studentId, hasToken: !!token });
            
            if (!token) {
                console.error('❌ No GitHub token found on mobile - check-in will only save locally');
                this.showMessage('⚠️ Check-in saved locally only. Admin needs to sync manually.', 'info');
                return;
            }
            
            try {
                console.log('📤 About to save to GitHub:', {
                    baseSessionCode,
                    studentId,
                    action: 'checkin',
                    timestamp: now.toISOString(),
                    expectedFileName: `${baseSessionCode}_${now.toISOString().split('T')[0]}.json`
                });
                
                await window.githubStorage.saveAttendance(
                    baseSessionCode, 
                    studentId, 
                    'checkin', 
                    now.toISOString(),
                    { device: 'mobile', userAgent: navigator.userAgent.substring(0, 50) }
                );
                console.log('✅ Check-in saved to GitHub successfully');
                
                // Show success message with filename
                const fileName = `${baseSessionCode}_${now.toISOString().split('T')[0]}.json`;
                this.showMessage(`✅ Saved to GitHub: ${fileName}`, 'success');
                
            } catch (error) {
                console.error('❌ Failed to save check-in to GitHub:', error);
                this.showMessage(`❌ GitHub save failed: ${error.message}`, 'error');
            }
        } else {
            console.log('⚠️ GitHub storage not available');
        }
        
        this.showMessage(`✅ Successfully checked in at ${now.toLocaleTimeString()}`, 'success');
        this.loadTodayAttendance();
        
        // Transform UI to post-check-in state
        this.showPostCheckInState(studentId, baseSessionCode, now);
        
        // Clear session code after successful check-in
        document.getElementById('session-code').value = '';
        
        } catch (error) {
            console.error('Check-in error:', error);
            this.showMessage(`Error during check-in: ${error.message}. Please try again.`, 'error');
        }
    }

    showPostCheckInState(studentId, sessionCode, checkInTime) {
        // Hide the check-in form
        const checkInForm = document.getElementById('check-in-form');
        checkInForm.style.display = 'none';
        
        // Create and show post-check-in content
        let postCheckInDiv = document.getElementById('post-check-in-content');
        if (!postCheckInDiv) {
            postCheckInDiv = document.createElement('div');
            postCheckInDiv.id = 'post-check-in-content';
            postCheckInDiv.className = 'card';
            checkInForm.parentNode.insertBefore(postCheckInDiv, checkInForm.nextSibling);
        }
        
        postCheckInDiv.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="color: #1a237e; font-size: 28px; margin-bottom: 20px; text-align: center;">✅ You're Checked In!</h2>
            </div>
        `;
        
        // Create session details banner (full width)
        const sessionDetailsDiv = document.createElement('div');
        sessionDetailsDiv.className = 'card';
        sessionDetailsDiv.style.cssText = 'border: 2px solid #4CAF50; border-radius: 12px; background: #e8f5e8; margin-bottom: 20px;';
        sessionDetailsDiv.innerHTML = `
            <h3 style="color: #1a237e; margin: 0 0 15px 0; text-align: center;">Session Details</h3>
            <div style="text-align: center;">
                <p style="margin: 8px 0; color: #1a237e;"><strong>Student ID:</strong> ${studentId}</p>
                <p style="margin: 8px 0; color: #1a237e;"><strong>Session:</strong> ${sessionCode}</p>
                <p style="margin: 8px 0; color: #1a237e;"><strong>Check-in Time:</strong> ${checkInTime.toLocaleTimeString()}</p>
            </div>
        `;
        
        // Create check-out instructions banner (full width)
        const checkoutInstructionsDiv = document.createElement('div');
        checkoutInstructionsDiv.className = 'card';
        checkoutInstructionsDiv.style.cssText = 'border: 2px solid #f59e0b; border-radius: 12px; background: #fef3c7; margin-bottom: 20px;';
        checkoutInstructionsDiv.innerHTML = `
            <h3 style="color: #dc2626; margin: 0 0 20px 0; text-align: center;">📱 When Ready to Leave:</h3>
            <div style="text-align: center;">
                <p style="color: #1a237e; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                    Scan the QR code displayed at the front of the classroom
                </p>
                <div style="margin-top: 15px;">
                    <p style="color: #1a237e; font-size: 16px; font-weight: 600; margin-bottom: 15px;">
                        📷 To scan the QR code:
                    </p>
                    <div style="background: rgba(26, 35, 126, 0.1); padding: 15px; border-radius: 8px; text-align: left;">
                        <p style="color: #1a237e; margin: 8px 0; font-size: 14px;">
                            <strong>iPhone/iPad:</strong> Open Camera app → Point at QR code
                        </p>
                        <p style="color: #1a237e; margin: 8px 0; font-size: 14px;">
                            <strong>Android:</strong> Open Camera app → Tap QR code icon
                        </p>
                        <p style="color: #1a237e; margin: 8px 0; font-size: 14px;">
                            <strong>Any device:</strong> Use any QR scanner app
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the new banners after the post-check-in div
        postCheckInDiv.parentNode.insertBefore(sessionDetailsDiv, postCheckInDiv.nextSibling);
        postCheckInDiv.parentNode.insertBefore(checkoutInstructionsDiv, sessionDetailsDiv.nextSibling);
        
        postCheckInDiv.style.display = 'block';
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
        
        // No location or time verification required - relying on time-rotating codes for security
        const now = new Date();
        
        // Record check-out
        attendanceData[dateKey][baseSessionCode].students[studentId].checkOut = now.toISOString();
        
        localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
        
        console.log('Check-out successful - stored data:', {
            sessionCode: baseSessionCode,
            studentId: studentId,
            date: dateKey,
            attendanceData: attendanceData[dateKey][baseSessionCode]
        });
        
        // Save to GitHub for cross-device sync
        if (window.githubStorage) {
            const token = window.githubStorage.getToken();
            console.log('📤 Saving check-out to GitHub:', { baseSessionCode, studentId, hasToken: !!token });
            
            if (!token) {
                console.error('❌ No GitHub token found on mobile - check-out will only save locally');
                this.showMessage('⚠️ Check-out saved locally only. Admin needs to sync manually.', 'info');
            } else {
                try {
                    console.log('📤 About to save check-out to GitHub:', {
                        baseSessionCode,
                        studentId,
                        action: 'checkout',
                        timestamp: now.toISOString(),
                        expectedFileName: `${baseSessionCode}_${now.toISOString().split('T')[0]}.json`
                    });
                    
                    window.githubStorage.saveAttendance(
                        baseSessionCode, 
                        studentId, 
                        'checkout', 
                        now.toISOString(),
                        { device: 'mobile', userAgent: navigator.userAgent.substring(0, 50) }
                    ).then(() => {
                        console.log('✅ Check-out saved to GitHub successfully');
                        const fileName = `${baseSessionCode}_${now.toISOString().split('T')[0]}.json`;
                        this.showMessage(`✅ Check-out synced to GitHub: ${fileName}`, 'success');
                    }).catch(error => {
                        console.error('❌ Failed to save check-out to GitHub:', error);
                        this.showMessage(`❌ GitHub sync failed: ${error.message}`, 'error');
                    });
                    
                } catch (error) {
                    console.error('❌ Failed to save check-out to GitHub:', error);
                    this.showMessage(`❌ GitHub sync failed: ${error.message}`, 'error');
                }
            }
        } else {
            console.log('⚠️ GitHub storage not available');
        }
        
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
    // Version check - remove after testing
    console.log('🚀 App.js loaded - Version 2025012802');
    
    // Clean production version - debug elements removed
    
    // Pre-fill from QR URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('s');      // session code
    const rotationCode = urlParams.get('r');     // rotation code  
    const courseName = urlParams.get('c');       // course name
    const syncFlag = urlParams.get('sync');      // GitHub sync flag
    const qrToken = urlParams.get('token');      // GitHub token from QR
    const payloadB64 = urlParams.get('p');       // legacy base64 payload
    const legacySession = urlParams.get('session'); // legacy
    const legacyRotation = urlParams.get('rotation'); // legacy
    
    // Initialize GitHub storage with token from QR code (back to working method)
    if (syncFlag === '1' && window.githubStorage) {
        if (qrToken) {
            // Use token directly from QR code (the way it was working yesterday)
            window.githubStorage.setToken(qrToken);
            console.log('✅ GitHub token loaded from QR code');
        } else {
            // Fallback to localStorage
            const storedToken = localStorage.getItem('github_token');
            if (storedToken) {
                window.githubStorage.setToken(storedToken);
                console.log('✅ GitHub token loaded from localStorage');
            } else {
                console.log('⚠️ No GitHub token available - using local-only mode');
            }
        }
    }
    
    // Debug info removed for production
    
    // Production version - debug logging removed
    
    // Check GitHub token status and show indicator (after token initialization)
    function updateGitHubStatus() {
        let githubStatus = document.getElementById('github-status-indicator');
        if (!githubStatus) {
            githubStatus = document.createElement('div');
            githubStatus.id = 'github-status-indicator';
            githubStatus.style.cssText = `
                position: fixed; top: 10px; right: 10px; 
                padding: 8px 12px; border-radius: 6px; 
                font-size: 12px; font-weight: bold; z-index: 1000;
            `;
            document.body.appendChild(githubStatus);
        }
        
        const hasToken = window.githubStorage && window.githubStorage.getToken();
        console.log('🔍 GitHub Status Check:', {
            githubStorageAvailable: !!window.githubStorage,
            hasToken: hasToken,
            token: hasToken ? 'Present' : 'Missing',
            syncFlag: urlParams.get('sync')
        });
        
        if (hasToken) {
            githubStatus.textContent = '🔗 GitHub Sync ON';
            githubStatus.style.background = '#d4edda';
            githubStatus.style.color = '#155724';
            githubStatus.style.border = '1px solid #c3e6cb';
        } else {
            githubStatus.textContent = '📱 Local Only';
            githubStatus.style.background = '#fff3cd';
            githubStatus.style.color = '#856404';
            githubStatus.style.border = '1px solid #ffeaa7';
        }
    }
    
    // Initial status check
    updateGitHubStatus();
    
    // Update status after token initialization (if sync flag was present)
    if (syncFlag === '1') {
        setTimeout(updateGitHubStatus, 100);
    }
    
    if (sessionCode && rotationCode) {
        // New short URL format
        const fullCode = `${sessionCode}-${rotationCode}`;
        document.getElementById('session-code').value = fullCode;
        console.log('✅ QR scan successful! Session code filled:', fullCode);
        
        // Display course name prominently
        if (courseName) {
            const courseDisplay = document.getElementById('course-display');
            if (courseDisplay) {
                const courseNameElement = courseDisplay.querySelector('.course-name');
                        if (courseNameElement) {
            const decodedCourseName = decodeURIComponent(courseName);
            // Add ellipsis if course name was truncated
            const displayName = decodedCourseName.length >= 10 ? decodedCourseName + '...' : decodedCourseName;
            courseNameElement.textContent = displayName;
            console.log('✅ Course name displayed:', `"${decodedCourseName}" → "${displayName}"`);
        }
                courseDisplay.style.display = 'block';
            }
        } else {
            console.log('⚠️ No course name in QR code');
        }
        
        // Create a basic session entry for validation
        const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
        activeSessions[sessionCode] = {
            code: sessionCode,
            courseName: courseName ? decodeURIComponent(courseName) : 'Course Session',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).getTime(), // 4 hours from now
            active: true
        };
        localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
        
        console.log('Pre-filled from QR URL:', { sessionCode, rotationCode, courseName });
        
    } else if (payloadB64) {
        // Legacy base64 payload format
        try {
            const decoded = JSON.parse(atob(payloadB64));
            // Handle both old and new compressed payload formats
            const code = decoded.code || decoded.c;
            const rotation = decoded.rotation || decoded.r;
            const date = decoded.date || decoded.d;
            const expiresAt = decoded.expiresAt || decoded.e;
            const courseNameDecoded = decoded.course || decoded.n;
            
            if (code && rotation) {
                const fullCode = `${code}-${rotation}`;
                document.getElementById('session-code').value = fullCode;
                
                // Display course name prominently
                if (courseNameDecoded) {
                    const courseDisplay = document.getElementById('course-display');
                    if (courseDisplay) {
                        const courseNameElement = courseDisplay.querySelector('.course-name');
                        if (courseNameElement) {
                            courseNameElement.textContent = courseNameDecoded;
                        }
                        courseDisplay.style.display = 'block';
                    }
                    
                    // Also update page title
                    document.title = `Check-in: ${courseNameDecoded}`;
                }
                
                // Seed local active_sessions so validation works on mobile
                const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
                activeSessions[code] = {
                    code: code,
                    courseName: courseNameDecoded || 'Course',
                    date: date,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAt,
                    active: true
                };
                localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
                
                console.log('Pre-filled from legacy QR payload:', { code, rotation, courseNameDecoded });
            }
        } catch (e) {
            console.warn('Failed to parse QR payload', e);
        }
    } else if (legacySession) {
        // Legacy support
        const fullCode = legacyRotation ? `${legacySession}-${legacyRotation}` : legacySession;
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
