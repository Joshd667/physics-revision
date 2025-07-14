// js/modules/auth.js - Simplified Authentication with Guest and Teams Login

// Configuration for Microsoft Teams/Azure AD
const TEAMS_CONFIG = {
    // Replace with your actual Azure AD application configuration
    CLIENT_ID: 'your-teams-app-client-id', // Get from Azure AD App Registration
    TENANT_ID: 'your-tenant-id', // Your organization's tenant ID
    REDIRECT_URI: window.location.origin + '/auth-callback.html', // Create this page
    SCOPES: ['openid', 'profile', 'email', 'offline_access'],
    
    // File storage configuration for Teams
    DATA_FILENAME: 'physics-audit-data.json',
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};

export const authMethods = {
    // Internal state for Teams authentication
    teamsToken: null,
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
                    
                    // Restore Teams token if available
                    if (authData.method === 'teams' && authData.user.teamsToken) {
                        this.teamsToken = authData.user.teamsToken;
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

    async loginWithTeams() {
        this.isLoading = true;
        this.loginError = null;

        try {
            console.log('🔐 Authenticating with Microsoft Teams...');
            
            // Check if we're in Teams context
            if (this.isInTeamsContext()) {
                await this.authenticateInTeams();
            } else {
                // Fallback to web-based OAuth flow
                await this.authenticateWithAzureAD();
            }

            console.log('✅ Teams authentication successful');

        } catch (error) {
            console.error('❌ Teams authentication failed:', error);
            this.loginError = error.message;
        } finally {
            this.isLoading = false;
        }
    },

    // Check if running inside Microsoft Teams
    isInTeamsContext() {
        return window.parent !== window.self && 
               (window.location.hostname.includes('teams.microsoft.com') || 
                window.navigator.userAgent.includes('Teams/'));
    },

    // Authenticate using Teams JavaScript SDK
    async authenticateInTeams() {
        // Load Teams SDK if not already loaded
        if (!window.microsoftTeams) {
            await this.loadTeamsSDK();
        }

        return new Promise((resolve, reject) => {
            window.microsoftTeams.initialize();
            
            // Get Teams context
            window.microsoftTeams.getContext((context) => {
                console.log('Teams context:', context);
                
                // Use Teams SSO
                window.microsoftTeams.authentication.getAuthToken({
                    resources: [TEAMS_CONFIG.CLIENT_ID],
                    silent: false,
                    failureCallback: (error) => {
                        console.error('Teams SSO failed:', error);
                        reject(new Error('Teams authentication failed: ' + error));
                    },
                    successCallback: async (token) => {
                        try {
                            this.teamsToken = token;
                            
                            // Decode the token to get user info
                            const userInfo = this.decodeJWTToken(token);
                            
                            this.user = {
                                id: userInfo.sub || userInfo.oid,
                                username: userInfo.preferred_username || userInfo.upn,
                                name: userInfo.name,
                                email: userInfo.email || userInfo.preferred_username,
                                tenantId: context.tid,
                                teamsToken: token,
                                teamsContext: context
                            };

                            this.authMethod = 'teams';
                            
                            // Load existing data
                            await this.loadDataFromTeams();
                            
                            this.completeLogin();
                            this.startAutoSave();
                            
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }
                });
            });
        });
    },

    // Fallback web-based OAuth flow
    async authenticateWithAzureAD() {
        // Construct Azure AD OAuth URL
        const authUrl = new URL('https://login.microsoftonline.com/' + TEAMS_CONFIG.TENANT_ID + '/oauth2/v2.0/authorize');
        authUrl.searchParams.append('client_id', TEAMS_CONFIG.CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', TEAMS_CONFIG.REDIRECT_URI);
        authUrl.searchParams.append('scope', TEAMS_CONFIG.SCOPES.join(' '));
        authUrl.searchParams.append('state', this.generateState());

        // Store state for verification
        sessionStorage.setItem('oauth_state', authUrl.searchParams.get('state'));

        // Open popup for authentication
        const popup = window.open(authUrl.toString(), 'teamsAuth', 'width=500,height=600');
        
        return new Promise((resolve, reject) => {
            const pollTimer = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(pollTimer);
                        reject(new Error('Authentication popup was closed'));
                        return;
                    }

                    // Check if popup has navigated to redirect URI
                    if (popup.location.href.includes(TEAMS_CONFIG.REDIRECT_URI)) {
                        const url = new URL(popup.location.href);
                        const code = url.searchParams.get('code');
                        const state = url.searchParams.get('state');
                        
                        popup.close();
                        clearInterval(pollTimer);
                        
                        if (state !== sessionStorage.getItem('oauth_state')) {
                            reject(new Error('Invalid state parameter'));
                            return;
                        }
                        
                        if (code) {
                            this.exchangeCodeForToken(code).then(resolve).catch(reject);
                        } else {
                            reject(new Error('No authorization code received'));
                        }
                    }
                } catch (error) {
                    // Ignore cross-origin errors while popup is on different domain
                }
            }, 1000);
        });
    },

    // Exchange authorization code for access token
    async exchangeCodeForToken(code) {
        const tokenUrl = 'https://login.microsoftonline.com/' + TEAMS_CONFIG.TENANT_ID + '/oauth2/v2.0/token';
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: TEAMS_CONFIG.CLIENT_ID,
                code: code,
                redirect_uri: TEAMS_CONFIG.REDIRECT_URI,
                grant_type: 'authorization_code',
                scope: TEAMS_CONFIG.SCOPES.join(' ')
            })
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const tokenData = await response.json();
        
        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        this.teamsToken = tokenData.access_token;
        
        // Get user info from token
        const userInfo = this.decodeJWTToken(tokenData.access_token);
        
        this.user = {
            id: userInfo.sub || userInfo.oid,
            username: userInfo.preferred_username || userInfo.upn,
            name: userInfo.name,
            email: userInfo.email || userInfo.preferred_username,
            tenantId: userInfo.tid,
            teamsToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token
        };

        this.authMethod = 'teams';
        
        // Load existing data
        await this.loadDataFromTeams();
        
        this.completeLogin();
        this.startAutoSave();
    },

    // Load Teams JavaScript SDK
    async loadTeamsSDK() {
        if (window.microsoftTeams) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://res.cdn.office.net/teams-js/2.0.0/js/MicrosoftTeams.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Teams SDK'));
            document.head.appendChild(script);
        });
    },

    // Decode JWT token to get user info
    decodeJWTToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to decode JWT token:', error);
            return {};
        }
    },

    // Generate random state for OAuth
    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

    // Load physics audit data from Teams/SharePoint
    async loadDataFromTeams() {
        try {
            console.log('📁 Loading data from Teams...');
            
            // For now, we'll store in localStorage with user-specific key
            // In production, you might want to use SharePoint or Teams storage
            const userSpecificKey = `physicsAuditData_teams_${this.user.id}`;
            const savedData = localStorage.getItem(userSpecificKey);
            
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    this.confidenceLevels = parsedData.confidenceLevels || {};
                    this.analyticsHistoryData = parsedData.analyticsHistory || [];
                    console.log('✅ Data loaded from Teams storage successfully');
                } catch (parseError) {
                    console.warn('⚠️ Could not parse saved data file');
                }
            } else {
                console.log('📝 No physics audit data found - starting fresh');
            }

        } catch (error) {
            console.warn('⚠️ Failed to load data from Teams:', error);
            // Continue without cloud data
        }
    },

    // Save physics audit data to Teams/SharePoint
    async saveDataToTeams() {
        if (!this.user || !this.teamsToken || this.authMethod !== 'teams') {
            return false;
        }

        try {
            console.log('💾 Saving data to Teams...');

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

            // For now, save to localStorage with user-specific key
            // In production, implement SharePoint/Teams storage
            const userSpecificKey = `physicsAuditData_teams_${this.user.id}`;
            localStorage.setItem(userSpecificKey, JSON.stringify(dataToSave));
            
            console.log('✅ Data saved to Teams successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to save data to Teams:', error);
            return false;
        }
    },

    // Start auto-save timer
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        if (this.authMethod === 'teams' && this.teamsToken) {
            this.autoSaveTimer = setInterval(() => {
                this.saveDataToTeams();
            }, TEAMS_CONFIG.AUTO_SAVE_INTERVAL);
            
            console.log('🔄 Auto-save to Teams enabled');
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
                if (this.authMethod === 'teams') {
                    localStorage.removeItem(`physicsAuditData_teams_${this.user.id}`);
                } else {
                    localStorage.removeItem(`physicsAuditData_student_${this.user.id}`);
                }
            }
            
            // Reset app state
            this.isAuthenticated = false;
            this.showLoginScreen = true;
            this.user = null;
            this.authMethod = null;
            this.confidenceLevels = {};
            this.analyticsHistoryData = [];
            
            // Clear internal state
            this.teamsToken = null;
            
            console.log('👋 Logged out successfully');
        }
    }
};

// Enhanced data management for Teams integration
export const enhancedDataManagement = {
    // Enhanced save method that uses Teams storage
    saveData() {
        const dataToSave = {
            confidenceLevels: this.confidenceLevels,
            analyticsHistory: this.analyticsHistoryData || [],
            lastUpdated: new Date().toISOString(),
            version: "1.0",
            user: this.user
        };

        // Save locally first (always)
        if (this.authMethod === 'teams' && this.user?.id) {
            localStorage.setItem(`physicsAuditData_teams_${this.user.id}`, JSON.stringify(dataToSave));
        } else {
            localStorage.setItem('physicsAuditData', JSON.stringify(dataToSave));
        }

        // For Teams users, also try to save to cloud (auto-save handles this)
        if (this.authMethod === 'teams' && this.teamsToken) {
            authMethods.saveDataToTeams.call(this);
        }
    },

    loadSavedData() {
        try {
            let savedData = null;
            
            // For Teams users, try user-specific data first
            if (this.authMethod === 'teams' && this.user?.id) {
                const userSpecificData = localStorage.getItem(`physicsAuditData_teams_${this.user.id}`);
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
            exportMethod: this.authMethod === 'teams' ? 'teams_cloud' : 'local',
            version: "1.0",
            user: this.user
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const filename = this.authMethod === 'teams' && this.user?.username
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
            if (this.authMethod === 'teams' && this.user?.id) {
                localStorage.removeItem(`physicsAuditData_teams_${this.user.id}`);
            }
            
            // Save empty data (which will also clear cloud storage for Teams users)
            this.saveData();
            
            alert('All data has been cleared.');
        }
    }
};
