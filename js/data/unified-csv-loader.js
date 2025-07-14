// js/data/unified-csv-loader.js
// Combined CSV loader for both subject data and resources

// Enhanced CSV parser that handles quoted fields with commas and HTML content
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse a single CSV line, handling quoted fields
    function parseLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator outside of quotes
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        values.push(current.trim());
        return values;
    }
    
    // Get headers from first line
    const headers = parseLine(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        
        // Create object from headers and values
        const row = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // Clean up quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            
            // Clean up HTML content - decode common HTML entities
            if (header === 'notes_html' && value) {
                value = value
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#x27;/g, "'")
                    .replace(/&amp;/g, '&');
            }
            
            row[header] = value;
        });
        
        data.push(row);
    }
    
    return data;
}

// Load a single CSV file from any directory
async function loadCSVFile(filepath) {
    try {
        let response;
        try {
            // Try loading from relative path first
            response = await fetch(`./${filepath}`);
        } catch (error) {
            // Fallback to absolute path
            response = await fetch(`/${filepath}`);
        }
        
        if (!response.ok) {
            console.warn(`Failed to load ${filepath}: HTTP ${response.status}`);
            return [];
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error(`Error loading ${filepath}:`, error);
        return [];
    }
}

// ========================================
// SUBJECT DATA LOADING
// ========================================

// Load subject specification data from CSV and convert to JS structure
async function loadSubjectCSV(filename) {
    try {
        const csvData = await loadCSVFile(`resources/subject-cards/${filename}`);
        
        if (csvData.length === 0) {
            console.warn(`No data loaded from ${filename}`);
            return {};
        }
        
        // Convert CSV rows to the expected JS structure
        const sections = {};
        
        csvData.forEach(row => {
            // Create section if it doesn't exist
            if (!sections[row.section_name]) {
                sections[row.section_name] = {
                    title: row.section_title,
                    paper: row.section_paper,
                    icon: row.section_icon,
                    topics: []
                };
            }
            
            // Parse pipe-separated learning objectives and examples
            const learningObjectives = row.learning_objectives ? 
                row.learning_objectives.split('|').map(obj => obj.trim()).filter(obj => obj) : [];
            const examples = row.examples ? 
                row.examples.split('|').map(ex => ex.trim()).filter(ex => ex) : [];
            
            // Add topic to section
            sections[row.section_name].topics.push({
                id: row.topic_id,
                title: row.topic_title,
                prompt: row.topic_prompt,
                learningObjectives: learningObjectives,
                examples: examples,
                resources: [] // Placeholder for future resources
            });
        });
        
        return sections;
        
    } catch (error) {
        console.error(`Error loading subject CSV ${filename}:`, error);
        return {};
    }
}

// Load all subject specification data
export async function loadAllSubjectData() {
    console.log('Loading all subject data from CSV files...');
    
    // List of all CSV subject files
    const csvFiles = [
        'measurements.csv',
        'particles.csv',
        'waves.csv',
        'mechanics.csv',
        'electricity.csv',
        'periodic-motion.csv',
        'thermal.csv',
        'fields.csv',
        'magnetic-fields.csv',
        'nuclear.csv'
    ];
    
    let allData = {};
    
// Load all CSV files in parallel
console.log(`Loading ${csvFiles.length} subject files in parallel...`);
const loadPromises = csvFiles.map(filename => {
    console.log(`Starting load: ${filename}`);
    return loadSubjectCSV(filename);
});

// Wait for all files to load
const allSubjectData = await Promise.all(loadPromises);

// Merge all data
allSubjectData.forEach(subjectData => {
    allData = { ...allData, ...subjectData };
});
    
    console.log(`✅ Loaded ${Object.keys(allData).length} sections from subject CSV files`);
    return allData;
}

// ========================================
// RESOURCE DATA LOADING
// ========================================

let allResources = {
    videos: {},
    notes: {},
    simulations: {},
    questions: {},
    sections: {}
};

// Load videos from CSV
async function loadVideos() {
    const data = await loadCSVFile('resources/revision/videos.csv');
    allResources.videos = {};
    
    data.forEach((video) => {
        if (!video.section_id) return;
        
        const sectionId = video.section_id.toString().trim();
        if (!allResources.videos[sectionId]) {
            allResources.videos[sectionId] = [];
        }
        
        const videoObject = {
            title: video.title || 'Untitled Video',
            description: video.description || '',
            url: video.url || '',
            duration: video.duration || '',
            difficulty: video.difficulty || 'Foundation',
            provider: video.provider || 'YouTube'
        };

        // Check if URL already exists for this section
        const existingVideo = allResources.videos[sectionId].find(v => v.url === videoObject.url);
        if (!existingVideo) {
            allResources.videos[sectionId].push(videoObject);
        } else {
            console.log(`⚠️ Skipping duplicate video URL: ${videoObject.url}`);
        }
    });
    
    return Object.values(allResources.videos).flat().length;
}

// Load notes from CSV
async function loadNotes() {
    const data = await loadCSVFile('resources/revision/notes.csv');
    allResources.notes = {};
    
    data.forEach((note) => {
        if (!note.section_id) return;
        
        const sectionId = note.section_id.toString().trim();
        if (!allResources.notes[sectionId]) {
            allResources.notes[sectionId] = [];
        }
        
        const noteObject = {
            title: note.title || 'Untitled Note',
            description: note.description || '',
            url: note.url || '',
            type: note.type || 'PDF',
            pages: note.pages || '',
            difficulty: note.difficulty || 'Foundation'
        };

        // Check if URL already exists for this section
        const existingNote = allResources.notes[sectionId].find(n => n.url === noteObject.url);
        if (!existingNote) {
            allResources.notes[sectionId].push(noteObject);
        } else {
            console.log(`⚠️ Skipping duplicate note URL: ${noteObject.url}`);
        }
    });
    
    return Object.values(allResources.notes).flat().length;
}

// Load simulations from CSV
async function loadSimulations() {
    const data = await loadCSVFile('resources/revision/simulations.csv');
    allResources.simulations = {};
    
    data.forEach((sim) => {
        if (!sim.section_id) return;
        
        const sectionId = sim.section_id.toString().trim();
        if (!allResources.simulations[sectionId]) {
            allResources.simulations[sectionId] = [];
        }
        
        const simObject = {
            title: sim.title || 'Untitled Simulation',
            description: sim.description || '',
            url: sim.url || '',
            provider: sim.provider || 'PhET',
            interactivity: sim.interactivity || 'High',
            difficulty: sim.difficulty || 'Foundation'
        };

        // Check if URL already exists for this section
        const existingSim = allResources.simulations[sectionId].find(s => s.url === simObject.url);
        if (!existingSim) {
            allResources.simulations[sectionId].push(simObject);
        } else {
            console.log(`⚠️ Skipping duplicate simulation URL: ${simObject.url}`);
        }
    });
    
    return Object.values(allResources.simulations).flat().length;
}

// Load questions from CSV
async function loadQuestions() {
    const data = await loadCSVFile('resources/revision/questions.csv');
    allResources.questions = {};
    
    data.forEach((question) => {
        if (!question.section_id) return;
        
        const sectionId = question.section_id.toString().trim();
        if (!allResources.questions[sectionId]) {
            allResources.questions[sectionId] = [];
        }
        
        const questionObject = {
            title: question.title || 'Untitled Questions',
            description: question.description || '',
            url: question.url || '',
            type: question.type || 'Multiple Choice',
            questionCount: question.question_count || '',
            difficulty: question.difficulty || 'Foundation',
            hasAnswers: question.has_answers === 'TRUE' || question.has_answers === 'true'
        };

        // Check if URL already exists for this section
        const existingQuestion = allResources.questions[sectionId].find(q => q.url === questionObject.url);
        if (!existingQuestion) {
            allResources.questions[sectionId].push(questionObject);
        } else {
            console.log(`⚠️ Skipping duplicate question URL: ${questionObject.url}`);
        }
    });
    
    return Object.values(allResources.questions).flat().length;
}

// Load revision sections from CSV
async function loadRevisionSections() {
    const data = await loadCSVFile('resources/revision/revisionsections.csv');
    allResources.sections = {};
    
    data.forEach((section) => {
        if (!section.section_id) return;
        
        const sectionId = section.section_id.toString().trim();
        
        let cleanHtml = section.notes_html || '';
        if (cleanHtml.startsWith('"') && cleanHtml.endsWith('"')) {
            cleanHtml = cleanHtml.slice(1, -1);
        }
        
        allResources.sections[sectionId] = {
            title: section.title || '',
            notes: cleanHtml,
            keyFormulas: section.key_formulas ? section.key_formulas.split('|').filter(f => f.trim()) : [],
            commonMistakes: section.common_mistakes ? section.common_mistakes.split('|').filter(m => m.trim()) : []
        };
    });
    
    return Object.keys(allResources.sections).length;
}

// Load all resource types
export async function loadAllCSVResources() {
    console.log('Loading all resources from CSV files...');
    
    const results = await Promise.all([
        loadVideos(),
        loadNotes(),
        loadSimulations(),
        loadQuestions(),
        loadRevisionSections()
    ]);
    
    const [videoCount, noteCount, simCount, questionCount, sectionCount] = results;
    const totalResources = videoCount + noteCount + simCount + questionCount;
    
    if (totalResources > 0) {
        console.log(`✅ Loaded ${totalResources} resources (${sectionCount} revision sections)`);
    }
    
    return totalResources > 0;
}

// Get all resources for a section
export function getResourcesForSection(sectionId) {
    const sectionIdStr = sectionId ? sectionId.toString().trim() : '';
    
    const resources = {
        section: allResources.sections[sectionIdStr] || null,
        videos: allResources.videos[sectionIdStr] || [],
        notes: allResources.notes[sectionIdStr] || [],
        simulations: allResources.simulations[sectionIdStr] || [],
        questions: allResources.questions[sectionIdStr] || []
    };
    
    return resources;
}

// ========================================
// UNIFIED INITIALIZATION
// ========================================

// Load everything at once
export async function loadAllData() {
    console.log('🚀 Loading all CSV data (subjects + resources)...');
    
    try {
        // Load both subject data and resources in parallel
        const [subjectData, resourcesLoaded] = await Promise.all([
            loadAllSubjectData(),
            loadAllCSVResources()
        ]);
        
        console.log('✅ All CSV data loaded successfully');
        
        return {
            specificationData: subjectData,
            resourcesLoaded: resourcesLoaded
        };
    } catch (error) {
        console.error('❌ Failed to load CSV data:', error);
        throw error;
    }
}
