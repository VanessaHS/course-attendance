/**
 * GitHub-based Storage System
 * Uses GitHub repository as a zero-cost database for attendance data
 * Enables real-time sync across all devices (student mobile + admin desktop)
 */

class GitHubStorage {
    constructor() {
        // GitHub repository configuration
        this.owner = 'VanessaHS';
        this.repo = 'course-attendance';
        this.branch = 'main';
        this.dataPath = 'attendance-data';
        
        // GitHub API configuration
        this.apiBase = 'https://api.github.com';
        this.token = null; // Will be set by admin
        
        // Cache for performance
        this.cache = new Map();
        this.lastSync = 0;
    }
    
    /**
     * Initialize with GitHub token (admin only)
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }
    
    /**
     * Get stored token
     */
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('github_token');
        }
        return this.token;
    }
    
    /**
     * Save attendance record to GitHub
     */
    async saveAttendance(sessionCode, studentId, action, timestamp, additionalData = {}) {
        if (!this.token) {
            console.error('❌ GitHub token not configured');
            throw new Error('GitHub token not configured. Please set up GitHub sync first.');
        }
        
        console.log('🔧 GitHub saveAttendance called:', { sessionCode, studentId, action });
        try {
            const fileName = `${sessionCode}_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${this.dataPath}/${fileName}`;
            
            console.log('📁 GitHub file details:', {
                fileName,
                filePath,
                repo: `${this.owner}/${this.repo}`,
                token: this.token ? `${this.token.substring(0, 8)}...` : 'NONE'
            });
            
            // Get existing file content
            let existingData = {};
            try {
                const existing = await this.getFile(filePath);
                if (existing) {
                    existingData = JSON.parse(existing.content);
                }
            } catch (e) {
                // File doesn't exist yet, start fresh
                existingData = {
                    sessionCode: sessionCode,
                    date: new Date().toISOString().split('T')[0],
                    students: {}
                };
            }
            
            // Add/update student record
            if (!existingData.students[studentId]) {
                existingData.students[studentId] = {};
            }
            
            if (action === 'checkin') {
                existingData.students[studentId].checkIn = timestamp;
                existingData.students[studentId].checkOut = null;
            } else if (action === 'checkout') {
                existingData.students[studentId].checkOut = timestamp;
            }
            
            // Add any additional data
            Object.assign(existingData.students[studentId], additionalData);
            
            // Save back to GitHub
            const result = await this.saveFile(filePath, JSON.stringify(existingData, null, 2), `${action}: ${studentId} at ${new Date(timestamp).toLocaleTimeString()}`);
            
            console.log(`✅ Attendance saved to GitHub: ${studentId} ${action}`, {
                fileName,
                filePath,
                result: result ? 'SUCCESS' : 'FAILED'
            });
            return true;
            
        } catch (error) {
            console.error('❌ Failed to save attendance to GitHub:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
                url: error.url || 'unknown',
                stack: error.stack
            });
            
            // Show user-friendly error
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                console.error('🔒 GitHub token permissions issue - check token has "repo" access');
            } else if (error.message.includes('404')) {
                console.error('📁 Repository not found - check owner/repo names');
            } else if (error.message.includes('401')) {
                console.error('🔑 GitHub token invalid or expired');
            }
            
            // Fall back to localStorage
            this.saveToLocalStorage(sessionCode, studentId, action, timestamp, additionalData);
            throw error; // Re-throw so mobile can show the error
        }
    }
    
    /**
     * Load attendance data from GitHub
     */
    async loadAttendance(sessionCode, date) {
        try {
            const fileName = `${sessionCode}_${date}.json`;
            const filePath = `${this.dataPath}/${fileName}`;
            
            const file = await this.getFile(filePath);
            if (file) {
                const data = JSON.parse(file.content);
                console.log(`✅ Loaded attendance from GitHub: ${Object.keys(data.students || {}).length} students`);
                return data;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Failed to load attendance from GitHub:', error);
            return null;
        }
    }
    
    /**
     * Get all attendance files for a date range
     */
    async getAllAttendance(startDate, endDate) {
        try {
            const files = await this.listFiles(this.dataPath);
            const attendanceFiles = files.filter(file => 
                file.name.endsWith('.json') && 
                file.name.includes('_')
            );
            
            const allData = {};
            for (const file of attendanceFiles) {
                try {
                    const content = await this.getFile(file.path);
                    if (content) {
                        const data = JSON.parse(content.content);
                        allData[file.name] = data;
                    }
                } catch (e) {
                    console.warn('Failed to load file:', file.name, e);
                }
            }
            
            return allData;
            
        } catch (error) {
            console.error('❌ Failed to load all attendance:', error);
            return {};
        }
    }
    
    /**
     * GitHub API: Get file content
     */
    async getFile(path) {
        const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        if (response.status === 404) {
            return null; // File doesn't exist
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            content: atob(data.content),
            sha: data.sha
        };
    }
    
    /**
     * GitHub API: Save file content
     */
    async saveFile(path, content, commitMessage) {
        // First try to get existing file to get SHA
        let sha = null;
        try {
            const existing = await this.getFile(path);
            if (existing) {
                sha = existing.sha;
            }
        } catch (e) {
            // File doesn't exist, no SHA needed
        }
        
        const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
        const body = {
            message: commitMessage,
            content: btoa(content),
            branch: this.branch
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * GitHub API: List files in directory
     */
    async listFiles(path) {
        const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        if (response.status === 404) {
            return []; // Directory doesn't exist
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Get GitHub API headers
     */
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Course-Attendance-App'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        
        return headers;
    }
    
    /**
     * Fallback: Save to localStorage when GitHub fails
     */
    saveToLocalStorage(sessionCode, studentId, action, timestamp, additionalData) {
        try {
            const attendanceData = JSON.parse(localStorage.getItem('attendance_data') || '{}');
            const date = new Date(timestamp).toISOString().split('T')[0];
            
            if (!attendanceData[date]) {
                attendanceData[date] = {};
            }
            
            if (!attendanceData[date][sessionCode]) {
                attendanceData[date][sessionCode] = {
                    sessionInfo: { code: sessionCode, date: date },
                    students: {}
                };
            }
            
            if (!attendanceData[date][sessionCode].students[studentId]) {
                attendanceData[date][sessionCode].students[studentId] = {};
            }
            
            if (action === 'checkin') {
                attendanceData[date][sessionCode].students[studentId].checkIn = timestamp;
                attendanceData[date][sessionCode].students[studentId].checkOut = null;
            } else if (action === 'checkout') {
                attendanceData[date][sessionCode].students[studentId].checkOut = timestamp;
            }
            
            Object.assign(attendanceData[date][sessionCode].students[studentId], additionalData);
            
            localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
            console.log('📦 Saved to localStorage as fallback');
            
        } catch (error) {
            console.error('❌ Failed to save to localStorage:', error);
        }
    }
    
    /**
     * Sync localStorage with GitHub data
     */
    async syncWithGitHub(sessionCode, date) {
        try {
            const githubData = await this.loadAttendance(sessionCode, date);
            if (githubData) {
                // Update localStorage with GitHub data
                const attendanceData = JSON.parse(localStorage.getItem('attendance_data') || '{}');
                
                if (!attendanceData[date]) {
                    attendanceData[date] = {};
                }
                
                attendanceData[date][sessionCode] = {
                    sessionInfo: { code: sessionCode, date: date },
                    students: githubData.students || {}
                };
                
                localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
                console.log('🔄 Synced localStorage with GitHub data');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Failed to sync with GitHub:', error);
        }
        
        return false;
    }
}

// Create global instance
window.githubStorage = new GitHubStorage();
