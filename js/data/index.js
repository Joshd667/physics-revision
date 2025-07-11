// js/data/index.js - Using unified CSV loader
import { loadAllSubjectData } from './unified-csv-loader.js';

// CSV-based data loading - will be populated by loadAllSubjectData()
export let specificationData = {};

// Paper Mode Groups - split across Paper 1 and Paper 2 (matching PaperMode.txt)
export const paperModeGroups = {
    "Paper 1": [
        { type: "group", title: "3.1 Measurements and their errors", icon: "settings", sections: ["measurements_errors", "number_work"] },
        { type: "group", title: "3.2 Particles & Radiation", icon: "atom", sections: ["atomic_structure", "particle_interactions", "quantum_phenomena"] },
        { type: "group", title: "3.3 Waves", icon: "waves", sections: ["waves_properties", "stationary_waves", "interference_patterns", "waves_optics"] },
        { type: "group", title: "3.4 Mechanics & Materials", icon: "target", sections: ["vectors_scalars", "mechanics_moments", "motion_kinematics", "mechanics_dynamics", "mechanics_energy", "mechanics_materials"] },
        { type: "group", title: "3.5 Electricity", icon: "zap", sections: ["current_voltage", "dc_circuits"] },
        { type: "single", key: "circular_motion" }
    ],
    "Paper 2": [
        { type: "single", key: "simple_harmonic_motion" },
        { type: "group", title: "3.6.2 Thermal Physics", icon: "settings", sections: ["thermal_energy_transfer", "ideal_gases", "kinetic_theory"] },
        { type: "group", title: "3.7a G and E Fields", icon: "globe", sections: ["gravitational_fields", "electric_fields", "fields_capacitance"] },
        { type: "group", title: "3.7b Magnetic Fields", icon: "settings", sections: ["magnetic_forces", "electromagnetic_induction", "ac_transformers"] },
        { type: "group", title: "3.8 Nuclear Physics", icon: "shield", sections: ["nuclear_radioactivity", "nuclear_structure_energy", "nuclear_applications_safety"] }
    ]
};

// Spec Mode Groups - all topics shown, no paper split (matching SpecMode.txt)
export const specModeGroups = {
    "All Topics": [
        { type: "group", title: "3.1 Measurements and their errors", icon: "settings", sections: ["measurements_errors", "number_work"] },
        { type: "group", title: "3.2 Particles & Radiation", icon: "atom", sections: ["atomic_structure", "particle_interactions", "quantum_phenomena"] },
        { type: "group", title: "3.3 Waves", icon: "waves", sections: ["waves_properties", "stationary_waves", "interference_patterns", "waves_optics"] },
        { type: "group", title: "3.4 Mechanics & Materials", icon: "target", sections: ["vectors_scalars", "mechanics_moments", "motion_kinematics", "mechanics_dynamics", "mechanics_energy", "mechanics_materials"] },
        { type: "group", title: "3.5 Electricity", icon: "zap", sections: ["current_voltage", "dc_circuits"] },
        { type: "group", title: "3.6.1 Periodic motion", icon: "target", sections: ["circular_motion", "simple_harmonic_motion"] },
        { type: "group", title: "3.6.2 Thermal Physics", icon: "settings", sections: ["thermal_energy_transfer", "ideal_gases", "kinetic_theory"] },
        { type: "group", title: "3.7a G and E Fields", icon: "globe", sections: ["gravitational_fields", "electric_fields", "fields_capacitance"] },
        { type: "group", title: "3.7b Magnetic Fields", icon: "settings", sections: ["magnetic_forces", "electromagnetic_induction", "ac_transformers"] },
        { type: "group", title: "3.8 Nuclear Physics", icon: "shield", sections: ["nuclear_radioactivity", "nuclear_structure_energy", "nuclear_applications_safety"] }
    ]
};

// Initialize data loading from CSV files
export async function initializeData() {
    console.log('Initializing physics specification data from CSV files...');
    
    try {
        // Load all subject data from CSV files
        specificationData = await loadAllSubjectData();
        
        console.log('✅ CSV data loaded successfully');
        console.log('Available sections:', Object.keys(specificationData));
        
        return true;
    } catch (error) {
        console.error('❌ Failed to load specification data:', error);
        
        // Fallback to empty data structure
        specificationData = {};
        return false;
    }
}

// Export function to get current data (since it's loaded asynchronously)
export function getSpecificationData() {
    return specificationData;
}

// Default export for backward compatibility
export { specificationData as default };
