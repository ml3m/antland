/**
 * Utility functions for the ant colony optimization simulation
 */

// Vector operations
const Vector = {
    // Add two vectors
    add(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    },
    
    // Subtract v2 from v1
    subtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    },
    
    // Multiply vector by scalar
    multiply(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar };
    },
    
    // Get vector magnitude/length
    magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },
    
    // Get squared magnitude (faster when just comparing distances)
    magnitudeSquared(v) {
        return v.x * v.x + v.y * v.y;
    },
    
    // Normalize vector to unit length
    normalize(v) {
        const mag = this.magnitude(v);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: v.x / mag, y: v.y / mag };
    },
    
    // Get distance between two vectors
    distance(v1, v2) {
        return this.magnitude(this.subtract(v1, v2));
    },
    
    // Get squared distance between two vectors (more efficient)
    distanceSquared(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return dx * dx + dy * dy;
    },
    
    // Create a vector from angle and magnitude
    fromAngle(angle, magnitude = 1) {
        return { 
            x: Math.cos(angle) * magnitude, 
            y: Math.sin(angle) * magnitude 
        };
    },
    
    // Get angle of vector
    angle(v) {
        return Math.atan2(v.y, v.x);
    },
    
    // Limit vector magnitude to max value
    limit(v, max) {
        const magSquared = this.magnitudeSquared(v);
        if (magSquared > max * max) {
            const mag = Math.sqrt(magSquared);
            return { x: v.x * max / mag, y: v.y * max / mag };
        }
        return v;
    },
    
    // Get dot product of two vectors
    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
};

// Spatial partitioning grid for efficient collision detection
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows).fill().map(() => []);
    }
    
    // Convert position to cell index
    posToIndex(position) {
        const col = Math.floor(position.x / this.cellSize);
        const row = Math.floor(position.y / this.cellSize);
        
        // Handle edge cases outside grid
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        
        return row * this.cols + col;
    }
    
    // Add entity to appropriate cell
    insert(entity) {
        const index = this.posToIndex(entity.position);
        if (index !== -1) {
            entity.gridIndex = index;
            this.grid[index].push(entity);
        }
    }
    
    // Remove entity from its cell
    remove(entity) {
        if (entity.gridIndex !== undefined && entity.gridIndex !== -1) {
            const cell = this.grid[entity.gridIndex];
            const index = cell.indexOf(entity);
            if (index !== -1) {
                cell.splice(index, 1);
            }
            entity.gridIndex = undefined;
        }
    }
    
    // Update entity's position in grid
    update(entity) {
        const newIndex = this.posToIndex(entity.position);
        
        if (newIndex === entity.gridIndex) return; // No change needed
        
        // Remove from old cell
        this.remove(entity);
        
        // Add to new cell
        if (newIndex !== -1) {
            entity.gridIndex = newIndex;
            this.grid[newIndex].push(entity);
        }
    }
    
    // Get all entities in the cell containing position
    queryPosition(position) {
        const index = this.posToIndex(position);
        return index !== -1 ? this.grid[index] : [];
    }
    
    // Get all entities in cells within radius of position
    queryRadius(position, radius) {
        const results = [];
        
        // Calculate cell bounds
        const minCol = Math.max(0, Math.floor((position.x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((position.x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((position.y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((position.y + radius) / this.cellSize));
        
        // Check all cells in the area
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const index = row * this.cols + col;
                results.push(...this.grid[index]);
            }
        }
        
        return results;
    }
    
    // Clear all entities from the grid
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }
    
    // Draw grid for debugging
    draw(p) {
        p.stroke(100, 100, 100, 50);
        p.strokeWeight(0.5);
        p.noFill();
        
        // Draw horizontal lines
        for (let row = 0; row <= this.rows; row++) {
            p.line(0, row * this.cellSize, this.cols * this.cellSize, row * this.cellSize);
        }
        
        // Draw vertical lines
        for (let col = 0; col <= this.cols; col++) {
            p.line(col * this.cellSize, 0, col * this.cellSize, this.rows * this.cellSize);
        }
        
        // Draw cell population
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(8);
        p.fill(200);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                const count = this.grid[index].length;
                if (count > 0) {
                    p.text(count, col * this.cellSize + this.cellSize/2, row * this.cellSize + this.cellSize/2);
                }
            }
        }
    }
}

// Mathematical utility functions
const MathUtils = {
    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    // Map a value from one range to another
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },
    
    // Constrain a value between min and max
    constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // Random float between min and max
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // Return 1 with probability p, 0 otherwise
    randomBernoulli(p) {
        return Math.random() < p ? 1 : 0;
    },
    
    // Shortest distance between two angles (in radians)
    angleDiff(a, b) {
        let diff = (b - a) % (2 * Math.PI);
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;
        return diff;
    }
};

// Collision detection utilities
const Collision = {
    // Check if point is inside circle
    pointCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    },
    
    // Check if circles overlap
    circleCircle(c1x, c1y, c1r, c2x, c2y, c2r) {
        const dx = c2x - c1x;
        const dy = c2y - c1y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < c1r + c2r;
    },
    
    // Check if point is inside rectangle
    pointRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    // Check if circles and rectangle overlap
    circleRect(cx, cy, radius, rx, ry, rw, rh) {
        // Find closest point in rectangle to circle center
        const closestX = MathUtils.constrain(cx, rx, rx + rw);
        const closestY = MathUtils.constrain(cy, ry, ry + rh);
        
        // Calculate distance between circle center and closest point
        const dx = cx - closestX;
        const dy = cy - closestY;
        
        // Check if distance is less than radius
        return (dx * dx + dy * dy) < (radius * radius);
    },
    
    // Line segment intersection
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        
        if (denom === 0) {
            return null; // Lines are parallel
        }
        
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        
        // If ua and ub are between 0-1, lines are intersecting
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1)
            };
        }
        
        return null;
    }
};

// Color utility functions
const ColorUtils = {
    // Interpolate between two colors
    lerpColor(c1, c2, t) {
        return [
            MathUtils.lerp(c1[0], c2[0], t),
            MathUtils.lerp(c1[1], c2[1], t),
            MathUtils.lerp(c1[2], c2[2], t),
            c1.length === 4 && c2.length === 4 
                ? MathUtils.lerp(c1[3], c2[3], t) 
                : 255
        ];
    },
    
    // Convert HSL to RGB (hue: 0-360, saturation/lightness: 0-100)
    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        
        if (0 <= h && h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (60 <= h && h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (120 <= h && h < 180) {
            [r, g, b] = [0, c, x];
        } else if (180 <= h && h < 240) {
            [r, g, b] = [0, x, c];
        } else if (240 <= h && h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }
};

// Performance monitoring utility
class PerformanceMonitor {
    constructor() {
        this.frameTimeHistory = new Array(60).fill(0);
        this.entityCountHistory = new Array(60).fill(0);
        this.frameTimeIndex = 0;
        this.entityCountIndex = 0;
        this.lastFrameTime = 0;
        this.frameRate = 0;
    }
    
    update(timestamp, entityCount) {
        const frameTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        if (frameTime > 0) {
            this.frameRate = 1000 / frameTime;
        }
        
        this.frameTimeHistory[this.frameTimeIndex] = frameTime;
        this.frameTimeIndex = (this.frameTimeIndex + 1) % this.frameTimeHistory.length;
        
        this.entityCountHistory[this.entityCountIndex] = entityCount;
        this.entityCountIndex = (this.entityCountIndex + 1) % this.entityCountHistory.length;
    }
    
    getAverageFrameTime() {
        return this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    }
    
    getFrameRate() {
        return this.frameRate;
    }
    
    getAverageEntityCount() {
        return this.entityCountHistory.reduce((sum, count) => sum + count, 0) / this.entityCountHistory.length;
    }
} 