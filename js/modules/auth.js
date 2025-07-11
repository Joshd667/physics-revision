// js/modules/auth.js - Enhanced Moodle Authentication with File Storage

// Configuration - UPDATE THESE WITH YOUR MOODLE SETTINGS
const MOODLE_CONFIG = {
    // Replace with your actual Moodle site URL
    ALLOWED_MOODLE_SITES: [
        'https://7b54506350adb640d68ffd2c6a763064-11784.sites.k-hosting.co.uk/',
        // Add more allowed Moodle sites here
    ],
    
    // File name for storing the physics audit data
    DATA_FILENAME: 'physics-audit-data.json',
    
    // Auto-save interval (in milliseconds)
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};

export const authMethods = {
    // Internal state for Moodle authentication
    moodleToken: null,
    autoSaveTimer: null,

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
                    
                    // Restore Moodle token if available
                    if (authData.method === 'moodle' && authData.user.moodleToken) {
                        this.moodleToken = authData.user.moodleToken;
                        this.startAutoSave();
                    }
                    
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
            console.log('🔐 Authenticating with Moodle...');
            
            // Validate Moodle URL
            if (!this.isValidMoodleUrl(moodleUrl)) {
                throw new Error('Invalid Moodle site. Please use your school\'s official Moodle URL.');
            }
            
            // Step 1: Get authentication token from Moodle
            const tokenResponse = await fetch(`${moodleUrl}/login/token.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: username,
                    password: password,
                    service: 'moodle_mobile_app'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Connection failed: ${tokenResponse.status}. Check your Moodle URL.`);
            }

            const tokenData = await tokenResponse.json();
            
            if (tokenData.error) {
                throw new Error(tokenData.error);
            }

            if (!tokenData.token) {
                throw new Error('Invalid username or password');
            }

            this.moodleToken = tokenData.token;

            // Step 2: Get user information
            const userInfo = await this.getMoodleUserInfo(moodleUrl);
            
            // Step 3: Set up user session
            this.user = {
                id: userInfo.userid,
                username: userInfo.username,
                name: `${userInfo.firstname} ${userInfo.lastname}`,
                email: userInfo.email,
                moodleUrl: moodleUrl,
                moodleToken: this.moodleToken
            };

            this.authMethod = 'moodle';

            // Step 4: Load existing data from Moodle
            await this.loadDataFromMoodle();

            // Step 5: Complete login
            this.completeLogin();

            // Start auto-save
            this.startAutoSave();

            console.log('✅ Moodle authentication successful');

        } catch (error) {
            console.error('❌ Moodle authentication failed:', error);
            this.loginError = error.message;
        } finally {
            this.isLoading = false;
        }
    },

    // Validate Moodle URL against allowed sites
    isValidMoodleUrl(url) {
        try {
            const urlObj = new URL(url);
            return MOODLE_CONFIG.ALLOWED_MOODLE_SITES.some(allowed => {
                const allowedObj = new URL(allowed);
                return urlObj.hostname === allowedObj.hostname;
            });
        } catch {
            return false;
        }
    },

    // Get user info from Moodle
    async getMoodleUserInfo(moodleUrl) {
        const response = await fetch(`${moodleUrl}/webservice/rest/server.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                wstoken: this.moodleToken,
                wsfunction: 'core_webservice_get_site_info',
                moodlewsrestformat: 'json'
            })
        });

        const data = await response.json();
        
        if (data.exception) {
            throw new Error(data.message || 'Failed to get user info');
        }

        return data;
    },

    // Load physics audit data from Moodle user files
    async loadDataFromMoodle() {
        try {
            console.log('📁 Loading data from Moodle...');

            // Get list of user's private files
            const filesResponse = await fetch(`${this.user.moodleUrl}/webservice/rest/server.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    wstoken: this.moodleToken,
                    wsfunction: 'core_files_get_files',
                    moodlewsrestformat: 'json',
                    contextid: -1, // User context
                    component: 'user',
                    filearea: 'private',
                    itemid: 0,
                    filepath: '/',
                    filename: ''
                })
            });

            const filesData = await filesResponse.json();
            
            if (filesData.exception) {
                console.log('📝 No existing data file found - starting fresh');
                return;
            }

            // Look for our data file
            const dataFile = filesData.files?.find(file => 
                file.filename === MOODLE_CONFIG.DATA_FILENAME
            );

            if (dataFile) {
                // Download and parse the data file
                const fileResponse = await fetch(dataFile.fileurl + '&token=' + this.moodleToken);
                const jsonData = await fileResponse.text();
                
                try {
                    const savedData = JSON.parse(jsonData);
                    
                    // Load the data into the app
                    this.confidenceLevels = savedData.confidenceLevels || {};
                    this.analyticsHistoryData = savedData.analyticsHistory || [];
                    
                    console.log('✅ Data loaded from Moodle successfully');
                } catch (parseError) {
                    console.warn('⚠️ Could not parse saved data file');
                }
            } else {
                console.log('📝 No physics audit data file found - starting fresh');
            }

        } catch (error) {
            console.warn('⚠️ Failed to load data from Moodle:', error);
            // Continue without cloud data
        }
    },

    // Save physics audit data to Moodle user files
    async saveDataToMoodle() {
        if (!this.user || !this.moodleToken || this.authMethod !== 'moodle') {
            return false;
        }

        try {
            console.log('💾 Saving data to Moodle...');

            // Prepare the data to save
            const dataToSave = {
                confidenceLevels: this.confidenceLevels,
                analyticsHistory: this.analyticsHistoryData || [],
                lastUpdated: new Date().toISOString(),
                version: "1.0",
                user: {
                    id: this.user.id,
                    name: this.user.name,
                    email: this.user.email
                }
            };

            const jsonString = JSON.stringify(dataToSave, null, 2);
            
            // Create a blob from the JSON data
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Prepare form data for file upload
            const formData = new FormData();
            formData.append('token', this.moodleToken);
            formData.append('component', 'user');
            formData.append('filearea', 'private');
            formData.append('itemid', '0');
            formData.append('filepath', '/');
            formData.append('filename', MOODLE_CONFIG.DATA_FILENAME);
            formData.append('file_1', blob, MOODLE_CONFIG.DATA_FILENAME);

            // Upload the file to Moodle
            const uploadResponse = await fetch(`${this.user.moodleUrl}/webservice/upload.php`, {
                method: 'POST',
                body: formData
            });

            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.error) {
                throw new Error(uploadResult.error);
            }

            console.log('✅ Data saved to Moodle successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to save data to Moodle:', error);
            return false;
        }
    },

    // Start auto-save timer
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        if (this.authMethod === 'moodle' && this.moodleToken) {
            this.autoSaveTimer = setInterval(() => {
                this.saveDataToMoodle();
            }, MOODLE_CONFIG.AUTO_SAVE_INTERVAL);
            
            console.log('🔄 Auto-save to Moodle enabled');
        }
    },

    // Stop auto-save timer
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('⏹️ Auto-save stopped');
        }
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
        if (confirm('Are you sure you want to logout? Your data has been saved.')) {
            // Stop auto-save
            this.stopAutoSave();
            
            // Clear authentication
            localStorage.removeItem('physicsAuditAuth');
            
            // Clear user-specific data if it exists
            if (this.user?.id) {
                localStorage.removeItem(`physicsAuditData_student_${this.user.id}`);
            }
            
            // Reset app state
            this.isAuthenticated = false;
            this.showLoginScreen = true;
            this.user = null;
            this.authMethod = null;
            this.confidenceLevels = {};
            this.analyticsHistoryData = [];
            
            // Clear internal state
            this.moodleToken = null;
            
            console.log('👋 Logged out successfully');
        }
    }
};

// Enhanced data management for Moodle integration
export const enhancedDataManagement = {
    // Enhanced save method that uses Moodle cloud storage
    saveData() {
        const dataToSave = {
            confidenceLevels: this.confidenceLevels,
            analyticsHistory: this.analyticsHistoryData || [],
            lastUpdated: new Date().toISOString(),
            version: "1.0",
            user: this.user
        };

        // Save locally first (always)
        if (this.authMethod === 'moodle' && this.user?.id) {
            localStorage.setItem(`physicsAuditData_student_${this.user.id}`, JSON.stringify(dataToSave));
        } else {
            localStorage.setItem('physicsAuditData', JSON.stringify(dataToSave));
        }

        // For Moodle users, also try to save to cloud (auto-save handles this)
        // Manual save to cloud happens immediately
        if (this.authMethod === 'moodle' && this.moodleToken) {
            authMethods.saveDataToMoodle.call(this);
        }
    },

    loadSavedData() {
        try {
            let savedData = null;
            
            // For Moodle users, try user-specific data first
            if (this.authMethod === 'moodle' && this.user?.id) {
                const userSpecificData = localStorage.getItem(`physicsAuditData_student_${this.user.id}`);
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
                this.analyticsHistoryData = savedData.analyticsHistory || [];
            }
        } catch (error) {
            console.warn('Could not load saved data:', error);
            this.confidenceLevels = {};
            this.analyticsHistoryData = [];
        }
    },

    exportDataBackup() {
        const dataToExport = {
            confidenceLevels: this.confidenceLevels,
            analyticsHistory: this.analyticsHistoryData || [],
            exportDate: new Date().toISOString(),
            exportMethod: this.authMethod === 'moodle' ? 'moodle_cloud' : 'local',
            version: "1.0",
            user: this.user
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const filename = this.authMethod === 'moodle' && this.user?.username
            ? `physics-audit-backup-${this.user.username}-${new Date().toISOString().split('T')[0]}.json`
            : `physics-audit-backup-${new Date().toISOString().split('T')[0]}.json`;
            
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    importDataBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.confidenceLevels) {
                    if (confirm('This will replace your current confidence ratings. Are you sure?')) {
                        this.confidenceLevels = importedData.confidenceLevels;
                        this.analyticsHistoryData = importedData.analyticsHistory || [];
                        this.saveData();
                        alert('Data imported successfully!');
                    }
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (error) {
                alert('Error reading backup file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL your confidence ratings? This cannot be undone.')) {
            this.confidenceLevels = {};
            this.analyticsHistoryData = [];
            
            // Clear local storage
            localStorage.removeItem('physicsAuditData');
            if (this.authMethod === 'moodle' && this.user?.id) {
                localStorage.removeItem(`physicsAuditData_student_${this.user.id}`);
            }
            
            // Save empty data (which will also clear cloud storage for Moodle users)
            this.saveData();
            
            alert('All data has been cleared.');
        }
    }
};
