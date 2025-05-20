/**
 * Pheromone grid system for the ant colony simulation
 * Handles deposition, evaporation, and diffusion of pheromones
 */
class PheromoneSystem {
    constructor(width, height, resolution) {
        this.resolution = resolution;
        this.cols = Math.ceil(width / resolution);
        this.rows = Math.ceil(height / resolution);
        
        // Create separate grids for "to food" and "to nest" pheromones
        this.toFoodGrid = new Array(this.cols * this.rows).fill(0);
        this.toNestGrid = new Array(this.cols * this.rows).fill(0);
        
        // Pre-calculate neighboring cells for each cell
        this.neighbors = new Array(this.cols * this.rows);
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                this.neighbors[index] = this.getNeighborIndices(col, row);
            }
        }
        
        // For visualization and optimization
        this.dirtyRegions = new Set();
        this.canvasToFood = null;
        this.canvasToNest = null;
        this.visualizationNeedsUpdate = true;
    }
    
    // Initialize visualization canvases
    initVisualizations(p) {
        this.canvasToFood = p.createGraphics(this.cols * this.resolution, this.rows * this.resolution);
        this.canvasToNest = p.createGraphics(this.cols * this.resolution, this.rows * this.resolution);
        this.p = p; // Store p5 instance
        this.updateAllVisualizations();
    }
    
    // Get neighboring cell indices (for diffusion)
    getNeighborIndices(col, row) {
        const neighbors = [];
        
        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                if (x === 0 && y === 0) continue; // Skip self
                
                const newCol = col + x;
                const newRow = row + y;
                
                if (newCol >= 0 && newCol < this.cols && 
                    newRow >= 0 && newRow < this.rows) {
                    const index = newRow * this.cols + newCol;
                    neighbors.push(index);
                }
            }
        }
        
        return neighbors;
    }
    
    // Convert world position to grid index
    posToIndex(position) {
        const col = Math.floor(position.x / this.resolution);
        const row = Math.floor(position.y / this.resolution);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        
        return row * this.cols + col;
    }
    
    // Deposit "to food" pheromone at a position
    depositToFood(position, amount) {
        this.deposit(this.toFoodGrid, position, amount);
    }
    
    // Deposit "to nest" pheromone at a position
    depositToNest(position, amount) {
        this.deposit(this.toNestGrid, position, amount);
    }
    
    // Generic deposit function
    deposit(grid, position, amount) {
        const index = this.posToIndex(position);
        
        if (index !== -1) {
            grid[index] = Math.min(grid[index] + amount, CONFIG.pheromone.maxIntensity);
            this.dirtyRegions.add(index);
            this.visualizationNeedsUpdate = true;
        }
    }
    
    // Get pheromone value at a position
    getPheromoneAt(grid, position) {
        const index = this.posToIndex(position);
        
        if (index !== -1) {
            return grid[index];
        }
        
        return 0;
    }
    
    // Get "to food" pheromone at a position
    getToFoodAt(position) {
        return this.getPheromoneAt(this.toFoodGrid, position);
    }
    
    // Get "to nest" pheromone at a position
    getToNestAt(position) {
        return this.getPheromoneAt(this.toNestGrid, position);
    }
    
    // Update the pheromone system (evaporation and diffusion)
    update() {
        // Skip update if simulation is paused
        if (CONFIG.simulation.paused) return;
        
        const toFoodEvapRate = CONFIG.pheromone.toFood.evaporationRate;
        const toNestEvapRate = CONFIG.pheromone.toNest.evaporationRate;
        const toFoodDiffRate = CONFIG.pheromone.toFood.diffusionRate;
        const toNestDiffRate = CONFIG.pheromone.toNest.diffusionRate;
        const threshold = CONFIG.visualization.pheromoneFadeThreshold;
        
        // Create temporary grids for diffusion
        const toFoodNext = [...this.toFoodGrid];
        const toNestNext = [...this.toNestGrid];
        
        // Evaporation and diffusion
        for (let i = 0; i < this.toFoodGrid.length; i++) {
            let toFoodValue = this.toFoodGrid[i];
            let toNestValue = this.toNestGrid[i];
            
            // Evaporation
            if (toFoodValue > threshold) {
                toFoodValue *= toFoodEvapRate;
                if (toFoodValue < threshold) toFoodValue = 0;
                toFoodNext[i] = toFoodValue;
                this.dirtyRegions.add(i);
            }
            
            if (toNestValue > threshold) {
                toNestValue *= toNestEvapRate;
                if (toNestValue < threshold) toNestValue = 0;
                toNestNext[i] = toNestValue;
                this.dirtyRegions.add(i);
            }
            
            // Diffusion
            if (toFoodValue > threshold || toNestValue > threshold) {
                const neighbors = this.neighbors[i];
                
                for (const neighborIdx of neighbors) {
                    if (toFoodValue > threshold) {
                        const diffAmount = toFoodValue * toFoodDiffRate / neighbors.length;
                        toFoodNext[neighborIdx] += diffAmount;
                        toFoodNext[i] -= diffAmount;
                        this.dirtyRegions.add(neighborIdx);
                    }
                    
                    if (toNestValue > threshold) {
                        const diffAmount = toNestValue * toNestDiffRate / neighbors.length;
                        toNestNext[neighborIdx] += diffAmount;
                        toNestNext[i] -= diffAmount;
                        this.dirtyRegions.add(neighborIdx);
                    }
                }
            }
        }
        
        // Update grids
        this.toFoodGrid = toFoodNext;
        this.toNestGrid = toNestNext;
        
        // Update visualizations if needed
        if (this.visualizationNeedsUpdate && CONFIG.visualization.showPheromones) {
            this.updateVisualizations();
            this.visualizationNeedsUpdate = false;
        }
    }
    
    // Get pheromone intensity in the direction of a sensor
    sensePheromone(grid, position, angle, sensorAngle, sensorDistance) {
        const leftSensorAngle = angle - sensorAngle;
        const rightSensorAngle = angle + sensorAngle;
        
        const forwardSensor = {
            x: position.x + Math.cos(angle) * sensorDistance,
            y: position.y + Math.sin(angle) * sensorDistance
        };
        
        const leftSensor = {
            x: position.x + Math.cos(leftSensorAngle) * sensorDistance,
            y: position.y + Math.sin(leftSensorAngle) * sensorDistance
        };
        
        const rightSensor = {
            x: position.x + Math.cos(rightSensorAngle) * sensorDistance,
            y: position.y + Math.sin(rightSensorAngle) * sensorDistance
        };
        
        const forwardValue = this.getPheromoneAt(grid, forwardSensor);
        const leftValue = this.getPheromoneAt(grid, leftSensor);
        const rightValue = this.getPheromoneAt(grid, rightSensor);
        
        return {
            forward: forwardValue,
            left: leftValue,
            right: rightValue
        };
    }
    
    // Update visualization graphics contexts
    updateVisualizations() {
        if (!this.canvasToFood || !this.canvasToNest) return;
        
        this.updateAllVisualizations();
    }
    
    // Complete redraw of visualizations
    updateAllVisualizations() {
        if (!this.canvasToFood || !this.canvasToNest) return;
        
        const toFoodColor = CONFIG.pheromone.toFood.color;
        const toNestColor = CONFIG.pheromone.toNest.color;
        const threshold = CONFIG.visualization.pheromoneFadeThreshold;
        
        this.canvasToFood.clear();
        this.canvasToNest.clear();
        
        // Draw pheromones only in dirty regions
        for (const index of this.dirtyRegions) {
            const col = index % this.cols;
            const row = Math.floor(index / this.cols);
            const x = col * this.resolution;
            const y = row * this.resolution;
            
            const toFoodValue = this.toFoodGrid[index];
            const toNestValue = this.toNestGrid[index];
            
            if (toFoodValue > threshold) {
                const alpha = Math.min(255, (toFoodValue / CONFIG.pheromone.maxIntensity) * toFoodColor[3]);
                this.canvasToFood.noStroke();
                this.canvasToFood.fill(toFoodColor[0], toFoodColor[1], toFoodColor[2], alpha);
                this.canvasToFood.rect(x, y, this.resolution, this.resolution);
            }
            
            if (toNestValue > threshold) {
                const alpha = Math.min(255, (toNestValue / CONFIG.pheromone.maxIntensity) * toNestColor[3]);
                this.canvasToNest.noStroke();
                this.canvasToNest.fill(toNestColor[0], toNestColor[1], toNestColor[2], alpha);
                this.canvasToNest.rect(x, y, this.resolution, this.resolution);
            }
        }
        
        // Clear dirty regions
        this.dirtyRegions.clear();
    }
    
    // Draw the pheromones
    draw(p) {
        if (!CONFIG.visualization.showPheromones) return;
        
        p.blendMode(p.ADD);
        
        // Draw the pre-rendered canvases
        if (this.canvasToFood) {
            p.image(this.canvasToFood, 0, 0);
        }
        
        if (this.canvasToNest) {
            p.image(this.canvasToNest, 0, 0);
        }
        
        p.blendMode(p.BLEND);
    }
    
    // Clear all pheromones
    clear() {
        this.toFoodGrid.fill(0);
        this.toNestGrid.fill(0);
        this.dirtyRegions.clear();
        
        for (let i = 0; i < this.toFoodGrid.length; i++) {
            this.dirtyRegions.add(i);
        }
        
        this.visualizationNeedsUpdate = true;
        this.updateAllVisualizations();
    }
    
    // Handle window resize
    resize(width, height) {
        const newCols = Math.ceil(width / this.resolution);
        const newRows = Math.ceil(height / this.resolution);
        
        // Create new grids
        const newToFoodGrid = new Array(newCols * newRows).fill(0);
        const newToNestGrid = new Array(newCols * newRows).fill(0);
        
        // Copy old data where possible
        for (let row = 0; row < Math.min(this.rows, newRows); row++) {
            for (let col = 0; col < Math.min(this.cols, newCols); col++) {
                const oldIndex = row * this.cols + col;
                const newIndex = row * newCols + col;
                
                newToFoodGrid[newIndex] = this.toFoodGrid[oldIndex] || 0;
                newToNestGrid[newIndex] = this.toNestGrid[oldIndex] || 0;
            }
        }
        
        // Update grid properties
        this.cols = newCols;
        this.rows = newRows;
        this.toFoodGrid = newToFoodGrid;
        this.toNestGrid = newToNestGrid;
        
        // Recalculate neighbors
        this.neighbors = new Array(this.cols * this.rows);
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                this.neighbors[index] = this.getNeighborIndices(col, row);
            }
        }
        
        // Update visualization canvases
        if (this.p) {
            this.canvasToFood = this.p.createGraphics(this.cols * this.resolution, this.rows * this.resolution);
            this.canvasToNest = this.p.createGraphics(this.cols * this.resolution, this.rows * this.resolution);
            
            // Mark all cells as dirty to trigger complete redraw
            this.dirtyRegions.clear();
            for (let i = 0; i < this.toFoodGrid.length; i++) {
                this.dirtyRegions.add(i);
            }
            
            this.visualizationNeedsUpdate = true;
            this.updateAllVisualizations();
        }
    }
} 