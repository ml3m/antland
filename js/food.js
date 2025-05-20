/**
 * Food source in the ant colony simulation
 * Represents food resources that ants can collect and bring back to the nest
 */
class Food {
    constructor(x, y, quantity) {
        this.position = { x, y };
        this.quantity = quantity || MathUtils.randomInt(CONFIG.food.minQuantity, CONFIG.food.maxQuantity);
        this.initialQuantity = this.quantity;
        this.size = CONFIG.food.size;
        this.color = CONFIG.food.color;
        this.depleted = false;
        this.gridIndex = undefined;
        
        // Visual elements
        this.particles = [];
        this.displayRadius = Math.sqrt(this.quantity) * this.size * 0.25;
        this.jitter = []; // Random offsets for individual food particles
        
        // Initialize jitter array for food particles
        const particleCount = Math.min(50, Math.ceil(this.quantity / 3));
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * this.displayRadius * 0.8;
            this.jitter.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                size: MathUtils.random(0.7, 1.3) * this.size
            });
        }
    }
    
    // Take food, returns the amount taken
    take(amount) {
        amount = Math.min(amount, this.quantity);
        this.quantity -= amount;
        
        // Update display radius based on remaining quantity
        this.displayRadius = Math.sqrt(this.quantity) * this.size * 0.25;
        
        // Check if food source is depleted
        if (this.quantity <= 0) {
            this.depleted = true;
        }
        
        // Return actually taken amount
        return amount;
    }
    
    // Regenerate some food if enabled
    update() {
        if (CONFIG.food.respawnEnabled && this.quantity < this.initialQuantity) {
            this.quantity += CONFIG.food.respawnRate * CONFIG.simulation.speedMultiplier;
            this.quantity = Math.min(this.quantity, this.initialQuantity);
            this.depleted = false;
            
            // Update display radius
            this.displayRadius = Math.sqrt(this.quantity) * this.size * 0.25;
        }
    }
    
    // Draw the food
    draw(p) {
        if (this.depleted) return;
        
        // Draw base circle representing food source
        p.noStroke();
        
        // Draw food particles
        const particleCount = Math.min(this.jitter.length, Math.ceil(this.quantity / 3));
        for (let i = 0; i < particleCount; i++) {
            const jitter = this.jitter[i];
            const alpha = MathUtils.map(
                Vector.magnitude({ x: jitter.x, y: jitter.y }), 
                0, this.displayRadius * 0.8, 
                255, 200
            );
            
            p.fill(this.color[0], this.color[1], this.color[2], alpha);
            p.circle(
                this.position.x + jitter.x, 
                this.position.y + jitter.y, 
                jitter.size * (this.quantity / this.initialQuantity) * 1.5
            );
        }
        
        // Draw subtle glow
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, 0.5)`;
        p.fill(this.color[0], this.color[1], this.color[2], 30);
        p.circle(this.position.x, this.position.y, this.displayRadius * 2);
        p.drawingContext.shadowBlur = 0;
    }
    
    // Create a food particle effect when food is collected
    createFoodParticleEffect(position, count = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new FoodParticle(
                position.x, position.y, 
                this.color, MathUtils.random(15, 25)
            ));
        }
    }
    
    // Draw food particle effects
    drawParticles(p) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            this.particles[i].draw(p);
            
            // Remove completed particles
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Check if an ant can collect from this food source
    canCollect(antPosition) {
        const dist = Vector.distance(this.position, antPosition);
        return !this.depleted && dist < this.displayRadius + CONFIG.ant.size;
    }
    
    // Get percentage of food remaining
    getPercentRemaining() {
        return (this.quantity / this.initialQuantity) * 100;
    }
}

/**
 * Particle effect when food is collected
 */
class FoodParticle {
    constructor(x, y, color, lifespan) {
        this.position = { x, y };
        this.velocity = {
            x: MathUtils.random(-1, 1),
            y: MathUtils.random(-2, -0.5)
        };
        this.acceleration = { x: 0, y: 0.05 }; // Gravity
        this.color = [...color];
        this.alpha = 255;
        this.size = MathUtils.random(2, 5);
        this.lifespan = lifespan;
        this.age = 0;
    }
    
    update() {
        // Update position
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Age the particle
        this.age++;
        this.alpha = MathUtils.map(this.age, 0, this.lifespan, 255, 0);
        this.size *= 0.95;
    }
    
    draw(p) {
        p.noStroke();
        p.fill(this.color[0], this.color[1], this.color[2], this.alpha);
        p.circle(this.position.x, this.position.y, this.size);
    }
    
    isDead() {
        return this.age >= this.lifespan || this.size < 0.5;
    }
}

/**
 * Food manager to handle all food sources in the simulation
 */
class FoodManager {
    constructor() {
        this.foods = [];
    }
    
    // Initialize food sources
    initialize(width, height, nestPosition, obstacleManager) {
        this.width = width;
        this.height = height;
        
        // Clear existing food
        this.foods = [];
        
        // Add initial food sources
        const sourcesToAdd = CONFIG.food.sources;
        const nestRadius = CONFIG.nest.size * 2; // Keep food away from nest
        
        for (let i = 0; i < sourcesToAdd; i++) {
            let validPosition = false;
            let x, y;
            let attempts = 0;
            
            // Try to place food in valid positions
            while (!validPosition && attempts < 100) {
                attempts++;
                
                // Generate random position
                x = MathUtils.random(50, width - 50);
                y = MathUtils.random(50, height - 50);
                
                // Check if position is far enough from nest
                const distToNest = Vector.distance({ x, y }, nestPosition);
                if (distToNest < nestRadius) continue;
                
                // Check if position doesn't overlap with obstacles
                let obstacleOverlap = false;
                if (obstacleManager) {
                    for (const obstacle of obstacleManager.obstacles) {
                        const distToObstacle = Vector.distance({ x, y }, obstacle.position);
                        if (distToObstacle < obstacle.radius + 20) {
                            obstacleOverlap = true;
                            break;
                        }
                    }
                }
                
                if (obstacleOverlap) continue;
                
                // Check if position doesn't overlap with other food sources
                let foodOverlap = false;
                for (const food of this.foods) {
                    const distToFood = Vector.distance({ x, y }, food.position);
                    if (distToFood < food.displayRadius + 40) {
                        foodOverlap = true;
                        break;
                    }
                }
                
                if (!foodOverlap) {
                    validPosition = true;
                }
            }
            
            if (validPosition) {
                this.addFood(x, y);
            }
        }
    }
    
    // Add a food source at the specified position
    addFood(x, y, quantity) {
        const food = new Food(x, y, quantity);
        this.foods.push(food);
        return food;
    }
    
    // Get all non-depleted food sources
    getActiveFoods() {
        return this.foods.filter(food => !food.depleted);
    }
    
    // Update all food sources
    update() {
        if (CONFIG.simulation.paused) return;
        
        for (const food of this.foods) {
            food.update();
        }
    }
    
    // Draw all food sources
    draw(p) {
        for (const food of this.foods) {
            food.draw(p);
        }
        
        // Draw particle effects
        for (const food of this.foods) {
            food.drawParticles(p);
        }
    }
    
    // Find nearest food source to a position
    findNearest(position) {
        let nearestFood = null;
        let nearestDistance = Infinity;
        
        for (const food of this.foods) {
            if (!food.depleted) {
                const distance = Vector.distance(position, food.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestFood = food;
                }
            }
        }
        
        return nearestFood;
    }
    
    // Check if ant can collect from any food source
    canAntCollectFood(ant) {
        for (const food of this.foods) {
            if (food.canCollect(ant.position)) {
                return food;
            }
        }
        return null;
    }
    
    // Handle click to add food
    handleClick(x, y, amount) {
        this.addFood(x, y, amount || MathUtils.randomInt(CONFIG.food.minQuantity, CONFIG.food.maxQuantity));
    }
    
    // Clear all food sources
    clear() {
        this.foods = [];
    }
} 