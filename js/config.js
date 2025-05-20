/**
 * Configuration settings for the Ant Colony Optimization simulation
 */
const CONFIG = {
    // Canvas and simulation settings
    canvas: {
        width: window.innerWidth - 280, // Account for control panel
        height: window.innerHeight,
        background: {
            day: [50, 50, 60],
            night: [15, 15, 25]
        }
    },
    
    // Time settings
    time: {
        dayNightCycleDuration: 60000, // in milliseconds
        dayNightEnabled: true
    },
    
    // Simulation settings
    simulation: {
        spatialGridSize: 20, // Grid size for spatial partitioning
        speedMultiplier: 1, // Speed of simulation (1 = normal)
        timeStep: 1/60,     // Time step for simulation physics
        paused: false
    },
    
    // Ant settings
    ant: {
        count: 100,           // Initial ant population
        maxCount: 500,        // Maximum allowed ants
        size: 3,              // Size in pixels
        speed: 2,             // Movement speed
        turnSpeed: 0.15,      // How quickly ants can change direction
        sensorAngle: Math.PI/4,  // Angle between forward and side sensors
        sensorDistance: 15,   // How far ants can sense
        explorationRate: 0.1, // Chance to ignore pheromones (0-1)
        spawnRate: 0.5,       // New ants per second
        energyCapacity: 100,  // Maximum energy
        energyConsumption: 0.05,  // Energy used per step
        carrierSpeed: 0.7,    // Speed multiplier when carrying food
        color: [255, 235, 150],
        returnHomeBias: 0.5   // How strongly ants are pulled toward home when carrying food
    },
    
    // Pheromone settings
    pheromone: {
        toFood: {
            strength: 100,     // Initial strength
            evaporationRate: 0.995, // Rate of evaporation (0-1)
            diffusionRate: 0.1,    // Rate of spreading to neighbors
            color: [0, 255, 0, 100] // RGBA
        },
        toNest: {
            strength: 100,
            evaporationRate: 0.995,
            diffusionRate: 0.1,
            color: [255, 0, 0, 100]
        },
        resolution: 5,   // Size of pheromone grid cells
        maxIntensity: 500  // Caps pheromone intensity
    },
    
    // Food settings
    food: {
        sources: 3,           // Number of initial food sources
        minQuantity: 50,      // Min food units per source
        maxQuantity: 200,     // Max food units per source
        size: 4,              // Size of each food unit in pixels
        color: [60, 220, 130],
        respawnEnabled: true, // Whether food respawns
        respawnRate: 0.05     // Food units per second
    },
    
    // Nest settings
    nest: {
        size: 30,           // Size in pixels
        color: [230, 180, 80], // Nest color
        entranceSize: 10,   // Size of entrance in pixels
        foodStorageGoal: 1000 // Target amount of food to collect
    },
    
    // Obstacle settings
    obstacles: {
        count: 5,            // Initial number of obstacles
        minSize: 30,         // Minimum obstacle size
        maxSize: 100,        // Maximum obstacle size
        color: [80, 80, 100]
    },
    
    // Visualization settings
    visualization: {
        showPheromones: true,
        showGrid: false,
        showStats: true,
        pheromoneFadeThreshold: 5, // Minimum intensity to show
        trailHistory: false,
        trailHistoryLength: 100,
        renderShadows: true
    }
};

// Create an object to store the default configuration for resetting
const DEFAULT_CONFIG = JSON.parse(JSON.stringify(CONFIG)); 