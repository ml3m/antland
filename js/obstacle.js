/**
 * Obstacle class for the ant colony simulation
 * Represents physical barriers that ants must navigate around
 */
class Obstacle {
    constructor(x, y, radius) {
        this.position = { x, y };
        this.radius = radius || MathUtils.random(CONFIG.obstacles.minSize, CONFIG.obstacles.maxSize);
        this.color = CONFIG.obstacles.color;
        this.gridIndex = undefined;
        
        // Visual properties
        this.roughness = MathUtils.random(0.1, 0.3); // How jagged the obstacle appears
        this.vertices = []; // For irregular shape
        this.generateVertices();
    }
    
    // Create irregular vertices for a more natural look
    generateVertices() {
        const vertexCount = Math.floor(MathUtils.map(this.radius, 
            CONFIG.obstacles.minSize, CONFIG.obstacles.maxSize, 
            8, 16));
        
        for (let i = 0; i < vertexCount; i++) {
            const angle = (i / vertexCount) * Math.PI * 2;
            
            // Vary the radius to create irregular shape
            const radiusVariation = this.radius * (1 + MathUtils.random(-this.roughness, this.roughness));
            
            this.vertices.push({
                x: Math.cos(angle) * radiusVariation,
                y: Math.sin(angle) * radiusVariation
            });
        }
    }
    
    // Check if a point is inside or too close to the obstacle
    contains(point, buffer = 0) {
        return Vector.distance(this.position, point) < this.radius + buffer;
    }
    
    // Draw the obstacle
    draw(p) {
        p.push();
        p.translate(this.position.x, this.position.y);
        
        // Draw shadow
        if (CONFIG.visualization.renderShadows) {
            p.drawingContext.shadowBlur = 20;
            p.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
            p.drawingContext.shadowOffsetX = 5;
            p.drawingContext.shadowOffsetY = 5;
        }
        
        // Draw main obstacle
        p.fill(this.color[0], this.color[1], this.color[2]);
        p.noStroke();
        
        // Draw the irregular shape
        p.beginShape();
        for (const vertex of this.vertices) {
            p.vertex(vertex.x, vertex.y);
        }
        p.endShape(p.CLOSE);
        
        // Reset shadow
        p.drawingContext.shadowBlur = 0;
        p.drawingContext.shadowOffsetX = 0;
        p.drawingContext.shadowOffsetY = 0;
        
        p.pop();
    }
}

/**
 * Obstacle manager to handle all obstacles in the simulation
 */
class ObstacleManager {
    constructor() {
        this.obstacles = [];
    }
    
    // Initialize obstacles
    initialize(width, height, nestPosition) {
        this.width = width;
        this.height = height;
        
        // Clear existing obstacles
        this.obstacles = [];
        
        // Add initial obstacles
        const obstaclesToAdd = CONFIG.obstacles.count;
        const nestRadius = CONFIG.nest.size * 1.5; // Buffer around nest
        
        for (let i = 0; i < obstaclesToAdd; i++) {
            let validPosition = false;
            let x, y, radius;
            let attempts = 0;
            
            // Try to place obstacles in valid positions
            while (!validPosition && attempts < 100) {
                attempts++;
                
                // Generate random position and radius
                radius = MathUtils.random(CONFIG.obstacles.minSize, CONFIG.obstacles.maxSize);
                x = MathUtils.random(radius + 20, width - radius - 20);
                y = MathUtils.random(radius + 20, height - radius - 20);
                
                // Check if position is far enough from nest
                const distToNest = Vector.distance({ x, y }, nestPosition);
                if (distToNest < nestRadius + radius) continue;
                
                // Check if position doesn't overlap with other obstacles
                let overlap = false;
                for (const obstacle of this.obstacles) {
                    const minDistance = obstacle.radius + radius + 20; // Add buffer
                    const dist = Vector.distance({ x, y }, obstacle.position);
                    if (dist < minDistance) {
                        overlap = true;
                        break;
                    }
                }
                
                if (!overlap) {
                    validPosition = true;
                }
            }
            
            if (validPosition) {
                this.addObstacle(x, y, radius);
            }
        }
    }
    
    // Add an obstacle at the specified position
    addObstacle(x, y, radius) {
        const obstacle = new Obstacle(x, y, radius);
        this.obstacles.push(obstacle);
        return obstacle;
    }
    
    // Check if a point collides with any obstacle
    checkCollision(point, buffer = 0) {
        for (const obstacle of this.obstacles) {
            if (obstacle.contains(point, buffer)) {
                return true;
            }
        }
        return false;
    }
    
    // Find closest point outside all obstacles to avoid overlap
    findSafePosition(point, buffer = 0) {
        // Check if already safe
        if (!this.checkCollision(point, buffer)) {
            return point;
        }
        
        // Find obstacle that contains the point
        let containingObstacle = null;
        for (const obstacle of this.obstacles) {
            if (obstacle.contains(point, buffer)) {
                containingObstacle = obstacle;
                break;
            }
        }
        
        if (!containingObstacle) return point; // Shouldn't happen
        
        // Calculate direction from obstacle center to point
        const direction = Vector.subtract(point, containingObstacle.position);
        const directionNorm = Vector.normalize(direction);
        
        // Place point outside obstacle with buffer
        const safeDistance = containingObstacle.radius + buffer + 1;
        return {
            x: containingObstacle.position.x + directionNorm.x * safeDistance,
            y: containingObstacle.position.y + directionNorm.y * safeDistance
        };
    }
    
    // Calculate avoidance force for an ant near obstacles
    calculateAvoidanceForce(ant) {
        const avoidanceRadius = CONFIG.ant.sensorDistance * 1.5;
        let avoidanceForce = { x: 0, y: 0 };
        let nearObstacle = false;
        
        for (const obstacle of this.obstacles) {
            const dist = Vector.distance(ant.position, obstacle.position);
            
            // If ant is close to an obstacle
            if (dist < obstacle.radius + avoidanceRadius) {
                nearObstacle = true;
                
                // Calculate direction away from obstacle
                const awayDirection = Vector.subtract(ant.position, obstacle.position);
                const awayNorm = Vector.normalize(awayDirection);
                
                // Stronger force when closer
                const forceMagnitude = Math.max(0, 1 - (dist - obstacle.radius) / avoidanceRadius);
                
                avoidanceForce.x += awayNorm.x * forceMagnitude * 2;
                avoidanceForce.y += awayNorm.y * forceMagnitude * 2;
            }
        }
        
        if (nearObstacle) {
            return Vector.normalize(avoidanceForce);
        }
        
        return null; // No obstacle nearby
    }
    
    // Draw all obstacles
    draw(p) {
        for (const obstacle of this.obstacles) {
            obstacle.draw(p);
        }
    }
    
    // Handle click to add obstacle
    handleClick(x, y, radius) {
        this.addObstacle(x, y, radius || MathUtils.random(CONFIG.obstacles.minSize, CONFIG.obstacles.maxSize));
    }
    
    // Remove obstacle at the specified position
    removeAt(position, radius = 10) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            const dist = Vector.distance(position, obstacle.position);
            if (dist <= obstacle.radius + radius) {
                this.obstacles.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    
    // Clear all obstacles
    clear() {
        this.obstacles = [];
    }
} 