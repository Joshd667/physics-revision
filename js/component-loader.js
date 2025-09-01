// js/component-loader.js - Simple HTML component loader

class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
    }

    async loadComponent(name, elementId = null) {
        // Check cache first
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }

        try {
            const response = await fetch(`./components/${name}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component ${name}: ${response.status}`);
            }
            
            const html = await response.text();
            this.cache.set(name, html);
            this.loadedComponents.add(name);
            
            // If elementId is provided, inject the HTML immediately
            if (elementId) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = html;
                }
            }
            
            return html;
        } catch (error) {
            console.error(`Error loading component ${name}:`, error);
            return `<div class="error">Failed to load component: ${name}</div>`;
        }
    }

    async loadComponents(components) {
        const promises = components.map(({ name, elementId }) => 
            this.loadComponent(name, elementId)
        );
        
        return await Promise.all(promises);
    }

    // Method to inject component HTML into a specific element
    injectComponent(html, elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        } else {
            console.warn(`Element with ID ${elementId} not found`);
        }
    }

    isLoaded(name) {
        return this.loadedComponents.has(name);
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

export default ComponentLoader;