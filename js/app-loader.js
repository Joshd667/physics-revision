// js/app-loader.js - ULTRA-FAST VERSION with parallel loading

(async function() {
    try {
        console.log('🚀 Starting ULTRA-FAST Physics Audit Tool initialization...');
        const startTime = performance.now();
        
        // Start ALL async operations in parallel
        const initPromises = [
            // 1. Initialize revision mappings
            import('./data/revision-mappings.js').then(({ initializeRevisionMappings }) => {
                initializeRevisionMappings();
                console.log('✅ Revision mappings initialized');
            }),
            
            // 2. Load Alpine.js in parallel
            import('https://unpkg.com/alpinejs@3.x.x/dist/module.esm.js').then(module => {
                window.Alpine = module.default;
                console.log('✅ Alpine.js loaded');
                return module.default;
            }),
            
            // 3. Load group configurations
            import('./data/index.js').then(module => {
                console.log('✅ Group configurations loaded');
                return { paperModeGroups: module.paperModeGroups, specModeGroups: module.specModeGroups };
            }),
            
            // 4. Load physics audit tool
            import('./physics-audit-tool.js').then(module => {
                console.log('✅ Physics audit tool module loaded');
                return module.createPhysicsAuditTool;
            }),
            
            // 5. Load data (JSON first, CSV fallback)
            loadDataWithFallback()
        ];
        
        // Wait for all parallel operations
        const [_, Alpine, groupConfigs, createPhysicsAuditTool, dataResult] = await Promise.all(initPromises);
        
        const loadTime = performance.now() - startTime;
        console.log(`⚡ All resources loaded in ${loadTime.toFixed(2)}ms`);
        
        // Create and start the app
        Alpine.data('physicsAuditTool', createPhysicsAuditTool(
            dataResult.specificationData, 
            groupConfigs.paperModeGroups, 
            groupConfigs.specModeGroups, 
            Alpine
        ));
        
        Alpine.start();
        
        const totalTime = performance.now() - startTime;
        console.log(`🎉 Application started in ${totalTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('❌ Failed to initialize Physics Audit Tool:', error);
        showErrorScreen(error);
    }
})();

// Optimized data loading with smart fallback
async function loadDataWithFallback() {
    try {
        console.log('⚡ Attempting JSON loading...');
        const startTime = performance.now();
        
        const response = await fetch('./resources/combined-data.json', {
            cache: 'default'
        });
        
        if (!response.ok) {
            throw new Error(`JSON not available (${response.status})`);
        }
        
        const data = await response.json();
        const loadTime = performance.now() - startTime;
        
        console.log(`🚀 JSON loaded in ${loadTime.toFixed(2)}ms (${Object.keys(data.specificationData).length} sections)`);
        
        // Set up instant resource lookup
        window.getResourcesForSection = createOptimizedResourceGetter(data.resourceData);
        
        return {
            specificationData: data.specificationData,
            resourcesLoaded: true
        };
        
        } catch (jsonError) {
            console.log('📝 JSON not found, using CSV fallback...');
            console.log('💡 Run csv-converter.html to create combined-data.json for 10x faster loading');
            
            // Import and use existing CSV loader
            const { loadAllData, getResourcesForSection } = await import('./data/unified-csv-loader.js');
            const result = await loadAllData();
            
            // ✅ Set up the global function for CSV path (this was missing!)
            window.getResourcesForSection = getResourcesForSection;
            
            return {
                specificationData: result.specificationData,
                resourcesLoaded: result.resourcesLoaded
            };
        }
}

// OPTIMIZED resource getter with pre-computed indexes
function createOptimizedResourceGetter(resourceData) {
    console.log('🔄 Building resource indexes...');
    const startTime = performance.now();
    
    // Pre-build ALL indexes at once for maximum speed
    const indexes = {
        videos: new Map(),
        notes: new Map(),
        simulations: new Map(),
        questions: new Map(),
        sections: new Map()
    };
    
    // Batch process all resource types
    const resourceTypes = [
        { key: 'videos', data: resourceData.videos },
        { key: 'notes', data: resourceData.notes },
        { key: 'simulations', data: resourceData.simulations },
        { key: 'questions', data: resourceData.questions }
    ];
    
    resourceTypes.forEach(({ key, data }) => {
        if (!data) return;
        
        data.forEach(item => {
            const sectionId = item.section_id?.toString().trim();
            if (!sectionId) return;
            
            if (!indexes[key].has(sectionId)) {
                indexes[key].set(sectionId, []);
            }
            
            // Optimize data structure based on type
            let optimizedItem;
            switch (key) {
                case 'videos':
                    optimizedItem = {
                        title: item.title || 'Untitled Video',
                        description: item.description || '',
                        url: item.url || '',
                        duration: item.duration || '',
                        difficulty: item.difficulty || 'Foundation',
                        provider: item.provider || 'YouTube'
                    };
                    break;
                case 'notes':
                    optimizedItem = {
                        title: item.title || 'Untitled Note',
                        description: item.description || '',
                        url: item.url || '',
                        type: item.type || 'PDF',
                        pages: item.pages || '',
                        difficulty: item.difficulty || 'Foundation'
                    };
                    break;
                case 'simulations':
                    optimizedItem = {
                        title: item.title || 'Untitled Simulation',
                        description: item.description || '',
                        url: item.url || '',
                        provider: item.provider || 'PhET',
                        interactivity: item.interactivity || 'High',
                        difficulty: item.difficulty || 'Foundation'
                    };
                    break;
                case 'questions':
                    optimizedItem = {
                        title: item.title || 'Untitled Questions',
                        description: item.description || '',
                        url: item.url || '',
                        type: item.type || 'Multiple Choice',
                        questionCount: item.question_count || '',
                        difficulty: item.difficulty || 'Foundation',
                        hasAnswers: item.has_answers === 'TRUE' || item.has_answers === 'true'
                    };
                    break;
            }
            
            // Check for duplicates before adding
            const existingItem = indexes[key].get(sectionId).find(existing => existing.url === optimizedItem.url);
            if (!existingItem) {
                indexes[key].get(sectionId).push(optimizedItem);
            } else {
                console.log(`⚠️ Skipping duplicate ${key} URL: ${optimizedItem.url}`);
            }
        });
    });
    
    // Process revision sections
    if (resourceData.revisionsections) {
        resourceData.revisionsections.forEach(section => {
            const sectionId = section.section_id?.toString().trim();
            if (!sectionId) return;
            
            let cleanHtml = section.notes_html || '';
            if (cleanHtml.startsWith('"') && cleanHtml.endsWith('"')) {
                cleanHtml = cleanHtml.slice(1, -1);
            }
            
            indexes.sections.set(sectionId, {
                title: section.title || '',
                notes: cleanHtml,
                keyFormulas: section.key_formulas ? section.key_formulas.split('|').filter(f => f.trim()) : [],
                commonMistakes: section.common_mistakes ? section.common_mistakes.split('|').filter(m => m.trim()) : []
            });
        });
    }
    
    const indexTime = performance.now() - startTime;
    console.log(`⚡ Resource indexes built in ${indexTime.toFixed(2)}ms`);
    
    // Return ultra-fast lookup function using Maps
    return function getResourcesForSection(sectionId) {
        const sectionIdStr = sectionId?.toString().trim() || '';
        
        return {
            section: indexes.sections.get(sectionIdStr) || null,
            videos: indexes.videos.get(sectionIdStr) || [],
            notes: indexes.notes.get(sectionIdStr) || [],
            simulations: indexes.simulations.get(sectionIdStr) || [],
            questions: indexes.questions.get(sectionIdStr) || []
        };
    };
}

function showErrorScreen(error) {
    document.body.innerHTML = `
        <div style="padding: 2rem; text-align: center; font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Application Failed to Load</h1>
            <p>The Physics Audit Tool encountered an error during startup.</p>
            
            <div style="margin: 1.5rem 0; padding: 1.5rem; background: #fef3c7; border-radius: 0.75rem; text-align: left;">
                <h3 style="margin-top: 0; color: #92400e;">🚀 Speed Optimization</h3>
                <p style="margin-bottom: 1rem;">For <strong>ultra-fast</strong> loading:</p>
                <ol style="margin: 0; padding-left: 1.5rem;">
                    <li>Open <strong>csv-converter.html</strong></li>
                    <li>Convert your CSVs to optimized JSON</li>
                    <li>Place at <code>js/data/combined-data.json</code></li>
                    <li>Reload for <strong>sub-second</strong> loading!</li>
                </ol>
            </div>
            
            <details style="margin-top: 1rem; text-align: left; background: #f3f4f6; padding: 1rem; border-radius: 0.5rem;">
                <summary style="cursor: pointer; font-weight: bold;">🔧 Technical Details</summary>
                <pre style="margin-top: 0.5rem; white-space: pre-wrap; font-size: 0.875rem;">${error.message}\n\n${error.stack}</pre>
            </details>
            
            <div style="margin-top: 2rem;">
                <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; margin-right: 0.5rem;">
                    🔄 Retry
                </button>
                <button onclick="window.open('csv-converter.html', '_blank')" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
                    🚀 Optimize
                </button>
            </div>
        </div>
    `;
}
