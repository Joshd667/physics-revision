// js/modules/ui-helpers.js

export const uiHelperMethods = {
    applyDarkMode() {
        if (this.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },
    
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.$nextTick(() => lucide.createIcons());
    },

    showMainMenuCards() {
        return this.showingMainMenu;
    },

    getMainMenuGroups() {
        return this.currentGroups.filter(item => item.type === 'group');
    },
    
    showSectionCards() {
        return this.lastExpandedGroup !== null && !this.showingSpecificSection && !this.showingMainMenu && !this.showingRevision;
    },

    getCurrentGroupSections() {
        if (!this.lastExpandedGroup) return [];
        const lastGroup = this.currentGroups.find(item => item.type === 'group' && item.title === this.lastExpandedGroup);
        if (!lastGroup) return [];
        return lastGroup.sections.map(key => ({ key, ...this.specificationData[key] }));
    },
    
    getConfidenceColor(confidence) {
        if (!confidence || confidence === 0) return 'bg-gray-300';
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
        return colors[Math.round(confidence) - 1] || 'bg-gray-300';
    },

    getConfidenceBarStyle(confidence) {
        if (!confidence || confidence === 0) return 'background: rgb(209, 213, 219)'; // gray-300

        let red, green, blue;
        if (confidence <= 3) {
            const ratio = (confidence - 1) / 2;
            red = 239 + (249 - 239) * ratio; // red-500 to orange-500
            green = 68 + (115 - 68) * ratio;
            blue = 68 + (22 - 68) * ratio;
        } else {
            const ratio = (confidence - 3) / 2;
            red = 249 + (34 - 249) * ratio; // orange-500 to green-500
            green = 115 + (197 - 115) * ratio;
            blue = 22 + (94 - 22) * ratio;
        }
        return `background: rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
    },
};
