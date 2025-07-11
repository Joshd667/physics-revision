// js/modules/data-management.js

export const dataManagementMethods = {
    updateConfidence(topicId, level) {
        this.confidenceLevels[topicId] = this.confidenceLevels[topicId] === level ? null : level;
        this.saveData();
    },

    saveData() {
        const dataToSave = {
            confidenceLevels: this.confidenceLevels,
            lastUpdated: new Date().toISOString(),
            version: "1.0",
            user: this.user
        };
        localStorage.setItem('physicsAuditData', JSON.stringify(dataToSave));
    },

    loadSavedData() {
        try {
            const savedData = localStorage.getItem('physicsAuditData');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                this.confidenceLevels = parsed.confidenceLevels || {};
            }
        } catch (error) {
            console.warn('Could not load saved data:', error);
            this.confidenceLevels = {};
        }
    },

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL your confidence ratings? This cannot be undone.')) {
            this.confidenceLevels = {};
            localStorage.removeItem('physicsAuditData');
            alert('All data has been cleared.');
        }
    },

    exportDataBackup() {
        const dataToExport = {
            confidenceLevels: this.confidenceLevels,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `physics-audit-backup-${new Date().toISOString().split('T')[0]}.json`;
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
};