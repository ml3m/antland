/**
 * Main simulation class for the ant colony optimization
 * Coordinates all components of the simulation
 */
class Simulation {
    constructor() {
        // Dimensions
        this.width = CONFIG.canvas.width;
        this.height = CONFIG.canvas.height;
        
        // Time and cycle management
        this.time = 0;
        this.dayNightCycle = 0; // 0 to 1 (0 = midnight, 0.5 = noon)
        this.dayNightTransition = 0; // For smooth transition
        
        // Core components
        this.nest = null;
        this.antColony = null;
        this.foodManager = null;
        this.obstacleManager = null;
        this.pheromoneSystem = null;
        this.spatialGrid = null;
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        
        // UI components
        this.ui = new UI(this);
        
        // Tool settings
        this.toolFoodAmount = (CONFIG.food.minQuantity + CONFIG.food.maxQuantity) / 2;
        this.toolObstacleSize = (CONFIG.obstacles.minSize + CONFIG.obstacles.maxSize) / 2;
        
        // Initialize flag
        this.initialized = false;
    }
    
    // Initialize all simulation components
    initialize(p) {
        // Update canvas dimensions to match config
        this.width = CONFIG.canvas.width;
        this.height = CONFIG.canvas.height;
        
        // Create the nest in the center of the screen
        const nestX = this.width / 2;
        const nestY = this.height / 2;
        this.nest = new Nest(nestX, nestY);
        
        // Create the ant colony
        this.antColony = new AntColony(this.nest.position);
        
        // Create obstacle manager
        this.obstacleManager = new ObstacleManager();
        
        // Create spatial grid for efficient collision detection
        this.spatialGrid = new SpatialGrid(this.width, this.height, CONFIG.simulation.spatialGridSize);
        
        // Create pheromone system
        this.pheromoneSystem = new PheromoneSystem(this.width, this.height, CONFIG.pheromone.resolution);
        this.pheromoneSystem.initVisualizations(p);
        
        // Create food manager and initialize food sources after obstacles
        this.foodManager = new FoodManager();
        
        // Initialize components in the correct order
        this.obstacleManager.initialize(this.width, this.height, this.nest.position);
        this.foodManager.initialize(this.width, this.height, this.nest.position, this.obstacleManager);
        this.antColony.initialize();
        
        // Initialize UI components
        this.ui.initialize();
        
        this.initialized = true;
    }
    
    // Update all simulation components
    update(timestamp) {
        if (!this.initialized) return;
        
        // Update performance monitoring
        this.performanceMonitor.update(timestamp, this.antColony.getAntCount());
        
        // Update UI
        this.ui.update(timestamp);
        
        // Update day/night cycle if enabled
        this.updateDayNightCycle();
        
        // Skip updates if simulation is paused
        if (CONFIG.simulation.paused) return;
        
        // Update components
        this.foodManager.update();
        this.pheromoneSystem.update();
        this.antColony.update(this);
        
        // Increment time
        this.time += CONFIG.simulation.timeStep * CONFIG.simulation.speedMultiplier;
    }
    
    // Draw all simulation components
    draw(p) {
        if (!this.initialized) return;
        
        // Set background based on time of day
        this.setBackground(p);
        
        // Draw pheromone layers first (underneath everything else)
        this.pheromoneSystem.draw(p);
        
        // Draw food sources
        this.foodManager.draw(p);
        
        // Draw obstacles
        this.obstacleManager.draw(p);
        
        // Draw nest
        this.nest.draw(p);
        
        // Draw ants
        this.antColony.draw(p);
        
        // Draw spatial grid for debugging if enabled
        if (CONFIG.visualization.showGrid) {
            this.spatialGrid.draw(p);
        }
    }
    
    // Handle window resize
    resize(width, height) {
        // Update dimensions
        this.width = width - 280; // Adjust for control panel
        this.height = height;
        CONFIG.canvas.width = this.width;
        CONFIG.canvas.height = this.height;
        
        // Update pheromone system
        if (this.pheromoneSystem) {
            this.pheromoneSystem.resize(this.width, this.height);
        }
        
        // Update spatial grid
        if (this.spatialGrid) {
            this.spatialGrid = new SpatialGrid(this.width, this.height, CONFIG.simulation.spatialGridSize);
        }
    }
    
    // Reset the simulation
    reset() {
        // Reset components
        this.nest.reset();
        this.antColony.reset();
        this.pheromoneSystem.clear();
        
        // Re-initialize
        this.obstacleManager.initialize(this.width, this.height, this.nest.position);
        this.foodManager.initialize(this.width, this.height, this.nest.position, this.obstacleManager);
        this.antColony.initialize();
        
        // Reset time and cycle
        this.time = 0;
        this.dayNightCycle = 0.5; // Start at noon
        
        // Reset statistics in UI
        this.ui.stats = {
            foodCollected: 0,
            peakAnts: 0,
            optimalPathTime: 0,
            simulationTime: 0
        };
    }
    
    // Update day/night cycle
    updateDayNightCycle() {
        if (!CONFIG.time.dayNightEnabled) {
            this.dayNightCycle = 0.5; // Fixed at noon
            return;
        }
        
        // Calculate cycle based on time
        const cycleMs = CONFIG.time.dayNightCycleDuration;
        const msSinceStart = (this.time * 1000) % cycleMs;
        this.dayNightCycle = msSinceStart / cycleMs;
        
        // Smoothly interpolate for transition effect
        const targetTransition = this.calculateDayNightIntensity();
        this.dayNightTransition += (targetTransition - this.dayNightTransition) * 0.05;
    }
    
    // Calculate day/night intensity based on cycle (0 = night, 1 = day)
    calculateDayNightIntensity() {
        // Convert cycle to intensity with smooth transition
        // Cycle: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
        
        if (this.dayNightCycle < 0.25) {
            // Night to sunrise (0 to 0.25)
            return MathUtils.map(this.dayNightCycle, 0, 0.25, 0, 1);
        } else if (this.dayNightCycle < 0.75) {
            // Day (0.25 to 0.75)
            return 1;
        } else {
            // Sunset to night (0.75 to 1)
            return MathUtils.map(this.dayNightCycle, 0.75, 1, 1, 0);
        }
    }
    
    // Set background color based on time of day
    setBackground(p) {
        const dayBg = CONFIG.canvas.background.day;
        const nightBg = CONFIG.canvas.background.night;
        
        // Interpolate between day and night colors
        const bgColor = ColorUtils.lerpColor(nightBg, dayBg, this.dayNightTransition);
        
        p.background(bgColor[0], bgColor[1], bgColor[2]);
    }
    
    // Get current time of day as formatted string
    getTimeOfDayString() {
        const hours = Math.floor(this.dayNightCycle * 24);
        const minutes = Math.floor((this.dayNightCycle * 24 * 60) % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
} 