/**
 * Main p5.js sketch file for Ant Colony Optimization simulation
 */

// Global simulation object
let simulation;

function setup() {
    // Create canvas that fills the container minus the control panel width
    const container = document.getElementById('simulation-container');
    const canvas = createCanvas(
        window.innerWidth - 280,  // Adjust for control panel width
        window.innerHeight
    );
    canvas.parent(container);
    
    // Set initial canvas size in config
    CONFIG.canvas.width = width;
    CONFIG.canvas.height = height;
    
    // Create simulation
    simulation = new Simulation();
    simulation.initialize(this);
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Disable right-click context menu on canvas
    document.getElementById('defaultCanvas0').addEventListener('contextmenu', event => {
        event.preventDefault();
    });
    
    // Use P2D renderer for better performance if available
    try {
        pixelDensity(1); // Set to 1 for better performance
    } catch (e) {
        console.warn('Could not set pixel density');
    }
    
    // Cap framerate to 60fps
    frameRate(60);
}

function draw() {
    // Update simulation
    simulation.update(millis());
    
    // Draw simulation
    simulation.draw(this);
}

// Handle window resize
function handleResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    resizeCanvas(newWidth - 280, newHeight);
    simulation.resize(newWidth, newHeight);
}

// Handle mouse click
function mousePressed() {
    // Pass mouse events to UI for tool handling
    // Already handled by UI event listeners
}

// Handle key presses
function keyPressed() {
    // Spacebar: toggle pause
    if (key === ' ') {
        CONFIG.simulation.paused = !CONFIG.simulation.paused;
    }
    
    // 'r': reset simulation
    if (key === 'r' || key === 'R') {
        simulation.reset();
    }
    
    // '1', '2', '3', '4': tool selection shortcuts
    if (key === '1') {
        document.getElementById('selectTool').click();
    } else if (key === '2') {
        document.getElementById('foodTool').click();
    } else if (key === '3') {
        document.getElementById('obstacleTool').click();
    } else if (key === '4') {
        document.getElementById('removeTool').click();
    }
    
    // Left/right arrows: adjust simulation speed
    if (keyCode === LEFT_ARROW) {
        CONFIG.simulation.speedMultiplier = Math.max(0.25, CONFIG.simulation.speedMultiplier / 2);
    } else if (keyCode === RIGHT_ARROW) {
        CONFIG.simulation.speedMultiplier = Math.min(8, CONFIG.simulation.speedMultiplier * 2);
    }
} 