// js/modules/statistics.js

export const statisticsMethods = {
    // --- EXPORTING ---
    exportResults() {
        const allSections = Object.values(this.specificationData);
        const results = allSections.flatMap(section =>
            section.topics.map(topic => ({
                paper: section.paper,
                section: section.title,
                topic: `${topic.id} ${topic.title}`,
                confidence: this.confidenceLevels[topic.id] || null,
                confidenceLabel: this.confidenceLevels[topic.id] ? this.confidenceScale.find(c => c.value === this.confidenceLevels[topic.id])?.description : "Not assessed"
            }))
        );
        const csvContent = [
            ['Paper', 'Section', 'Topic', 'Confidence Level', 'Confidence Description'],
            ...results.map(r => [r.paper, `"${r.section}"`, `"${r.topic}"`, r.confidence || '-', `"${r.confidenceLabel}"`])
        ].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `physics-audit-${this.viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    // --- GENERIC HELPERS (USED BY SIDEBAR AND CARDS) ---
    getAssessedCount(topics) {
        if (!topics) return 0;
        return topics.filter(topic => this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0).length;
    },

    getGroupTotalTopics(sections) {
        return sections.reduce((sum, key) => sum + this.specificationData[key].topics.length, 0);
    },

    getGroupAssessedCount(sections) {
        let assessedCount = 0;
        sections.forEach(key => {
            this.specificationData[key].topics.forEach(topic => {
                if (this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0) {
                    assessedCount++;
                }
            });
        });
        return assessedCount;
    },
    
    // --- GROUP/CARD CALCULATIONS ---
    getGroupProgress(sections) {
        const totalTopics = this.getGroupTotalTopics(sections);
        const assessedTopics = this.getGroupAssessedCount(sections);
        return totalTopics > 0 ? Math.round((assessedTopics / totalTopics) * 100) : 0;
    },

    getGroupAverageConfidence(sections) {
        const relevantLevels = [];
        sections.forEach(key => {
            this.specificationData[key].topics.forEach(topic => {
                if (this.confidenceLevels[topic.id] && this.confidenceLevels[topic.id] > 0) {
                    relevantLevels.push(this.confidenceLevels[topic.id]);
                }
            });
        });
        if (relevantLevels.length === 0) return 0;
        return (relevantLevels.reduce((sum, level) => sum + level, 0) / relevantLevels.length);
    },

    // --- START: RESTORED METHODS FOR SIDEBAR PROGRESS BARS ---

    // Overall progress based on the current view mode ('spec' or 'paper')
    getOverallProgress() {
        const sections = (this.viewMode === 'spec') 
            ? Object.values(this.specificationData) 
            : Object.values(this.specificationData).filter(s => s.paper === this.selectedPaper);

        const totalTopics = sections.reduce((sum, section) => sum + section.topics.length, 0);
        const assessedTopics = Object.keys(this.confidenceLevels).filter(id => 
            this.confidenceLevels[id] > 0 && sections.some(s => s.topics.some(t => t.id === id))
        ).length;
        
        return totalTopics > 0 ? Math.round((assessedTopics / totalTopics) * 100) : 0;
    },

    // Overall average confidence based on the current view mode
    getAverageConfidence() {
        const sections = (this.viewMode === 'spec') 
            ? Object.values(this.specificationData) 
            : Object.values(this.specificationData).filter(s => s.paper === this.selectedPaper);
            
        const relevantLevels = Object.entries(this.confidenceLevels)
            .filter(([id, level]) => level > 0 && sections.some(s => s.topics.some(t => t.id === id)))
            .map(([_, level]) => level);
            
        if (relevantLevels.length === 0) return 0;
        return (relevantLevels.reduce((sum, level) => sum + level, 0) / relevantLevels.length).toFixed(1);
    },

    // Progress for a specific paper (e.g., 'Paper 1'), regardless of view mode
    getPaperProgress(paper) {
        const paperSections = Object.values(this.specificationData).filter(section => section.paper === paper);
        const totalTopics = paperSections.reduce((sum, section) => sum + section.topics.length, 0);
        const assessedTopics = Object.keys(this.confidenceLevels).filter(id => 
            this.confidenceLevels[id] > 0 && paperSections.some(s => s.topics.some(t => t.id === id))
        ).length;
        return totalTopics > 0 ? Math.round((assessedTopics / totalTopics) * 100) : 0;
    },

    // Average confidence for a specific paper, regardless of view mode
    getPaperAverageConfidence(paper) {
        const paperSections = Object.values(this.specificationData).filter(section => section.paper === paper);
        const relevantLevels = Object.entries(this.confidenceLevels)
            .filter(([id, level]) => level > 0 && paperSections.some(s => s.topics.some(t => t.id === id)))
            .map(([_, level]) => level);
            
        if (relevantLevels.length === 0) return 0;
        return (relevantLevels.reduce((sum, level) => sum + level, 0) / relevantLevels.length);
    },

    // Overall progress across ALL topics, regardless of view mode
    getOverallProgressAllPapers() {
        const totalTopics = Object.values(this.specificationData).reduce((sum, section) => sum + section.topics.length, 0);
        const assessedTopics = Object.values(this.confidenceLevels).filter(level => level > 0).length;
        return totalTopics > 0 ? Math.round((assessedTopics / totalTopics) * 100) : 0;
    },

    // Overall average confidence across ALL topics, regardless of view mode
    getOverallConfidenceAllPapers() {
        const allLevels = Object.values(this.confidenceLevels).filter(level => level > 0);
        if (allLevels.length === 0) return 0;
        return (allLevels.reduce((sum, level) => sum + level, 0) / allLevels.length);
    },
    // --- END: RESTORED METHODS ---
};
