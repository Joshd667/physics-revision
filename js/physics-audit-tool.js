// js/physics-audit-tool.js - Enhanced with CSV Resource Loading
import { authMethods } from './modules/auth.js';
import { searchMethods } from './modules/search.js';
import { dataManagementMethods } from './modules/data-management.js';
import { navigationMethods } from './modules/navigation.js';
import { statisticsMethods } from './modules/statistics.js';
import { uiHelperMethods } from './modules/ui-helpers.js';

export function createPhysicsAuditTool(specificationData, paperModeGroups, specModeGroups, Alpine) {
    return () => ({
        // --- DARK MODE STATE ---
        darkMode: false,
        
        // --- UI & NAVIGATION STATE ---
        selectedPaper: 'All Topics',
        activeSection: 'measurements_errors',
        sidebarVisible: true,
        expandedGroups: {},
        viewMode: 'spec', // 'paper' or 'spec'
        lastExpandedGroup: null,
        showingSpecificSection: false,
        showingMainMenu: true,
        showingRevision: false,
        
        // --- SEARCH STATE ---
        searchVisible: false,
        searchQuery: '',
        searchResults: [],
        
        // --- AUTHENTICATION STATE ---
        isAuthenticated: false,
        showLoginScreen: true,
        user: null,
        authMethod: null,
        authToken: null,
        loginError: null,
        isLoading: false,
        
        // --- REVISION STATE ---
        currentRevisionSection: '',
        currentRevisionSectionTitle: '',
        currentRevisionTopics: [],
        currentRevisionResources: null,

        // --- ANALYTICS STATE ---
        showingAnalytics: false,
        analyticsData: null,
        analyticsHistoryData: [],
        criticalTopicsPage: 0,
        strongTopicsPage: 0,
        recommendationsPage: 0,
        
        // --- DATA ---
        specificationData: specificationData,
        paperModeGroups: paperModeGroups,
        specModeGroups: specModeGroups,
        confidenceLevels: {}, // User-specific data
        confidenceScale: [
            { value: 1, label: "1", description: "Not confident", color: "bg-red-500" },
            { value: 2, label: "2", description: "Low confidence", color: "bg-orange-500" },
            { value: 3, label: "3", description: "Moderate confidence", color: "bg-yellow-500" },
            { value: 4, label: "4", description: "Good confidence", color: "bg-blue-500" },
            { value: 5, label: "5", description: "Very confident", color: "bg-green-500" }
        ],

        // --- COMPUTED PROPERTIES ---
        get currentGroups() {
            return this.viewMode === 'spec' ? this.specModeGroups["All Topics"] : this.paperModeGroups[this.selectedPaper] || [];
        },
        get currentSection() {
            return this.specificationData[this.activeSection];
        },
        get availablePapers() {
            return this.viewMode === 'paper' ? ['Paper 1', 'Paper 2'] : ['All Topics'];
        },

        get bannerTitle() {
            if (this.showingAnalytics) {
                // Analytics dashboard
                return 'Learning Analytics Dashboard';
            } else if (this.showingRevision) {
                // Revision level - show revision section title
                return 'Revision: ' + this.currentRevisionSectionTitle;
            } else if (this.showingMainMenu) {
                // Main menu level - show view mode
                if (this.viewMode === 'spec') {
                    return 'Physics Specification';
                } else {
                    return this.selectedPaper;
                }
            } else if (this.showSectionCards()) {
                // Group cards level - show group title
                return this.lastExpandedGroup;
            } else if (this.showingSpecificSection && this.currentSection) {
                // Section level - show section title (current behavior)
                return this.currentSection.title;
            } else {
                // Fallback
                return 'Physics Audit';
            }
        },
        get bannerIcon() {
            if (this.showingAnalytics) {
                return 'bar-chart-3';
            } else if (this.showingRevision) {
                return 'book-open';
            } else if (this.showingMainMenu) {
                return this.viewMode === 'spec' ? 'book-open' : 'files';
            } else if (this.showSectionCards()) {
                const group = this.currentGroups.find(item => item.type === 'group' && item.title === this.lastExpandedGroup);
                return group?.icon || 'folder';
            } else if (this.showingSpecificSection && this.currentSection) {
                return this.currentSection.icon;
            } else {
                return 'book-open';
            }
        },
                
        // --- INITIALIZATION ---
        init() {
            window.physicsAuditApp = this; // For debugging
            this.checkExistingAuth();
            
            const savedDarkMode = localStorage.getItem('darkMode');
            this.darkMode = savedDarkMode !== null ? (savedDarkMode === 'true') : window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyDarkMode();
            
            this.sidebarVisible = true;
            window.addEventListener('resize', () => { if (window.innerWidth >= 768) this.sidebarVisible = true; });

            // Set up watchers
            this.$watch('darkMode', () => {
                this.applyDarkMode();
                localStorage.setItem('darkMode', this.darkMode);
            });
            this.$watch('viewMode', () => {
                if (this.viewMode === 'spec') this.selectedPaper = 'All Topics';
                else if (!['Paper 1', 'Paper 2'].includes(this.selectedPaper)) this.selectedPaper = 'Paper 1';
            });
            this.$watch('confidenceLevels', () => this.saveData(), { deep: true });
            
            // Re-create icons on content changes
            this.$watch('activeSection', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('currentGroups', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('showingRevision', () => this.$nextTick(() => lucide.createIcons()));
            this.$nextTick(() => lucide.createIcons());

            // Close analytics when navigating
            this.$watch('activeSection', () => {
                if (this.showingAnalytics) {
                    this.showingAnalytics = false;
                }
            });
            
            this.$watch('showingMainMenu', (newValue) => {
                if (newValue && this.showingAnalytics) {
                    this.showingAnalytics = false;
                }
            });
            
            this.$watch('showingSpecificSection', (newValue) => {
                if (newValue && this.showingAnalytics) {
                    this.showingAnalytics = false;
                }
            });
            
            this.$watch('showingRevision', (newValue) => {
                if (newValue && this.showingAnalytics) {
                    this.showingAnalytics = false;
                }
            });

            // Close analytics when dropdowns are toggled
            this.$watch('expandedGroups', () => {
                if (this.showingAnalytics) {
                    this.showingAnalytics = false;
                }
            }, { deep: true });
        },

        // --- ENHANCED REVISION FUNCTIONALITY ---
        openRevisionForTopic(topicId) {
            console.log('🔍 Opening revision for topic:', topicId);
            
            // Get the revision section from the global mapping
            const section = window.topicToSectionMapping[topicId];
            console.log('🔍 Topic maps to section:', section);
            
            if (section && window.revisionMapping[section]) {
                this.currentRevisionSection = section;
                this.currentRevisionSectionTitle = window.revisionSectionTitles[section] || section;
                this.currentRevisionTopics = this.getTopicsForRevision(window.revisionMapping[section]);
                
                // FIXED: More robust resource loading with debugging
                console.log('🔍 Loading resources for section:', section);
                
                if (window.getResourcesForSection) {
                    try {
                        this.currentRevisionResources = window.getResourcesForSection(section);
                        console.log('✅ Resources loaded:', this.currentRevisionResources);
                        
                        // Debug the resource counts
                        const videoCount = this.currentRevisionResources?.videos?.length || 0;
                        const noteCount = this.currentRevisionResources?.notes?.length || 0;
                        const simCount = this.currentRevisionResources?.simulations?.length || 0;
                        const questionCount = this.currentRevisionResources?.questions?.length || 0;
                        
                        console.log(`📊 Resource summary: ${videoCount} videos, ${noteCount} notes, ${simCount} sims, ${questionCount} questions`);
                        
                        // Show first video if available for debugging
                        if (videoCount > 0) {
                            console.log('📹 First video:', this.currentRevisionResources.videos[0]);
                        }
                        
                    } catch (error) {
                        console.error('❌ Error loading resources:', error);
                        this.currentRevisionResources = {
                            section: null,
                            videos: [],
                            notes: [],
                            simulations: [],
                            questions: []
                        };
                    }
                } else {
                    console.error('❌ getResourcesForSection function not available');
                    this.currentRevisionResources = null;
                }
                
                // Set revision state within the main audit view
                this.showingRevision = true;
                this.showingSpecificSection = false;
                this.showingMainMenu = false;
                this.showingAnalytics = false; // Make sure analytics is closed
                
                console.log('✅ Revision state set:', {
                    section: this.currentRevisionSection,
                    title: this.currentRevisionSectionTitle,
                    topicCount: this.currentRevisionTopics.length,
                    hasResources: !!this.currentRevisionResources,
                    resourceCount: this.currentRevisionResources ? this.getResourceCount() : 0
                });
                
                // Close sidebar on mobile when navigating to revision
                if (window.innerWidth < 768) {
                    this.sidebarVisible = false;
                }
                
                // Force UI update and icon refresh
                this.$nextTick(() => {
                    console.log('🔄 UI updated, refreshing icons...');
                    if (window.lucide && window.lucide.createIcons) {
                        window.lucide.createIcons();
                    }
                    
                    // Additional debug: Check if resources are still there after UI update
                    console.log('🔍 Post-UI update check:', {
                        hasResources: this.hasResources(),
                        resourceCount: this.getResourceCount(),
                        videosLength: this.currentRevisionResources?.videos?.length || 0
                    });
                });
                
            } else {
                console.warn('❌ No revision section found for topic:', topicId, {
                    mappedSection: section,
                    hasMapping: !!window.revisionMapping[section],
                    availableSections: Object.keys(window.revisionMapping || {}).slice(0, 5)
                });
            }
        },

        // NEW: Helper method to check if section has resources
        hasResources() {
            if (!this.currentRevisionResources) {
                console.log('🔍 hasResources: No currentRevisionResources');
                return false;
            }
            
            const count = this.getResourceCount();
            console.log('🔍 hasResources: Resource count =', count);
            return count > 0;
        },
        
        getResourceCount() {
            if (!this.currentRevisionResources) {
                console.log('🔍 getResourceCount: No currentRevisionResources');
                return 0;
            }
            
            const count = (this.currentRevisionResources.videos?.length || 0) +
                          (this.currentRevisionResources.notes?.length || 0) +
                          (this.currentRevisionResources.simulations?.length || 0) +
                          (this.currentRevisionResources.questions?.length || 0);
            
            console.log('🔍 getResourceCount: Calculated count =', count, {
                videos: this.currentRevisionResources.videos?.length || 0,
                notes: this.currentRevisionResources.notes?.length || 0,
                simulations: this.currentRevisionResources.simulations?.length || 0,
                questions: this.currentRevisionResources.questions?.length || 0
            });
            
            return count;
        },

        // NEW: Helper method to get resource type background
        getResourceTypeBg(type) {
            const backgrounds = {
                videos: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                notes: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                simulations: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                questions: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            };
            return backgrounds[type] || 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
        },
        
        // NEW: Helper method to get resource type icon
        getResourceTypeIcon(type) {
            const icons = {
                videos: 'play-circle',
                notes: 'file-text',
                simulations: 'zap',
                questions: 'help-circle'
            };
            return icons[type] || 'file';
        },

        // NEW: Helper method to get resource type color
        getResourceTypeColor(type) {
            const colors = {
                videos: 'text-red-600 dark:text-red-400',
                notes: 'text-blue-600 dark:text-blue-400',
                simulations: 'text-purple-600 dark:text-purple-400',
                questions: 'text-green-600 dark:text-green-400'
            };
            return colors[type] || 'text-gray-600 dark:text-gray-400';
        },

        getTopicsForRevision(topicIds) {
            const topics = [];
            
            // Search through all specification data to find topics with matching IDs
            Object.values(this.specificationData).forEach(section => {
                if (section.topics) {
                    section.topics.forEach(topic => {
                        if (topicIds.includes(topic.id)) {
                            topics.push({
                                ...topic,
                                sectionTitle: section.title,
                                sectionPaper: section.paper
                            });
                        }
                    });
                }
            });
            
            // Sort topics by their ID for consistent ordering
            return topics.sort((a, b) => a.id.localeCompare(b.id));
        },
        
        goBackFromRevision() {
            console.log('Going back from revision');
            this.showingRevision = false;
            this.showingSpecificSection = true;
            this.currentRevisionSection = '';
            this.currentRevisionSectionTitle = '';
            this.currentRevisionTopics = [];
            this.currentRevisionResources = null;
            this.$nextTick(() => lucide.createIcons());
        },

        // --- ANALYTICS FUNCTIONALITY ---
        showAnalytics() {
            this.showingAnalytics = true;
            this.showingMainMenu = false;
            this.showingSpecificSection = false;
            this.showingRevision = false;
            this.calculateAnalytics();
            
            // Close sidebar on mobile
            if (window.innerWidth < 768) {
                this.sidebarVisible = false;
            }
            
            this.$nextTick(() => {
                this.renderCharts();
                lucide.createIcons();
            });
        },

        goBackFromAnalytics() {
            this.showingAnalytics = false;
            this.showingMainMenu = true;
            this.viewMode = 'spec'; // Return to spec mode
            this.$nextTick(() => lucide.createIcons());
        },

        calculateAnalytics() {
            // Get all topics from specification data
            const allTopics = Object.values(this.specificationData).flatMap(section => section.topics);
            const assessedTopics = allTopics.filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0);
            
            // Calculate overview metrics
            const totalProgress = allTopics.length > 0 ? Math.round((assessedTopics.length / allTopics.length) * 100) : 0;
            const assessedLevels = assessedTopics.map(topic => this.confidenceLevels[topic.id]);
            const avgConfidence = assessedLevels.length > 0 ? 
                (assessedLevels.reduce((sum, level) => sum + level, 0) / assessedLevels.length) : 0;
            const lowConfidenceCount = assessedTopics.filter(topic => this.confidenceLevels[topic.id] <= 2).length;
            
            // Paper readiness comparison
            const paper1Topics = allTopics.filter(topic => {
                const section = Object.values(this.specificationData).find(s => s.topics.some(t => t.id === topic.id));
                return section && section.paper === 'Paper 1';
            });
            const paper2Topics = allTopics.filter(topic => {
                const section = Object.values(this.specificationData).find(s => s.topics.some(t => t.id === topic.id));
                return section && section.paper === 'Paper 2';
            });
        
            const paper1Assessed = paper1Topics.filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0);
            const paper2Assessed = paper2Topics.filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0);
        
            const paper1Progress = paper1Topics.length > 0 ? Math.round((paper1Assessed.length / paper1Topics.length) * 100) : 0;
            const paper2Progress = paper2Topics.length > 0 ? Math.round((paper2Assessed.length / paper2Topics.length) * 100) : 0;
        
            const paper1AvgConfidence = paper1Assessed.length > 0 ? 
                (paper1Assessed.reduce((sum, topic) => sum + this.confidenceLevels[topic.id], 0) / paper1Assessed.length) : 0;
            const paper2AvgConfidence = paper2Assessed.length > 0 ? 
                (paper2Assessed.reduce((sum, topic) => sum + this.confidenceLevels[topic.id], 0) / paper2Assessed.length) : 0;
            
            // Calculate critical and strong topics
            const criticalTopics = allTopics
                .filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] <= 2)
                .map(topic => {
                    const section = Object.values(this.specificationData).find(s => 
                        s.topics.some(t => t.id === topic.id)
                    );
                    return {
                        ...topic,
                        confidence: this.confidenceLevels[topic.id],
                        section: section,
                        sectionTitle: section?.title || 'Unknown Section'
                    };
                })
                .sort((a, b) => a.confidence - b.confidence);
            
            const strongTopics = allTopics
                .filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] >= 4)
                .map(topic => {
                    const section = Object.values(this.specificationData).find(s => 
                        s.topics.some(t => t.id === topic.id)
                    );
                    return {
                        ...topic,
                        confidence: this.confidenceLevels[topic.id],
                        section: section,
                        sectionTitle: section?.title || 'Unknown Section'
                    };
                })
                .sort((a, b) => b.confidence - a.confidence);
        
            const advancedAnalytics = this.calculateAdvancedAnalytics();
        
            this.analyticsData = {
                overview: {
                    totalProgress,
                    avgConfidence: avgConfidence.toFixed(1),
                    lowConfidenceCount,
                    totalTopics: allTopics.length,
                    assessedTopics: assessedTopics.length,
                    paper1Progress,
                    paper2Progress,
                    paper1AvgConfidence: paper1AvgConfidence.toFixed(1),
                    paper2AvgConfidence: paper2AvgConfidence.toFixed(1)
                },
                charts: {},
                insights: { 
                    criticalTopics, 
                    strongTopics 
                },
                recommendations: {},
                advanced: advancedAnalytics 
            };
        },

        renderCharts() {
            if (!this.analyticsData) return;
            
            this.$nextTick(() => {
                // Confidence Distribution Chart
                this.renderConfidenceChart();
                
                // Subject Progress Chart
                this.renderSubjectProgressChart();
                
                // Paper Readiness Charts
                this.renderPaperReadinessCharts();
            });
        },
        
        renderConfidenceChart() {
            const ctx = document.getElementById('confidenceChart');
            if (!ctx) return;
            
            if (window.confidenceChartInstance) {
                window.confidenceChartInstance.destroy();
            }
            
            // Calculate confidence distribution
            const distribution = [0, 0, 0, 0, 0]; // [1s, 2s, 3s, 4s, 5s]
            Object.entries(this.confidenceLevels).forEach(([topicId, level]) => {
                if (level >= 1 && level <= 5) {
                    distribution[level - 1]++;
                }
            });
            
            window.confidenceChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['1 (Low)', '2', '3 (Medium)', '4', '5 (High)'],
                    datasets: [{
                        label: 'Number of Topics',
                        data: distribution,
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                        borderColor: ['#dc2626', '#ea580c', '#ca8a04', '#2563eb', '#16a34a'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Confidence Distribution Across All Topics'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        },
        
        renderSubjectProgressChart() {
            const ctx = document.getElementById('subjectChart');
            if (!ctx) return;
            
            if (window.subjectChartInstance) {
                window.subjectChartInstance.destroy();
            }
            
            // Calculate subject progress
            const subjectData = this.specModeGroups["All Topics"]
                .filter(group => group.type === 'group')
                .map(group => {
                    const groupTopics = group.sections.flatMap(sectionKey => 
                        this.specificationData[sectionKey]?.topics || []
                    );
                    const groupAssessed = groupTopics.filter(topic => 
                        this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0
                    );
                    const progress = groupTopics.length > 0 ? 
                        Math.round((groupAssessed.length / groupTopics.length) * 100) : 0;
                    
                    return {
                        subject: group.title.replace(/^\d+\.\d+\s*/, ''), // Remove numbering
                        progress: progress,
                        assessed: groupAssessed.length,
                        total: groupTopics.length
                    };
                });
            
            window.subjectChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: subjectData.map(d => d.subject),
                    datasets: [{
                        label: 'Progress %',
                        data: subjectData.map(d => d.progress),
                        backgroundColor: subjectData.map(d => {
                            if (d.progress >= 80) return '#22c55e';
                            if (d.progress >= 60) return '#3b82f6';
                            if (d.progress >= 40) return '#eab308';
                            if (d.progress >= 20) return '#f97316';
                            return '#ef4444';
                        }),
                        borderColor: '#1f2937',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Progress by Subject Area'
                        },
                        tooltip: {
                            callbacks: {
                                afterBody: function(context) {
                                    const index = context[0].dataIndex;
                                    const item = subjectData[index];
                                    return [`Assessed: ${item.assessed}/${item.total} topics`];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        },
        
        renderPaperReadinessCharts() {
            // Paper 1 Chart
            const ctx1 = document.getElementById('paper1Chart');
            if (ctx1) {
                if (window.paper1ChartInstance) {
                    window.paper1ChartInstance.destroy();
                }
                
                // Calculate Paper 1 confidence distribution
                const paper1Distribution = [0, 0, 0, 0, 0];
                const allTopics = Object.values(this.specificationData).flatMap(section => section.topics);
                const paper1Topics = allTopics.filter(topic => {
                    const section = Object.values(this.specificationData).find(s => s.topics.some(t => t.id === topic.id));
                    return section && section.paper === 'Paper 1';
                });
                
                paper1Topics.forEach(topic => {
                    const level = this.confidenceLevels[topic.id];
                    if (level >= 1 && level <= 5) {
                        paper1Distribution[level - 1]++;
                    }
                });
                
                window.paper1ChartInstance = new Chart(ctx1, {
                    type: 'doughnut',
                    data: {
                        labels: ['1 (Low)', '2', '3 (Medium)', '4', '5 (High)'],
                        datasets: [{
                            data: paper1Distribution,
                            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Paper 1 Confidence Distribution'
                            }
                        }
                    }
                });
            }
            
            // Paper 2 Chart
            const ctx2 = document.getElementById('paper2Chart');
            if (ctx2) {
                if (window.paper2ChartInstance) {
                    window.paper2ChartInstance.destroy();
                }
                
                // Calculate Paper 2 confidence distribution
                const paper2Distribution = [0, 0, 0, 0, 0];
                const allTopics = Object.values(this.specificationData).flatMap(section => section.topics);
                const paper2Topics = allTopics.filter(topic => {
                    const section = Object.values(this.specificationData).find(s => s.topics.some(t => t.id === topic.id));
                    return section && section.paper === 'Paper 2';
                });
                
                paper2Topics.forEach(topic => {
                    const level = this.confidenceLevels[topic.id];
                    if (level >= 1 && level <= 5) {
                        paper2Distribution[level - 1]++;
                    }
                });
                
                window.paper2ChartInstance = new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: ['1 (Low)', '2', '3 (Medium)', '4', '5 (High)'],
                        datasets: [{
                            data: paper2Distribution,
                            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Paper 2 Confidence Distribution'
                            }
                        }
                    }
                });
            }
        },

        // Pagination helpers for analytics
        getCriticalTopicsPage() {
            const pageSize = 5;
            const start = this.criticalTopicsPage * pageSize;
            return this.analyticsData?.insights.criticalTopics.slice(start, start + pageSize) || [];
        },
        
        getStrongTopicsPage() {
            const pageSize = 5;
            const start = this.strongTopicsPage * pageSize;
            return this.analyticsData?.insights.strongTopics.slice(start, start + pageSize) || [];
        },
        
        nextCriticalPage() {
            const maxPage = Math.ceil((this.analyticsData?.insights.criticalTopics.length || 0) / 5) - 1;
            if (this.criticalTopicsPage < maxPage) {
                this.criticalTopicsPage++;
            }
        },
        
        prevCriticalPage() {
            if (this.criticalTopicsPage > 0) {
                this.criticalTopicsPage--;
            }
        },
        
        nextStrongPage() {
            const maxPage = Math.ceil((this.analyticsData?.insights.strongTopics.length || 0) / 5) - 1;
            if (this.strongTopicsPage < maxPage) {
                this.strongTopicsPage++;
            }
        },
        
        prevStrongPage() {
            if (this.strongTopicsPage > 0) {
                this.strongTopicsPage--;
            }
        },
        
        // Navigate to revision for a specific topic
        goToTopicRevision(topicId) {
            const section = window.topicToSectionMapping[topicId];
            if (section && window.revisionMapping[section]) {
                this.openRevisionForTopic(topicId);
            } else {
                console.warn('No revision section found for topic:', topicId);
            }
        },

        // Calculate study velocity and learning patterns
        calculateAdvancedAnalytics() {
            // Always calculate mastery progress regardless of history data
            const masteryProgress = this.calculateMasteryProgress();
            
            // If no history data, return basic structure with zero values
            if (!this.analyticsHistoryData || !this.analyticsHistoryData.length) {
                return {
                    studyVelocity: {
                        improvementsLast30Days: 0,
                        declinesLast30Days: 0,
                        netImprovement: 0,
                        improvementRate: 0
                    },
                    studyPatterns: {
                        totalSessions: 0,
                        avgTopicsPerSession: 0,
                        studyDaysThisMonth: 0,
                        mostActiveDay: 'No data',
                        currentStreak: 0,
                        lastStudyDate: 'Never'
                    },
                    masteryProgress,
                    confidenceTrends: []
                };
            }
            
            // If we have history data, calculate the full analytics
            const history = this.analyticsHistoryData;
            const now = new Date();
            
            // Study velocity (improvements per day/week)
            const recentChanges = history.filter(change => {
                const changeDate = new Date(change.timestamp);
                const daysDiff = (now - changeDate) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30; // Last 30 days
            });
            
            const improvements = recentChanges.filter(change => change.newLevel > change.oldLevel);
            const declines = recentChanges.filter(change => change.newLevel < change.oldLevel);
            
            // Study sessions analysis
            const sessions = this.groupByStudySessions(recentChanges);
            const avgTopicsPerSession = sessions.length > 0 ? 
                (recentChanges.length / sessions.length).toFixed(1) : 0;
            
            // Learning patterns
            const studyDays = this.getStudyDaysPattern(recentChanges);
            const mostActiveDay = this.getMostActiveDay(recentChanges);
            const studyStreak = this.getCurrentStudyStreak();
            
            // Confidence trends
            const confidenceTrends = this.calculateConfidenceTrends();
            
            return {
                studyVelocity: {
                    improvementsLast30Days: improvements.length,
                    declinesLast30Days: declines.length,
                    netImprovement: improvements.length - declines.length,
                    improvementRate: recentChanges.length > 0 ? 
                        ((improvements.length / recentChanges.length) * 100).toFixed(1) : 0
                },
                studyPatterns: {
                    totalSessions: sessions.length,
                    avgTopicsPerSession,
                    studyDaysThisMonth: studyDays.length,
                    mostActiveDay,
                    currentStreak: studyStreak,
                    lastStudyDate: history[0]?.date || 'Never'
                },
                masteryProgress,
                confidenceTrends
            };
        },
        
        // Make sure this helper function exists too:
        calculateMasteryProgress() {
            const allTopics = Object.values(this.specificationData).flatMap(section => section.topics);
            const masteryLevels = {
                notStarted: allTopics.filter(topic => !this.confidenceLevels[topic.id]).length,
                beginning: allTopics.filter(topic => this.confidenceLevels[topic.id] === 1).length,
                developing: allTopics.filter(topic => this.confidenceLevels[topic.id] === 2).length,
                competent: allTopics.filter(topic => this.confidenceLevels[topic.id] === 3).length,
                proficient: allTopics.filter(topic => this.confidenceLevels[topic.id] === 4).length,
                mastered: allTopics.filter(topic => this.confidenceLevels[topic.id] === 5).length
            };
            
            return masteryLevels;
        },
        
        groupByStudySessions(changes) {
            const sessions = new Map();
            changes.forEach(change => {
                if (!sessions.has(change.studySession)) {
                    sessions.set(change.studySession, []);
                }
                sessions.get(change.studySession).push(change);
            });
            return Array.from(sessions.values());
        },
        
        getStudyDaysPattern(changes) {
            const days = new Set();
            changes.forEach(change => {
                days.add(change.date);
            });
            return Array.from(days);
        },
        
        getMostActiveDay(changes) {
            const dayCount = {};
            changes.forEach(change => {
                const day = change.dayOfWeek;
                dayCount[day] = (dayCount[day] || 0) + 1;
            });
            
            let mostActive = 'No data';
            let maxCount = 0;
            Object.entries(dayCount).forEach(([day, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    mostActive = day;
                }
            });
            
            return mostActive;
        },
        
        getCurrentStudyStreak() {
            if (!this.analyticsHistoryData.length) return 0;
            
            const today = new Date().toLocaleDateString();
            const studyDates = new Set();
            
            this.analyticsHistoryData.forEach(change => {
                studyDates.add(change.date);
            });
            
            const sortedDates = Array.from(studyDates).sort((a, b) => new Date(b) - new Date(a));
            
            let streak = 0;
            const oneDay = 24 * 60 * 60 * 1000;
            
            for (let i = 0; i < sortedDates.length; i++) {
                const currentDate = new Date(sortedDates[i]);
                const expectedDate = new Date(Date.now() - (i * oneDay));
                
                if (Math.abs(currentDate - expectedDate) <= oneDay) {
                    streak++;
                } else {
                    break;
                }
            }
            
            return streak;
        },
        
        calculateConfidenceTrends() {
            const last30Days = this.analyticsHistoryData.filter(change => {
                const changeDate = new Date(change.timestamp);
                const daysDiff = (new Date() - changeDate) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30;
            });
            
            // Group by week for trend analysis
            const weeklyTrends = new Map();
            last30Days.forEach(change => {
                const week = this.getWeekKey(new Date(change.timestamp));
                if (!weeklyTrends.has(week)) {
                    weeklyTrends.set(week, { improvements: 0, total: 0 });
                }
                const weekData = weeklyTrends.get(week);
                weekData.total++;
                if (change.newLevel > change.oldLevel) {
                    weekData.improvements++;
                }
            });
            
            return Array.from(weeklyTrends.entries()).map(([week, data]) => ({
                week,
                improvementRate: data.total > 0 ? ((data.improvements / data.total) * 100).toFixed(1) : 0,
                totalActivities: data.total
            }));
        },
        
        getWeekKey(date) {
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            return startOfWeek.toLocaleDateString();
        },

        // --- ENHANCED DATA MANAGEMENT (override from module) ---
        updateConfidence(topicId, level) {
            const oldLevel = this.confidenceLevels[topicId] || 0;
            const newLevel = this.confidenceLevels[topicId] === level ? null : level;
            
            // Update confidence level
            this.confidenceLevels[topicId] = newLevel;
            
            // Track historical data for analytics
            if (oldLevel !== (newLevel || 0)) {
                const now = new Date();
                const change = {
                    topicId: topicId,
                    oldLevel: oldLevel,
                    newLevel: newLevel || 0,
                    timestamp: now.toISOString(),
                    date: now.toLocaleDateString(),
                    time: now.toLocaleTimeString(),
                    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
                    studySession: this.getStudySessionId(now) // Group activities by session
                };
                
                // Add to history (keep last 500 changes for better analytics)
                this.analyticsHistoryData.unshift(change);
                if (this.analyticsHistoryData.length > 500) {
                    this.analyticsHistoryData = this.analyticsHistoryData.slice(0, 500);
                }
            }
            
            this.saveData();
        },
        
        // Helper method to group activities into study sessions
        getStudySessionId(date) {
            // Group activities within 30 minutes as same session
            const roundedTime = Math.floor(date.getTime() / (30 * 60 * 1000)) * (30 * 60 * 1000);
            return new Date(roundedTime).toISOString();
        },

        saveData() {
            const dataToSave = {
                confidenceLevels: this.confidenceLevels,
                lastUpdated: new Date().toISOString(),
                version: "1.1",
                user: this.user
            };

            // Save locally with user-specific key for Moodle users
            if (this.authMethod === 'moodle' && this.user && this.user.moodleId) {
                localStorage.setItem(`physicsAuditData_student_${this.user.moodleId}`, JSON.stringify(dataToSave));
            } else {
                localStorage.setItem('physicsAuditData', JSON.stringify(dataToSave));
            }

            // For Moodle users, also attempt to sync to backend
            if (this.authMethod === 'moodle' && this.user) {
                this.syncToMoodleBackend(dataToSave);
            }
        },

        async syncToMoodleBackend(data) {
            // Placeholder for backend sync
            try {
                // In production, implement actual API call here
                console.log('Syncing data to backend for student:', this.user.moodleId);
                // await fetch('/api/student-progress', { ... });
            } catch (error) {
                console.warn('Failed to sync to backend:', error);
            }
        },

        loadSavedData() {
            try {
                let savedData = null;
                
                // For Moodle users, try user-specific data first
                if (this.authMethod === 'moodle' && this.user && this.user.moodleId) {
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
        },

        clearAllData() {
            if (confirm('Are you sure you want to clear ALL your confidence ratings? This cannot be undone.')) {
                this.confidenceLevels = {};
                
                // Clear both general and user-specific data
                localStorage.removeItem('physicsAuditData');
                if (this.authMethod === 'moodle' && this.user && this.user.moodleId) {
                    localStorage.removeItem(`physicsAuditData_student_${this.user.moodleId}`);
                }
                
                alert('All data has been cleared.');
            }
        },

        exportDataBackup() {
            const dataToExport = {
                confidenceLevels: this.confidenceLevels,
                exportDate: new Date().toISOString(),
                version: "1.1",
                user: this.user
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `physics-audit-backup-${this.user?.username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
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

        // --- MODULARIZED METHODS (with enhanced auth) ---
        ...authMethods,
        ...searchMethods,
        // Note: Enhanced data management methods are implemented above
        // Override dataManagementMethods with our enhanced versions
        ...navigationMethods,
        ...statisticsMethods,
        ...uiHelperMethods,
    });
}
