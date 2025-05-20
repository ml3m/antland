/**
 * Nest class for the ant colony simulation
 * Acts as the colony's home base and food storage
 */
class Nest {
    constructor(x, y) {
        this.position = { x, y };
        this.size = CONFIG.nest.size;
        this.color = CONFIG.nest.color;
        this.entranceSize = CONFIG.nest.entranceSize;
        this.foodStored = 0;
        this.foodStorageGoal = CONFIG.nest.foodStorageGoal;
        
        // Visual properties
        this.particles = [];
        this.tunnels = this.generateTunnels();
        this.entrances = this.generateEntrances(3);
    }
    
    // Generate random tunnels for visual effect
    generateTunnels() {
        const tunnelCount = Math.floor(MathUtils.random(4, 8));
        const tunnels = [];
        
        for (let i = 0; i < tunnelCount; i++) {
            // Create a meandering tunnel
            const angle = MathUtils.random(0, Math.PI * 2);
            const length = MathUtils.random(this.size * 0.3, this.size * 0.7);
            const points = [];
            
            // Start at a random point inside the nest
            const startDist = MathUtils.random(this.size * 0.2, this.size * 0.5);
            const startX = Math.cos(angle) * startDist;
            const startY = Math.sin(angle) * startDist;
            
            let x = startX;
            let y = startY;
            
            // Add the starting point
            points.push({ x, y });
            
            // Create a few more points to form the tunnel
            const segments = Math.floor(MathUtils.random(3, 6));
            
            for (let j = 0; j < segments; j++) {
                // Slightly vary the angle to create bends
                const angleVariation = MathUtils.random(-0.5, 0.5);
                const newAngle = angle + angleVariation;
                
                // Add length to the tunnel
                const segmentLength = length / segments;
                x += Math.cos(newAngle) * segmentLength;
                y += Math.sin(newAngle) * segmentLength;
                
                points.push({ x, y });
            }
            
            tunnels.push({
                points,
                width: MathUtils.random(2, 5)
            });
        }
        
        return tunnels;
    }
    
    // Generate entrances around the nest perimeter
    generateEntrances(count) {
        const entrances = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            
            entrances.push({
                angle,
                width: MathUtils.random(this.entranceSize * 0.7, this.entranceSize * 1.3)
            });
        }
        
        return entrances;
    }
    
    // Check if position is inside or near the nest
    contains(position, buffer = 0) {
        return Vector.distance(this.position, position) < this.size + buffer;
    }
    
    // Check if position is near an entrance to the nest
    isNearEntrance(position) {
        for (const entrance of this.entrances) {
            const entrancePosition = {
                x: this.position.x + Math.cos(entrance.angle) * this.size,
                y: this.position.y + Math.sin(entrance.angle) * this.size
            };
            
            const distance = Vector.distance(position, entrancePosition);
            if (distance < entrance.width) {
                return true;
            }
        }
        
        return false;
    }
    
    // Store food in the nest
    storeFood(amount) {
        this.foodStored += amount;
    }
    
    // Create a food storage particle effect
    createFoodStorageEffect(position) {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new NestParticle(
                position.x, position.y,
                this.position.x, this.position.y,
                CONFIG.food.color, MathUtils.random(20, 30)
            ));
        }
    }
    
    // Draw the nest
    draw(p) {
        p.push();
        
        // Draw shadow
        if (CONFIG.visualization.renderShadows) {
            p.drawingContext.shadowBlur = 20;
            p.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
        }
        
        // Draw main nest circle
        p.fill(this.color[0], this.color[1], this.color[2]);
        p.stroke(this.color[0] * 0.8, this.color[1] * 0.8, this.color[2] * 0.8);
        p.strokeWeight(2);
        p.circle(this.position.x, this.position.y, this.size * 2);
        
        // Reset shadow
        p.drawingContext.shadowBlur = 0;
        
        // Draw tunnels
        p.stroke(70, 50, 30);
        p.strokeWeight(1);
        
        for (const tunnel of this.tunnels) {
            p.push();
            p.translate(this.position.x, this.position.y);
            
            p.noFill();
            p.strokeWeight(tunnel.width);
            
            p.beginShape();
            for (const point of tunnel.points) {
                p.vertex(point.x, point.y);
            }
            p.endShape();
            
            p.pop();
        }
        
        // Draw entrances
        p.noStroke();
        p.fill(60, 40, 20);
        
        for (const entrance of this.entrances) {
            const x = this.position.x + Math.cos(entrance.angle) * this.size;
            const y = this.position.y + Math.sin(entrance.angle) * this.size;
            
            p.circle(x, y, entrance.width * 2);
        }
        
        // Draw progress indicator for food storage
        const progressRadius = this.size * 0.6;
        const progress = Math.min(1, this.foodStored / this.foodStorageGoal);
        
        p.noFill();
        p.strokeWeight(3);
        p.stroke(150, 150, 150, 50);
        p.arc(this.position.x, this.position.y, progressRadius * 2, progressRadius * 2, 0, Math.PI * 2);
        
        if (progress > 0) {
            p.stroke(60, 220, 130);
            p.arc(this.position.x, this.position.y, progressRadius * 2, progressRadius * 2, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
        }
        
        p.pop();
        
        // Draw particle effects
        this.drawParticles(p);
    }
    
    // Draw particles like food being carried to nest
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
    
    // Get percentage of food goal completed
    getStoragePercentage() {
        return (this.foodStored / this.foodStorageGoal) * 100;
    }
    
    // Reset nest for a new simulation
    reset() {
        this.foodStored = 0;
    }
}

/**
 * Particle effect for food being stored in the nest
 */
class NestParticle {
    constructor(startX, startY, targetX, targetY, color, lifespan) {
        this.position = { x: startX, y: startY };
        this.target = { x: targetX, y: targetY };
        this.velocity = { x: 0, y: 0 };
        this.color = [...color];
        this.alpha = 255;
        this.size = MathUtils.random(3, 6);
        this.lifespan = lifespan;
        this.age = 0;
        
        // Calculate velocity to reach target in lifespan time
        const direction = Vector.subtract(this.target, this.position);
        const distance = Vector.magnitude(direction);
        const speed = distance / lifespan;
        const normalized = Vector.normalize(direction);
        
        this.velocity.x = normalized.x * speed;
        this.velocity.y = normalized.y * speed;
    }
    
    update() {
        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Age the particle
        this.age++;
        this.alpha = MathUtils.map(this.age, 0, this.lifespan, 255, 0);
        this.size *= 0.97;
    }
    
    draw(p) {
        p.noStroke();
        p.fill(this.color[0], this.color[1], this.color[2], this.alpha);
        p.circle(this.position.x, this.position.y, this.size);
    }
    
    isDead() {
        return this.age >= this.lifespan || this.size < 1;
    }
} 