// js/modules/auth.js - Enhanced Moodle Authentication

// Configuration - UPDATE THESE WITH YOUR MOODLE SETTINGS
const MOODLE_CONFIG = {
    // Replace with your actual Moodle site URL
    ALLOWED_MOODLE_URL: 'https://moodle.yourschool.edu',
    
    // Replace with your Moodle Web Services token
    MOODLE_WS_TOKEN: 'your_moodle_webservice_token_here',
    
    // Replace with your specific course IDs where students should be enrolled
    ALLOWED_COURSE_IDS: [123, 456], // Your Physics course IDs
    
    // Backend API URL (you'll need to create this)
    BACKEND_API_URL: 'https://your-backend-api.com/api',
};

export const authMethods = {
    checkExistingAuth() {
        const savedAuth = localStorage.getItem('physicsAuditAuth');
        if (savedAuth) {
            try {
                const authData = JSON.parse(savedAuth);
                if (authData.expires > Date.now()) {
                    this.user = authData.user;
                    this.authMethod = authData.method;
                    this.isAuthenticated = true;
                    this.showLoginScreen = false;
                    this.loadSavedData();
                    return;
                }
            } catch (error) {
                localStorage.removeItem('physicsAuditAuth');
            }
        }
        this.showLoginScreen = true;
    },

    async loginWithMoodle(username, password, moodleUrl) {
        this.isLoading = true;
        this.loginError = null;

        try {
            // Validate Moodle URL
            if (moodleUrl !== MOODLE_CONFIG.ALLOWED_MOODLE_URL) {
                throw new Error('Invalid Moodle site. Please use the correct school Moodle URL.');
            }

            // For security, authentication should happen on your backend
            // This is a simplified version - you'll need to implement proper backend authentication
            const authResult = await this.authenticateWithMoodleBackend(username, password, moodleUrl);
            
            if (authResult.success) {
                this.user = {
                    id: authResult.user.id,
                    username: authResult.user.username,
                    name: authResult.user.firstname + ' ' + authResult.user.lastname,
                    email: authResult.user.email,
                    moodleId: authResult.user.id,
                    courses: authResult.user.courses || [],
                    moodleUrl: moodleUrl
                };
                this.authMethod = 'moodle';
                this.completeLogin();
            } else {
                throw new Error(authResult.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Moodle login error:', error);
            this.loginError = error.message || 'Failed to connect to Moodle. Please check your credentials.';
        } finally {
            this.isLoading = false;
        }
    },

    async authenticateWithMoodleBackend(username, password, moodleUrl) {
        // THIS IS A MOCK IMPLEMENTATION
        // In production, you need to implement a secure backend that:
        // 1. Validates credentials against Moodle Web Services
        // 2. Checks course enrollment
        // 3. Returns user information securely

        // For now, this is a placeholder that simulates the authentication
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock validation - replace with real Moodle Web Services call
                if (username && password && moodleUrl === MOODLE_CONFIG.ALLOWED_MOODLE_URL) {
                    // Simulate different users
                    let user;
                    user = {
                        id: Math.floor(Math.random() * 1000) + 100, // Random student ID
                        username: username,
                        firstname: username.charAt(0).toUpperCase() + username.slice(1),
                        lastname: 'Student',
                        email: username + '@student.school.edu',
                        courses: [MOODLE_CONFIG.ALLOWED_COURSE_IDS[0]] // Enrolled in first course
                    };
                    
                    resolve({
                        success: true,
                        user: user
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Invalid credentials or unauthorized Moodle site'
                    });
                }
            }, 1500); // Simulate network delay
        });
    },

    // ACTUAL MOODLE WEB SERVICES IMPLEMENTATION (for reference)
    async authenticateWithMoodleWebServices(username, password, moodleUrl) {
        // THIS IS WHAT YOU'LL IMPLEMENT ON YOUR BACKEND
        try {
            // Step 1: Get authentication token
            const tokenResponse = await fetch(`${moodleUrl}/login/token.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: username,
                    password: password,
                    service: 'moodle_mobile_app' // or your custom service
                })
            });

            const tokenData = await tokenResponse.json();
            
            if (tokenData.error) {
                throw new Error(tokenData.error);
            }

            // Step 2: Get user information
            const userResponse = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    wstoken: tokenData.token,
                    wsfunction: 'core_webservice_get_site_info',
                    moodlewsrestformat: 'json'
                })
            });

            const userData = await userResponse.json();

            // Step 3: Check course enrollment
            const enrollmentResponse = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    wstoken: tokenData.token,
                    wsfunction: 'core_enrol_get_users_courses',
                    moodlewsrestformat: 'json',
                    userid: userData.userid
                })
            });

            const courses = await enrollmentResponse.json();
            
            // Verify user is enrolled in allowed courses
            const enrolledInAllowedCourse = courses.some(course => 
                MOODLE_CONFIG.ALLOWED_COURSE_IDS.includes(course.id)
            );

            if (!enrolledInAllowedCourse) {
                throw new Error('You are not enrolled in the required Physics course.');
            }

            return {
                success: true,
                user: {
                    id: userData.userid,
                    username: userData.username,
                    firstname: userData.firstname,
                    lastname: userData.lastname,
                    email: userData.email,
                    courses: courses.map(c => c.id),
                    token: tokenData.token
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },

    loginWithGoogle() {
        // Google login hidden but preserved for future use
        this.isLoading = true;
        this.loginError = null;
        setTimeout(() => {
            this.user = { 
                id: 'google_user', 
                name: 'Google User', 
                email: 'user@gmail.com', 
                picture: 'https://via.placeholder.com/32' 
            };
            this.authMethod = 'google';
            this.completeLogin();
            this.isLoading = false;
        }, 1000);
    },

    loginAsGuest() {
        this.user = { 
            id: 'guest', 
            name: 'Guest User',
        };
        this.authMethod = 'local';
        this.completeLogin();
    },

    completeLogin() {
        const authData = { 
            user: this.user, 
            method: this.authMethod, 
            expires: Date.now() + (24 * 60 * 60 * 1000) 
        };
        localStorage.setItem('physicsAuditAuth', JSON.stringify(authData));
        this.isAuthenticated = true;
        this.showLoginScreen = false;
        this.loadSavedData();
    },

    logout() {
        if (confirm('Are you sure you want to logout? Make sure your data is saved.')) {
            localStorage.removeItem('physicsAuditAuth');
            this.isAuthenticated = false;
            this.showLoginScreen = true;
            this.user = null;
            this.authMethod = null;
            this.confidenceLevels = {};
            this.allStudentData = {};
        }
    }
};

// Enhanced data management for Moodle integration
export const enhancedDataManagement = {
    saveData() {
        const dataToSave = {
            confidenceLevels: this.confidenceLevels,
            lastUpdated: new Date().toISOString(),
            version: "1.1",
            user: this.user
        };

        // Save locally
        if (this.authMethod === 'moodle' && this.user) {
            // Save with user-specific key for Moodle users
            localStorage.setItem(`physicsAuditData_student_${this.user.moodleId}`, JSON.stringify(dataToSave));
        } else {
            localStorage.setItem('physicsAuditData', JSON.stringify(dataToSave));
        }

        // For Moodle users, also sync to backend (if implemented)
        if (this.authMethod === 'moodle' && this.user) {
            this.syncToMoodleBackend(dataToSave);
        }
    },

    async syncToMoodleBackend(data) {
        // This would sync student data to your backend
        // Implementation depends on your backend API
        try {
            if (MOODLE_CONFIG.BACKEND_API_URL) {
                await fetch(`${MOODLE_CONFIG.BACKEND_API_URL}/student-progress`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.user.token || 'mock-token'}`
                    },
                    body: JSON.stringify({
                        studentId: this.user.moodleId,
                        data: data
                    })
                });
            }
        } catch (error) {
            console.warn('Failed to sync to backend:', error);
            // Continue working offline
        }
    },

    loadSavedData() {
        try {
            let savedData = null;
            
            if (this.authMethod === 'moodle' && this.user) {
                // Try to load user-specific data first
                const userSpecificData = localStorage.getItem(`physicsAuditData_student_${this.user.moodleId}`);
                if (userSpecificData) {
                    savedData = JSON.parse(userSpecificData);
                }
            }
            
            // Fallback to general data
            if (!savedData) {
                const generalData = localStorage.getItem('physicsAuditData');
                if (generalData) {
                    savedData = JSON.parse(generalData);
                }
            }

            if (savedData) {
                this.confidenceLevels = savedData.confidenceLevels || {};
            }
        } catch (error) {
            console.warn('Could not load saved data:', error);
            this.confidenceLevels = {};
        }
    }
};
