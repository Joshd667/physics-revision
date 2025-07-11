// js/data/revision-mappings.js
// Revision mapping data - maps revision sections to topic IDs

export const revisionMapping = {
    "3.1.1": ["3.1.1a", "3.1.1b"],
    "3.1.2": ["3.1.2a", "3.1.2b", "3.1.2c", "3.1.2d", "3.1.2e"],
    "3.1.3": ["3.1.3a", "3.1.3b"],
    "3.2.1.1": ["3.2.1.1a", "3.2.1.1b", "3.2.1.1c"],
    "3.2.1.2": ["3.2.1.2a", "3.2.1.2b", "3.2.1.2c"],
    "3.2.1.3": ["3.2.1.3a", "3.2.1.3b", "3.2.1.3c"],
    "3.2.1.4": ["3.2.1.4a", "3.2.1.4b", "3.2.1.4c"],
    "3.2.1.5": ["3.2.1.5a", "3.2.1.5b", "3.2.1.5c", "3.2.1.5d", "3.2.1.5e"],
    "3.2.1.6": ["3.2.1.6a", "3.2.1.6b"],
    "3.2.1.7": ["3.2.1.7a"],
    "3.2.2.1": ["3.2.2.1a", "3.2.2.1b", "3.2.2.1c"],
    "3.2.2.2": ["3.2.2.2a", "3.2.2.2b"],
    "3.2.2.3": ["3.2.2.3a", "3.2.2.3b"],
    "3.2.2.4": ["3.2.2.4a", "3.2.2.4b"],
    "3.3.1.1": ["3.3.1.1a", "3.3.1.1b"],
    "3.3.1.2": ["3.3.1.2a", "3.3.1.2b", "3.3.1.2c"],
    "3.3.1.3": ["3.3.1.3a", "3.3.1.3b", "3.3.1.3c"],
    "3.3.2.1": ["3.3.2.1a", "3.3.2.1b", "3.3.2.1c", "3.3.2.1d"],
    "3.3.2.2": ["3.3.2.2a", "3.3.2.2b", "3.3.2.2c"],
    "3.3.2.3": ["3.3.2.3a", "3.3.2.3b", "3.3.2.3c", "3.3.2.3d"],
    "3.4.1.1": ["3.4.1.1a", "3.4.1.1b", "3.4.1.1c", "3.4.1.1d"],
    "3.4.1.2": ["3.4.1.2a", "3.4.1.2b", "3.4.1.2c", "3.4.1.2d"],
    "3.4.1.3": ["3.4.1.3a", "3.4.1.3b", "3.4.1.3c", "3.4.1.3d"],
    "3.4.1.4": ["3.4.1.4a", "3.4.1.4b", "3.4.1.4c"],
    "3.4.1.5": ["3.4.1.5a", "3.4.1.5b", "3.4.1.5c"],
    "3.4.1.6": ["3.4.1.6a", "3.4.1.6b", "3.4.1.6c", "3.4.1.6d"],
    "3.4.1.7": ["3.4.1.7a", "3.4.1.7b", "3.4.1.7c"],
    "3.4.1.8": ["3.4.1.8a", "3.4.1.8b", "3.4.1.8c"],
    "3.4.2.1": ["3.4.2.1a", "3.4.2.1b", "3.4.2.1c", "3.4.2.1d", "3.4.2.1e"],
    "3.4.2.2": ["3.4.2.2a", "3.4.2.2b"],
    "3.5.1.1": ["3.5.1.1a", "3.5.1.1b", "3.5.1.1c"],
    "3.5.1.2": ["3.5.1.2a", "3.5.1.2b", "3.5.1.2c"],
    "3.5.1.3": ["3.5.1.3a", "3.5.1.3b", "3.5.1.3c"],
    "3.5.1.4": ["3.5.1.4a", "3.5.1.4b", "3.5.1.4c", "3.5.1.4d"],
    "3.5.1.5": ["3.5.1.5a", "3.5.1.5b"],
    "3.5.1.6": ["3.5.1.6a", "3.5.1.6b"]
};

// Add section titles for better display
export const revisionSectionTitles = {
    "3.1.1": "SI Units and Measurements",
    "3.1.2": "Errors and Uncertainties",
    "3.1.3": "Estimation and Orders of Magnitude",
    "3.2.1.1": "Fundamental Particles",
    "3.2.1.2": "Nuclear Forces and Decay",
    "3.2.1.3": "Antiparticles and Photons",
    "3.2.1.4": "Fundamental Interactions",
    "3.2.1.5": "Particle Classification",
    "3.2.1.6": "Quark Properties",
    "3.2.1.7": "Conservation Laws",
    "3.2.2.1": "Photoelectric Effect",
    "3.2.2.2": "Atomic Energy Levels",
    "3.2.2.3": "Line Spectra",
    "3.2.2.4": "Wave-Particle Duality",
    "3.3.1.1": "Wave Properties",
    "3.3.1.2": "Wave Types and Polarisation",
    "3.3.1.3": "Stationary Waves",
    "3.3.2.1": "Interference",
    "3.3.2.2": "Diffraction",
    "3.3.2.3": "Refraction and Optics",
    "3.4.1.1": "Vectors and Equilibrium",
    "3.4.1.2": "Moments and Couples",
    "3.4.1.3": "Kinematics",
    "3.4.1.4": "Projectile Motion",
    "3.4.1.5": "Newton's Laws",
    "3.4.1.6": "Momentum and Collisions",
    "3.4.1.7": "Work and Power",
    "3.4.1.8": "Energy",
    "3.4.2.1": "Material Properties",
    "3.4.2.2": "Young Modulus",
    "3.5.1.1": "Current, Voltage and Resistance",
    "3.5.1.2": "I-V Characteristics",
    "3.5.1.3": "Resistivity and Temperature",
    "3.5.1.4": "Circuit Analysis",
    "3.5.1.5": "Potential Dividers",
    "3.5.1.6": "EMF and Internal Resistance"
};

// Create reverse mapping from topic ID to section
export const topicToSectionMapping = {};
Object.keys(revisionMapping).forEach(section => {
    revisionMapping[section].forEach(topicId => {
        topicToSectionMapping[topicId] = section;
    });
});

// Initialize global mappings function
export function initializeRevisionMappings() {
    // Make mappings globally available for the enhanced tool
    window.revisionMapping = revisionMapping;
    window.topicToSectionMapping = topicToSectionMapping;
    window.revisionSectionTitles = revisionSectionTitles;
}
