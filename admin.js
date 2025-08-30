// Course Attendance System - Admin Interface
class AttendanceAdmin {
    constructor() {
        this.currentSession = null;
        this.refreshInterval = null;
        this.lastGitHubSync = 0; // Throttle GitHub API calls
        
        // Security configuration
        this.securityConfig = {
            SESSION_TIMEOUT: 4 * 60 * 60 * 1000, // 4 hours
            MAX_LOGIN_ATTEMPTS: 3,
            LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
            // This should be set via environment or deployment config
            ADMIN_PASSWORD_HASH: 'cd31f6a785aef16da4ffa24982d819608257cdbeb40c42d1cdb7d3ba3aca7752' // Default: "hello"
        };
        
        // Check authentication before initializing
        if (!this.checkAuthentication()) {
            this.showLoginInterface();
            return;
        }
        
        this.initializeAdmin();
        this.setupEventListeners();
        this.loadCurrentSession();
        this.loadSettings();
    }

    initializeAdmin() {
        console.log('🚀 Initializing admin panel...');
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        console.log('📅 Today\'s date:', today);
        
        const sessionDateInput = document.getElementById('session-date');
        const historyDateInput = document.getElementById('history-date');
        
        if (sessionDateInput) {
            sessionDateInput.value = today;
            console.log('✅ Session date set to:', sessionDateInput.value);
        } else {
            console.error('❌ Session date input NOT found');
        }
        
        if (historyDateInput) {
            historyDateInput.value = today;
            console.log('✅ History date set to:', historyDateInput.value);
        } else {
            console.error('❌ History date input NOT found');
        }
        
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
        console.log('🔧 Setting up event listeners...');
        
        // Test if elements exist before adding listeners
        const generateBtn = document.getElementById('generate-session-btn');
        const endBtn = document.getElementById('end-session-btn');
        
        if (generateBtn) {
            console.log('✅ Generate session button found');
            generateBtn.addEventListener('click', () => this.generateNewSession());
        } else {
            console.error('❌ Generate session button NOT found');
        }
        
        if (endBtn) {
            console.log('✅ End session button found');
            endBtn.addEventListener('click', () => this.endCurrentSession());
        } else {
            console.error('❌ End session button NOT found');
        }
        // Add null checks for all remaining elements
        const refreshBtn = document.getElementById('refresh-btn');
        const loadHistoryBtn = document.getElementById('load-history-btn');
        const exportBtn = document.getElementById('export-btn');
        const clearDataBtn = document.getElementById('clear-data-btn');
        const manualCheckoutBtn = document.getElementById('manual-checkout-btn');
        const confirmManualCheckoutBtn = document.getElementById('confirm-manual-checkout');
        const cancelManualCheckoutBtn = document.getElementById('cancel-manual-checkout');
        
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshLiveAttendance());
        if (loadHistoryBtn) loadHistoryBtn.addEventListener('click', () => this.loadAttendanceHistory());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        if (clearDataBtn) clearDataBtn.addEventListener('click', () => this.clearOldData());
        
        // Manual check-out functionality
        if (manualCheckoutBtn) manualCheckoutBtn.addEventListener('click', () => this.showManualCheckout());
        if (confirmManualCheckoutBtn) confirmManualCheckoutBtn.addEventListener('click', () => this.performManualCheckout());
        if (cancelManualCheckoutBtn) cancelManualCheckoutBtn.addEventListener('click', () => this.hideManualCheckout());
        
        // GitHub setup functionality
        console.log('🔧 Setting up GitHub button listeners...');
        const setupBtn = document.getElementById('setup-github-btn');
        if (setupBtn) {
            console.log('✅ GitHub setup button found!');
            setupBtn.addEventListener('click', () => {
                console.log('🔧 GitHub setup button clicked!');
                this.showGitHubSetup();
            });
        } else {
            console.error('❌ GitHub setup button NOT found!');
        }
        
        const cancelBtn = document.getElementById('cancel-github-setup');
        const saveBtn = document.getElementById('save-github-setup');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideGitHubSetup());
            console.log('✅ GitHub cancel button listener added');
        } else {
            console.error('❌ GitHub cancel button NOT found');
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveGitHubSetup());
            console.log('✅ GitHub save button listener added');
        } else {
            console.error('❌ GitHub save button NOT found');
        }
        
        // Settings (check if elements exist first)
        const anonymousModeEl = document.getElementById('anonymous-mode');
        const autoDeleteEl = document.getElementById('auto-delete');
        
        if (anonymousModeEl) {
            anonymousModeEl.addEventListener('change', () => this.saveSettings());
        }
        if (autoDeleteEl) {
            autoDeleteEl.addEventListener('change', () => this.saveSettings());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
            console.log('✅ Logout button listener added');
        }
        
        // Start boundary-aligned refresh system
        this.startBoundaryScheduler();
        
        // Add window focus/blur handling for better performance
        this.setupWindowEventHandlers();
        
        // Start session monitoring
        this.startSessionMonitoring();
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
        console.log('🎯 Generate new session clicked!');
        
        const courseNameInput = document.getElementById('course-name');
        const sessionDateInput = document.getElementById('session-date');
        
        if (!courseNameInput) {
            console.error('❌ Course name input not found');
            alert('Error: Course name input not found');
            return;
        }
        
        if (!sessionDateInput) {
            console.error('❌ Session date input not found');
            alert('Error: Session date input not found');
            return;
        }
        
        const courseName = courseNameInput.value.trim();
        const sessionDate = sessionDateInput.value;
        
        console.log('📝 Form values:', { courseName, sessionDate });
        
        if (!courseName) {
            console.log('⚠️ No course name provided');
            alert('Please enter a course name');
            return;
        }
        
        if (!sessionDate) {
            console.log('⚠️ No session date provided');
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
            
            // Hide the QR display, session banner, and bottom sections safely
            const qrDisplay = document.getElementById('qr-display');
            const sessionBanner = document.getElementById('session-code-banner');
            const studentLinkSection = document.getElementById('student-link-section');
            const securityFeaturesSection = document.getElementById('security-features-section');
            const footerStudentLink = document.getElementById('footer-student-link');
            
            if (qrDisplay) qrDisplay.style.display = 'none';
            if (sessionBanner) sessionBanner.style.display = 'none';
            if (studentLinkSection) studentLinkSection.style.display = 'none';
            if (securityFeaturesSection) securityFeaturesSection.style.display = 'none';
            
            // Reset footer link to basic student interface
            if (footerStudentLink) {
                footerStudentLink.href = 'index.html';
            }
            
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
        console.log('🔄 generateQRCode() called');
        if (!this.currentSession) {
            console.log('❌ No current session, skipping QR generation');
            return;
        }
        
        console.log('📋 Current session:', this.currentSession);
        
        const qrDisplay = document.getElementById('qr-display');
        const canvas = document.getElementById('qr-canvas');
        const sessionCodeSpan = document.getElementById('display-session-code');
        const expirySpan = document.getElementById('session-expiry');
        
        console.log('🔍 DOM elements found:', {
            qrDisplay: !!qrDisplay,
            canvas: !!canvas,
            sessionCodeSpan: !!sessionCodeSpan,
            expirySpan: !!expirySpan
        });
        
        
        // Compute current slot and visual rotating code (changes every 2 minutes)
        const currentDateTime = new Date();
        const timeSlot = Math.floor(currentDateTime.getTime() / (2 * 60 * 1000)); // 2-minute intervals
        const visualCode = this.generateVisualCode(this.currentSession.code, timeSlot);
        const combinedCode = `${this.currentSession.code}-${visualCode}`;
        
        // Create a much shorter URL using just session code and rotation
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        
        // Remove course name from QR to save space for GitHub token (per working memory)
        let qrData = `${baseUrl}?s=${this.currentSession.code}&r=${visualCode}`;
        
        // Check if GitHub token is available
        const hasToken = window.githubStorage && window.githubStorage.getToken();
        
        if (hasToken) {
            // Add the full token back to QR code for mobile sync (like it was working yesterday)
            const fullToken = window.githubStorage.getToken();
            qrData += `&sync=1&token=${encodeURIComponent(fullToken)}`;
            console.log('✅ Added GitHub sync with full token to QR code');
        } else {
            console.log('⚠️ No GitHub token - QR code will be local-only');
        }
        
        // Debug: Log URL length 
        console.log('📏 QR URL length:', qrData.length);
        console.log('🔗 QR URL:', qrData);
        console.log('📚 Course name removed from QR to save space for GitHub token');
        console.log('📚 QRCode library available:', typeof QRCode !== 'undefined');
        console.log('📚 QRErrorCorrectLevel available:', typeof QRErrorCorrectLevel !== 'undefined');
        
        // Make banner and bottom sections visible
        const sessionBanner = document.getElementById('session-code-banner');
        const studentLinkSection = document.getElementById('student-link-section');
        const securityFeaturesSection = document.getElementById('security-features-section');
        
        if (sessionBanner) {
            sessionBanner.style.display = 'block';
            console.log('✅ Session banner made visible');
        } else {
            console.error('❌ Session banner element not found');
        }
        
        if (studentLinkSection) {
            studentLinkSection.style.display = 'block';
        }
        
        if (securityFeaturesSection) {
            securityFeaturesSection.style.display = 'block';
        }
        
        if (!qrDisplay) {
            console.error('❌ QR display element not found');
        }
        const studentLink = document.getElementById('student-link');
        const footerStudentLink = document.getElementById('footer-student-link');
        
        if (studentLink) {
            studentLink.href = qrData;
            studentLink.textContent = qrData;
        }
        
        // Update footer link with session parameters
        if (footerStudentLink) {
            footerStudentLink.href = qrData;
            console.log('✅ Footer student link updated with session parameters');
        }

        // Generate proper scannable QR code
        console.log('🔄 Generating scannable QR code...');
        try {
            // Clear any existing QR code
            const qrContainer = canvas ? canvas.parentElement : null;
            if (!qrContainer) {
                throw new Error('QR container not found');
            }
            
            console.log('🧹 Clearing existing QR code');
            qrContainer.innerHTML = '<canvas id="qr-canvas" style="border: 2px solid #ddd; border-radius: 8px; margin-bottom: 10px;"></canvas>';
            
            // Create new QR code using the embedded library
            console.log('🔍 Checking QRCode library...');
            if (typeof QRCode !== 'undefined') {
                console.log('✅ QRCode library is available');
                const qrDiv = document.createElement('div');
                qrDiv.style.textAlign = 'center';
                
                new QRCode(qrDiv, {
                    text: qrData,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRErrorCorrectLevel.L  // Lower error correction = more data capacity
                });
                
                console.log('🎨 QR Code colors: Dark=#000000 (black), Light=#ffffff (white)');
                
                // Replace the canvas with the generated QR code
                const newCanvas = qrDiv.querySelector('canvas');
                if (newCanvas) {
                    newCanvas.id = 'qr-canvas';
                    newCanvas.style.border = '2px solid #ddd';
                    newCanvas.style.borderRadius = '8px';
                    newCanvas.style.marginBottom = '10px';
                    newCanvas.style.backgroundColor = '#ffffff';
                    newCanvas.style.padding = '10px';
                    qrContainer.replaceChild(newCanvas, qrContainer.querySelector('canvas'));
                }
                
                console.log('✅ Scannable QR code generated successfully');
            } else {
                throw new Error('QRCode library not available');
            }
        } catch (e) {
            console.warn('❌ QR code generation failed, using fallback:', e);
            const ctx = canvas.getContext && canvas.getContext('2d');
            if (ctx) {
                canvas.width = 200;
                canvas.height = 200;
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, 200, 200);
                ctx.fillStyle = '#333';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('QR Code Generator', 100, 85);
                ctx.fillText('Not Available', 100, 105);
                ctx.fillText('Use Student Link below', 100, 125);
                
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 2;
                ctx.strokeRect(10, 10, 180, 180);
            }
        }
        
        // Update session code display if element exists
        if (sessionCodeSpan) {
            sessionCodeSpan.textContent = `${combinedCode}`;
        }
        
        // Show next rotation time
        const nextRotation = new Date((timeSlot + 1) * 2 * 60 * 1000);
        if (expirySpan) {
            expirySpan.textContent = `Next code: ${nextRotation.toLocaleTimeString()}`;
        }
        
        // Update the prominent banner display
        this.updateSessionBanner(`${combinedCode}`, nextRotation);
        
        // (card already visible above)
        
        // Log QR code generation for debugging
        console.log(`🎯 QR Code generated: ${combinedCode} (expires ${nextRotation.toLocaleTimeString()})`);
        
        // No individual timeouts - master refresh handles this
    }

    // Removed external QR library loading - now using local SimpleQR generator

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
        const expirySpan = document.getElementById('session-expiry');
        
        if (this.currentSession) {
            if (banner) banner.style.display = 'block';
            if (codeSpan) {
                codeSpan.textContent = sessionCode;
            }
            if (expirySpan) {
                expirySpan.textContent = nextRotation.toLocaleTimeString();
            }
            console.log('✅ Banner updated with new code:', sessionCode, 'expires:', nextRotation.toLocaleTimeString());
        } else {
            if (banner) banner.style.display = 'none';
        }
    }

    async refreshLiveAttendance() {
        if (!this.currentSession) {
            document.getElementById('live-attendance-list').innerHTML = '<p>No active session</p>';
            this.updateStats(0, 0, '00:00');
            return;
        }
        
        // Throttle GitHub sync to prevent excessive API calls (max once per 30 seconds)
        const nowTimestamp = Date.now();
        if (!this.lastGitHubSync || (nowTimestamp - this.lastGitHubSync) > 30000) {
            if (window.githubStorage) {
                await window.githubStorage.syncWithGitHub(this.currentSession.code, this.currentSession.date);
                this.lastGitHubSync = nowTimestamp;
            }
        }
        
        const attendanceData = JSON.parse(localStorage.getItem('attendance_data') || '{}');
        console.log('Admin checking attendance data:', {
            currentSession: this.currentSession.code,
            date: this.currentSession.date,
            allData: Object.keys(attendanceData),
            sessionExists: !!attendanceData[this.currentSession.date],
            sessionData: attendanceData[this.currentSession.date]?.[this.currentSession.code]
        });
        
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
            
            let duration = '';
            if (checkOutTime) {
                const durationMs = checkOutTime.getTime() - checkInTime.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = `${hours}h ${minutes}m`;
            } else {
                // Show current duration for present students
                const currentMs = new Date().getTime() - checkInTime.getTime();
                const hours = Math.floor(currentMs / (1000 * 60 * 60));
                const minutes = Math.floor((currentMs % (1000 * 60 * 60)) / (1000 * 60));
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
        const currentTime = new Date();
        const sessionDurationMs = currentTime.getTime() - sessionStart.getTime();
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
            const scheduleTime = Date.now();
            const slotMs = 2 * 60 * 1000; // 2 minutes
            const nextBoundary = Math.ceil(scheduleTime / slotMs) * slotMs;
            const delay = Math.max(0, nextBoundary - scheduleTime + 50); // small buffer
            
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
        const refreshTime = Date.now();
        const slotMs = 2 * 60 * 1000;
        const slot = Math.floor(refreshTime / slotMs);
        this.currentSlot = slot;
        const rotation = this.generateVisualCode(this.currentSession.code, slot);
        this.currentRotationCode = rotation; // visual (suffix) code
        
        // Only re-render if slot changed
        if (this.lastRenderedSlot !== slot) {
            this.generateQRCode();
            this.refreshLiveAttendance();
            this.lastRenderedSlot = slot;
        }
        
        // Update banner with details each tick
        const nextRotation = new Date((slot + 1) * slotMs);
        this.updateSessionBanner(`${this.currentSession.code}-${rotation}`, nextRotation);
        this.showRefreshIndicator();
        console.log('✅ Boundary refresh executed at', new Date().toLocaleTimeString());
    }

    showRefreshIndicator() {
        const banner = document.getElementById('session-code-banner');
        const refreshStatus = document.getElementById('refresh-status');
        
        if (banner && refreshStatus) {
            // Update refresh indicator
            const indicatorTime = new Date();
            const refreshText = document.querySelector('.refresh-text');
            if (refreshText) {
                refreshText.textContent = `Last refresh: ${indicatorTime.toLocaleTimeString()}`;
                
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
        const anonymousModeEl = document.getElementById('anonymous-mode');
        const autoDeleteEl = document.getElementById('auto-delete');
        
        const settings = {
            anonymousMode: anonymousModeEl ? anonymousModeEl.checked : false,
            autoDelete: autoDeleteEl ? autoDeleteEl.checked : false
        };
        
        localStorage.setItem('admin_settings', JSON.stringify(settings));
        this.showMessage('Settings saved', 'success');
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
        
        const anonymousModeEl = document.getElementById('anonymous-mode');
        const autoDeleteEl = document.getElementById('auto-delete');
        
        if (anonymousModeEl) {
            anonymousModeEl.checked = settings.anonymousMode || false;
        }
        if (autoDeleteEl) {
            autoDeleteEl.checked = settings.autoDelete || false;
        }
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
            const checkoutTime = new Date();
            attendanceData[dateKey][sessionCode].students[studentId].checkOut = checkoutTime.toISOString();
            attendanceData[dateKey][sessionCode].students[studentId].manualCheckout = true;
            
            localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
            
            this.hideManualCheckout();
            this.refreshLiveAttendance();
            this.showMessage(`Manually checked out ${studentId} at ${checkoutTime.toLocaleTimeString()}`, 'success');
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
    
    showGitHubSetup() {
        const modal = document.getElementById('github-setup-modal');
        const tokenInput = document.getElementById('github-token');
        const statusDiv = document.getElementById('github-status');
        
        // Pre-fill with existing token if available
        if (window.githubStorage) {
            const existingToken = window.githubStorage.getToken();
            if (existingToken) {
                tokenInput.value = existingToken;
            }
        }
        
        statusDiv.style.display = 'none';
        modal.style.display = 'flex';
        tokenInput.focus();
    }
    
    hideGitHubSetup() {
        const modal = document.getElementById('github-setup-modal');
        modal.style.display = 'none';
    }
    
    async saveGitHubSetup() {
        const tokenInput = document.getElementById('github-token');
        const statusDiv = document.getElementById('github-status');
        const saveBtn = document.getElementById('save-github-setup');
        
        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showGitHubStatus('Please enter a GitHub token', 'error');
            return;
        }
        
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            this.showGitHubStatus('Token should start with "ghp_" or "github_pat_"', 'error');
            return;
        }
        
        saveBtn.textContent = 'Testing...';
        saveBtn.disabled = true;
        
        try {
            // Set the token
            if (window.githubStorage) {
                window.githubStorage.setToken(token);
                
                // Test the token by trying to access the repository
                await window.githubStorage.listFiles('');
                
                this.showGitHubStatus('✅ GitHub token saved and tested successfully!', 'success');
                
                setTimeout(() => {
                    this.hideGitHubSetup();
                }, 2000);
                
            } else {
                throw new Error('GitHub storage not available');
            }
            
        } catch (error) {
            console.error('GitHub setup error:', error);
            this.showGitHubStatus(`❌ Error: ${error.message}. Please check your token and permissions.`, 'error');
        }
        
        saveBtn.textContent = 'Save & Test';
        saveBtn.disabled = false;
    }
    
    showGitHubStatus(message, type) {
        const statusDiv = document.getElementById('github-status');
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        statusDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
        statusDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        statusDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
    }
    
    // ===== ADMIN AUTHENTICATION SYSTEM =====
    
    /**
     * Check if user is authenticated and session is valid
     */
    checkAuthentication() {
        const sessionData = localStorage.getItem('admin_session');
        
        if (!sessionData) {
            console.log('🔒 No admin session found');
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            const now = Date.now();
            
            // Check if session has expired
            if (now > session.expiresAt) {
                console.log('🔒 Admin session expired');
                this.clearSession();
                return false;
            }
            
            // Extend session if it's valid and recent
            if (now > session.expiresAt - (this.securityConfig.SESSION_TIMEOUT / 4)) {
                this.extendSession();
            }
            
            console.log('✅ Admin session valid');
            return true;
            
        } catch (error) {
            console.error('❌ Invalid session data:', error);
            this.clearSession();
            return false;
        }
    }
    
    /**
     * Show login interface
     */
    showLoginInterface() {
        // Hide main admin content
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Create login interface
        const loginHtml = `
            <div id="admin-login" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                display: flex; align-items: center; justify-content: center; z-index: 9999;
            ">
                <div style="
                    background: white; padding: 40px; border-radius: 12px; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
                ">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #1e3a8a; margin: 0 0 10px 0; font-size: 28px;">🔐 Admin Access</h2>
                        <p style="color: #6b7280; margin: 0; font-size: 16px;">Enter your admin password to continue</p>
                    </div>
                    
                    <div id="login-error" style="
                        display: none; background: #fee2e2; border: 1px solid #fecaca; 
                        color: #b91c1c; padding: 12px; border-radius: 6px; margin-bottom: 20px;
                        font-size: 14px; text-align: center;
                    "></div>
                    
                    <div style="margin-bottom: 20px;">
                        <label for="admin-password" style="
                            display: block; margin-bottom: 8px; font-weight: 600; color: #374151;
                        ">Password:</label>
                        <input type="password" id="admin-password" placeholder="Enter admin password" style="
                            width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 6px; 
                            font-size: 16px; box-sizing: border-box;
                        " />
                    </div>
                    
                    <button id="admin-login-btn" style="
                        width: 100%; background: #1e3a8a; color: white; border: none; 
                        padding: 14px; border-radius: 6px; font-size: 16px; font-weight: 600; 
                        cursor: pointer; transition: background 0.2s;
                    " onmouseover="this.style.background='#1e40af'" 
                       onmouseout="this.style.background='#1e3a8a'">
                        🔓 Access Admin Panel
                    </button>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="index.html" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                            ← Back to Student Portal
                        </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                            🛡️ Secure admin access • Session timeout: 4 hours
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginHtml);
        
        // Setup login event listeners
        this.setupLoginEventListeners();
    }
    
    /**
     * Setup event listeners for login interface
     */
    setupLoginEventListeners() {
        const passwordInput = document.getElementById('admin-password');
        const loginBtn = document.getElementById('admin-login-btn');
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.attemptLogin();
                }
            });
            passwordInput.focus();
        }
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.attemptLogin());
        }
    }
    
    /**
     * Attempt to log in with provided password
     */
    async attemptLogin() {
        const passwordInput = document.getElementById('admin-password');
        const loginBtn = document.getElementById('admin-login-btn');
        const errorDiv = document.getElementById('login-error');
        
        if (!passwordInput || !loginBtn) return;
        
        const password = passwordInput.value.trim();
        
        if (!password) {
            this.showLoginError('Please enter a password');
            return;
        }
        
        // Check rate limiting
        if (!this.checkLoginRateLimit()) {
            this.showLoginError('Too many failed attempts. Please wait 15 minutes.');
            return;
        }
        
        // Disable login button during attempt
        loginBtn.disabled = true;
        loginBtn.textContent = '🔄 Verifying...';
        
        try {
            // Hash the password and compare
            const passwordHash = await this.hashPassword(password);
            
            if (passwordHash === this.securityConfig.ADMIN_PASSWORD_HASH) {
                // Successful login
                this.createSession();
                this.hideLoginInterface();
                
                // Initialize the admin panel
                this.initializeAdmin();
                this.setupEventListeners();
                this.loadCurrentSession();
                this.loadSettings();
                
                console.log('✅ Admin login successful');
                
            } else {
                // Failed login
                this.recordFailedLogin();
                this.showLoginError('Invalid password. Please try again.');
                console.log('❌ Admin login failed - invalid password');
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showLoginError('Login error occurred. Please try again.');
        }
        
        // Re-enable login button
        loginBtn.disabled = false;
        loginBtn.textContent = '🔓 Access Admin Panel';
        passwordInput.value = '';
    }
    
    /**
     * Hash password using SHA-256
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Check login rate limiting
     */
    checkLoginRateLimit() {
        const attempts = JSON.parse(localStorage.getItem('admin_login_attempts') || '[]');
        const now = Date.now();
        
        // Clean old attempts
        const validAttempts = attempts.filter(time => now - time < this.securityConfig.LOCKOUT_DURATION);
        
        return validAttempts.length < this.securityConfig.MAX_LOGIN_ATTEMPTS;
    }
    
    /**
     * Record failed login attempt
     */
    recordFailedLogin() {
        const attempts = JSON.parse(localStorage.getItem('admin_login_attempts') || '[]');
        attempts.push(Date.now());
        localStorage.setItem('admin_login_attempts', JSON.stringify(attempts));
    }
    
    /**
     * Show login error message
     */
    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * Create authenticated session
     */
    createSession() {
        const now = Date.now();
        const session = {
            createdAt: now,
            expiresAt: now + this.securityConfig.SESSION_TIMEOUT,
            sessionId: this.generateSessionId()
        };
        
        localStorage.setItem('admin_session', JSON.stringify(session));
        
        // Clear failed login attempts on successful login
        localStorage.removeItem('admin_login_attempts');
    }
    
    /**
     * Extend current session
     */
    extendSession() {
        const sessionData = localStorage.getItem('admin_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            session.expiresAt = Date.now() + this.securityConfig.SESSION_TIMEOUT;
            localStorage.setItem('admin_session', JSON.stringify(session));
            console.log('🔄 Admin session extended');
        }
    }
    
    /**
     * Clear session and logout
     */
    clearSession() {
        localStorage.removeItem('admin_session');
        console.log('🔒 Admin session cleared');
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Hide login interface and show main content
     */
    hideLoginInterface() {
        const loginDiv = document.getElementById('admin-login');
        if (loginDiv) {
            loginDiv.remove();
        }
        
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'block';
        }
    }
    
    /**
     * Logout function
     */
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.clearSession();
            window.location.reload();
        }
    }
    
    /**
     * Start session monitoring for automatic logout
     */
    startSessionMonitoring() {
        // Check session validity every minute
        this.sessionMonitorInterval = setInterval(() => {
            if (!this.checkAuthentication()) {
                console.log('🔒 Session expired - redirecting to login');
                this.clearSession();
                window.location.reload();
            }
        }, 60000); // Check every minute
        
        console.log('🕐 Session monitoring started');
    }
    
    /**
     * Stop session monitoring
     */
    stopSessionMonitoring() {
        if (this.sessionMonitorInterval) {
            clearInterval(this.sessionMonitorInterval);
            this.sessionMonitorInterval = null;
            console.log('🛑 Session monitoring stopped');
        }
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing AttendanceAdmin...');
    try {
        new AttendanceAdmin();
        console.log('✅ AttendanceAdmin initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize AttendanceAdmin:', error);
    }
});
