/**
 * Ant class for the ant colony optimization simulation
 * Represents individual ants that search for food and create pheromone trails
 */
class Ant {
    constructor(nestPosition, id) {
        this.id = id;
        this.nestPosition = { ...nestPosition };
        
        // Set initial position slightly away from nest center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * CONFIG.nest.size * 0.8;
        this.position = {
            x: this.nestPosition.x + Math.cos(angle) * distance,
            y: this.nestPosition.y + Math.sin(angle) * distance
        };
        
        // Initialize movement properties
        this.direction = Math.random() * Math.PI * 2; // Random direction
        this.speed = CONFIG.ant.speed;
        this.turnSpeed = CONFIG.ant.turnSpeed;
        this.size = CONFIG.ant.size;
        this.color = CONFIG.ant.color;
        
        // State variables
        this.carryingFood = 0; // Amount of food carried
        this.state = 'searching'; // searching, returning
        this.energy = CONFIG.ant.energyCapacity;
        this.isAlive = true;
        this.gridIndex = undefined; // For spatial partitioning
        
        // Trail history for path visualization
        this.trail = [];
        this.trailMaxLength = CONFIG.visualization.trailHistoryLength;
        
        // Pheromone deposition
        this.lastDepositionTime = 0;
        this.depositionInterval = 2; // Frames between deposits
        
        // Create antenna endpoints for visualization
        this.antennaLength = this.size * 1.5;
        this.antennaAngle = Math.PI / 6;
        
        // Hunting strategy - exploration vs exploitation
        this.explorationRate = CONFIG.ant.explorationRate;
    }
    
    // Update ant's position and state
    update(simulation) {
        if (!this.isAlive || CONFIG.simulation.paused) return;
        
        // Consume energy
        this.energy -= CONFIG.ant.energyConsumption * CONFIG.simulation.speedMultiplier;
        
        if (this.energy <= 0) {
            this.isAlive = false;
            return;
        }
        
        // Calculate next move based on current state
        if (this.state === 'searching') {
            this.searchForFood(simulation);
        } else if (this.state === 'returning') {
            this.returnToNest(simulation);
        }
        
        // Update position
        let currentSpeed = this.speed;
        
        // Slow down when carrying food
        if (this.carryingFood > 0) {
            currentSpeed *= CONFIG.ant.carrierSpeed;
        }
        
        // Apply speed multiplier from simulation
        currentSpeed *= CONFIG.simulation.speedMultiplier;
        
        // Move in current direction
        this.position.x += Math.cos(this.direction) * currentSpeed;
        this.position.y += Math.sin(this.direction) * currentSpeed;
        
        // Keep within bounds
        this.boundPosition(simulation.width, simulation.height);
        
        // Deposit pheromones
        this.depositPheromones(simulation);
        
        // Update trail history
        if (CONFIG.visualization.trailHistory) {
            this.updateTrail();
        } else {
            this.trail = []; // Clear if disabled
        }
    }
    
    // Keep ant within simulation boundaries
    boundPosition(width, height) {
        const buffer = 10;
        
        if (this.position.x < buffer) {
            this.position.x = buffer;
            this.direction = Math.PI - this.direction;
        } else if (this.position.x > width - buffer) {
            this.position.x = width - buffer;
            this.direction = Math.PI - this.direction;
        }
        
        if (this.position.y < buffer) {
            this.position.y = buffer;
            this.direction = -this.direction;
        } else if (this.position.y > height - buffer) {
            this.position.y = height - buffer;
            this.direction = -this.direction;
        }
    }
    
    // Behavior when searching for food
    searchForFood(simulation) {
        // Check if at food source
        const foodSource = simulation.foodManager.canAntCollectFood(this);
        if (foodSource) {
            // Take food and switch to returning state
            this.carryingFood = foodSource.take(1);
            if (this.carryingFood > 0) {
                this.state = 'returning';
                this.direction = this.calculateDirectionToNest();
                
                // Create food particle effect
                foodSource.createFoodParticleEffect(this.position);
            }
            return;
        }
        
        // Check for obstacle avoidance
        const avoidanceForce = simulation.obstacleManager.calculateAvoidanceForce(this);
        if (avoidanceForce) {
            // Blend current direction with avoidance direction
            const avoidanceAngle = Math.atan2(avoidanceForce.y, avoidanceForce.x);
            this.direction = this.direction * 0.3 + avoidanceAngle * 0.7;
            return;
        }
        
        // When searching, follow "to food" pheromone trails
        // Use the ant's sensors to detect pheromones
        const sensors = simulation.pheromoneSystem.sensePheromone(
            simulation.pheromoneSystem.toFoodGrid,
            this.position,
            this.direction,
            CONFIG.ant.sensorAngle,
            CONFIG.ant.sensorDistance
        );
        
        // Decide whether to explore (random) or exploit (follow pheromones)
        if (Math.random() < this.explorationRate) {
            // Random movement
            this.direction += (Math.random() - 0.5) * this.turnSpeed * 2;
        } else {
            // Follow pheromones if found
            const maxPheromone = Math.max(sensors.forward, sensors.left, sensors.right);
            
            if (maxPheromone > CONFIG.visualization.pheromoneFadeThreshold) {
                // Move toward stronger pheromone
                if (sensors.left > sensors.forward && sensors.left > sensors.right) {
                    // Turn left
                    this.direction -= this.turnSpeed;
                } else if (sensors.right > sensors.forward && sensors.right > sensors.left) {
                    // Turn right
                    this.direction += this.turnSpeed;
                }
                // Otherwise continue forward
            } else {
                // Random walk if no strong pheromones
                this.direction += (Math.random() - 0.5) * this.turnSpeed;
            }
        }
    }
    
    // Behavior when returning to nest with food
    returnToNest(simulation) {
        // Check if at nest
        if (simulation.nest.contains(this.position)) {
            // Store food and switch to searching state
            simulation.nest.storeFood(this.carryingFood);
            simulation.nest.createFoodStorageEffect(this.position);
            this.carryingFood = 0;
            this.state = 'searching';
            
            // Turn around 180 degrees when leaving nest
            this.direction += Math.PI + (Math.random() - 0.5) * Math.PI/2;
            
            // Replenish energy at nest
            this.energy = CONFIG.ant.energyCapacity;
            return;
        }
        
        // Check for obstacle avoidance
        const avoidanceForce = simulation.obstacleManager.calculateAvoidanceForce(this);
        if (avoidanceForce) {
            // Blend current direction with avoidance direction
            const avoidanceAngle = Math.atan2(avoidanceForce.y, avoidanceForce.x);
            this.direction = this.direction * 0.3 + avoidanceAngle * 0.7;
            return;
        }
        
        // When returning, follow "to nest" pheromone trails
        const sensors = simulation.pheromoneSystem.sensePheromone(
            simulation.pheromoneSystem.toNestGrid,
            this.position,
            this.direction,
            CONFIG.ant.sensorAngle,
            CONFIG.ant.sensorDistance
        );
        
        // Calculate direct vector to nest
        const nestVector = {
            x: this.nestPosition.x - this.position.x,
            y: this.nestPosition.y - this.position.y
        };
        const distanceToNest = Vector.magnitude(nestVector);
        const angleToNest = Math.atan2(nestVector.y, nestVector.x);
        
        if (distanceToNest < CONFIG.nest.size * 2) {
            // When close to nest, head directly there
            this.direction = angleToNest;
            return;
        }
        
        // Decide whether to use pheromones or direct navigation
        if (Math.random() < CONFIG.ant.returnHomeBias) {
            // Gradually turn toward nest
            const angleDiff = MathUtils.angleDiff(this.direction, angleToNest);
            this.direction += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnSpeed);
        } else {
            // Follow pheromones if found
            const maxPheromone = Math.max(sensors.forward, sensors.left, sensors.right);
            
            if (maxPheromone > CONFIG.visualization.pheromoneFadeThreshold) {
                // Move toward stronger pheromone
                if (sensors.left > sensors.forward && sensors.left > sensors.right) {
                    // Turn left
                    this.direction -= this.turnSpeed;
                } else if (sensors.right > sensors.forward && sensors.right > sensors.left) {
                    // Turn right
                    this.direction += this.turnSpeed;
                }
                // Otherwise continue forward
            } else {
                // Gradually turn toward nest if no strong pheromones
                const angleDiff = MathUtils.angleDiff(this.direction, angleToNest);
                this.direction += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnSpeed * 0.5);
            }
        }
    }
    
    // Calculate direction to the nest
    calculateDirectionToNest() {
        const dx = this.nestPosition.x - this.position.x;
        const dy = this.nestPosition.y - this.position.y;
        return Math.atan2(dy, dx);
    }
    
    // Deposit pheromones based on state
    depositPheromones(simulation) {
        this.lastDepositionTime++;
        
        if (this.lastDepositionTime < this.depositionInterval) {
            return;
        }
        
        this.lastDepositionTime = 0;
        
        if (this.state === 'searching') {
            // When searching, deposit "to nest" pheromones
            const strengthModifier = 1;
            simulation.pheromoneSystem.depositToNest(
                this.position, 
                CONFIG.pheromone.toNest.strength * strengthModifier
            );
        } else if (this.state === 'returning') {
            // When returning with food, deposit "to food" pheromones
            // Pheromone strength proportional to amount of food carried
            const strengthModifier = this.carryingFood;
            simulation.pheromoneSystem.depositToFood(
                this.position, 
                CONFIG.pheromone.toFood.strength * strengthModifier
            );
        }
    }
    
    // Update trail history for visualization
    updateTrail() {
        this.trail.push({ ...this.position });
        if (this.trail.length > this.trailMaxLength) {
            this.trail.shift();
        }
    }
    
    // Draw the ant
    draw(p) {
        if (!this.isAlive) return;
        
        p.push();
        p.translate(this.position.x, this.position.y);
        p.rotate(this.direction);
        
        // Draw trail if enabled
        if (CONFIG.visualization.trailHistory && this.trail.length > 1) {
            p.stroke(this.color[0], this.color[1], this.color[2], 100);
            p.strokeWeight(1);
            p.noFill();
            
            p.beginShape();
            for (const point of this.trail) {
                p.vertex(point.x - this.position.x, point.y - this.position.y);
            }
            p.endShape();
        }
        
        // Draw ant body
        p.noStroke();
        
        // Ant color differs based on state
        if (this.state === 'searching') {
            p.fill(this.color[0], this.color[1], this.color[2]);
        } else { // returning with food
            p.fill(this.color[0] * 0.7, this.color[1] * 0.7, this.color[2] * 0.7);
        }
        
        // Draw body segments
        p.ellipse(-this.size * 0.5, 0, this.size * 1.2, this.size); // Abdomen
        p.ellipse(0, 0, this.size, this.size * 0.8); // Thorax
        p.ellipse(this.size * 0.6, 0, this.size * 0.6, this.size * 0.6); // Head
        
        // Draw antennae
        p.stroke(this.color[0], this.color[1], this.color[2]);
        p.strokeWeight(0.5);
        
        p.line(this.size * 0.7, 0, 
            this.size * 0.7 + Math.cos(this.antennaAngle) * this.antennaLength, 
            Math.sin(this.antennaAngle) * this.antennaLength);
        
        p.line(this.size * 0.7, 0, 
            this.size * 0.7 + Math.cos(-this.antennaAngle) * this.antennaLength, 
            Math.sin(-this.antennaAngle) * this.antennaLength);
        
        // Draw legs
        p.strokeWeight(0.5);
        for (let i = 0; i < 3; i++) {
            const xPos = -this.size * 0.3 + i * this.size * 0.3;
            const legLength = this.size * 0.8;
            
            // Top legs
            p.line(xPos, 0, xPos, -legLength);
            
            // Bottom legs
            p.line(xPos, 0, xPos, legLength);
        }
        
        // Draw food being carried
        if (this.carryingFood > 0) {
            p.fill(CONFIG.food.color[0], CONFIG.food.color[1], CONFIG.food.color[2]);
            p.noStroke();
            p.circle(-this.size * 0.8, 0, this.size * 0.5);
        }
        
        p.pop();
    }
}

/**
 * Ant colony manager to handle all ants in the simulation
 */
class AntColony {
    constructor(nestPosition) {
        this.nestPosition = nestPosition;
        this.ants = [];
        this.antIdCounter = 0;
    }
    
    // Initialize the ant colony
    initialize() {
        // Clear existing ants
        this.ants = [];
        
        // Add initial ants
        for (let i = 0; i < CONFIG.ant.count; i++) {
            this.addAnt();
        }
    }
    
    // Add a new ant to the colony
    addAnt() {
        const ant = new Ant(this.nestPosition, this.antIdCounter++);
        this.ants.push(ant);
        return ant;
    }
    
    // Update all ants
    update(simulation) {
        if (CONFIG.simulation.paused) return;
        
        // Update existing ants
        for (const ant of this.ants) {
            ant.update(simulation);
        }
        
        // Remove dead ants
        this.ants = this.ants.filter(ant => ant.isAlive);
        
        // Spawn new ants if enabled
        if (this.ants.length < CONFIG.ant.maxCount) {
            const spawnChance = CONFIG.ant.spawnRate * CONFIG.simulation.speedMultiplier / 60;
            if (Math.random() < spawnChance) {
                this.addAnt();
            }
        }
    }
    
    // Draw all ants
    draw(p) {
        for (const ant of this.ants) {
            ant.draw(p);
        }
    }
    
    // Get current ant count
    getAntCount() {
        return this.ants.length;
    }
    
    // Get number of ants carrying food
    getCarryingFoodCount() {
        return this.ants.filter(ant => ant.carryingFood > 0).length;
    }
    
    // Reset for a new simulation
    reset() {
        this.ants = [];
        this.antIdCounter = 0;
    }
} 