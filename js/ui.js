/**
 * UI manager for the ant colony simulation
 * Handles control panel, info display, and user interactions
 */
class UI {
    constructor(simulation) {
        this.simulation = simulation;
        this.controlPanel = document.getElementById('control-panel');
        this.infoPanel = null;
        this.statsPanel = null;
        this.activeTool = 'none'; // none, food, obstacle, remove
        this.initialized = false;
        this.currentTooltip = null;
        this.frameCountForFPS = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        
        // Statistics tracking
        this.stats = {
            foodCollected: 0,
            peakAnts: 0,
            optimalPathTime: 0,
            simulationTime: 0
        };
    }
    
    // Initialize UI elements
    initialize() {
        this.createControlPanel();
        this.createInfoPanel();
        this.createStatsPanel();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
    }
    
    // Create the control panel sections and controls
    createControlPanel() {
        this.controlPanel.innerHTML = '';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Ant Colony Optimization';
        title.style.textAlign = 'center';
        title.style.margin = '10px 0 20px 0';
        this.controlPanel.appendChild(title);
        
        // Simulation controls
        this.addSection('Simulation', [
            this.createButtonGroup([
                { id: 'playPause', icon: '⏯️', tooltip: 'Play/Pause' },
                { id: 'speedDown', icon: '🐌', tooltip: 'Decrease Speed' },
                { id: 'speedNormal', icon: '⏱️', tooltip: 'Normal Speed' },
                { id: 'speedUp', icon: '🚀', tooltip: 'Increase Speed' }
            ]),
            this.createButton('reset', 'Reset Simulation', this.handleResetClick.bind(this)),
            this.createToggle('dayNightCycle', 'Enable Day/Night Cycle', CONFIG.time.dayNightEnabled, val => {
                CONFIG.time.dayNightEnabled = val;
            })
        ]);
        
        // Environment tools
        this.addSection('Tools', [
            this.createButtonGroup([
                { id: 'selectTool', icon: '👆', tooltip: 'Select', active: true },
                { id: 'foodTool', icon: '🍎', tooltip: 'Add Food' },
                { id: 'obstacleTool', icon: '🪨', tooltip: 'Add Obstacle' },
                { id: 'removeTool', icon: '🗑️', tooltip: 'Remove' }
            ]),
            this.createSlider('foodAmount', 'Food Quantity', CONFIG.food.minQuantity, CONFIG.food.maxQuantity, 
                (CONFIG.food.minQuantity + CONFIG.food.maxQuantity) / 2, 10, val => {
                    this.simulation.toolFoodAmount = val;
                }),
            this.createSlider('obstacleSize', 'Obstacle Size', CONFIG.obstacles.minSize, CONFIG.obstacles.maxSize, 
                (CONFIG.obstacles.minSize + CONFIG.obstacles.maxSize) / 2, 5, val => {
                    this.simulation.toolObstacleSize = val;
                })
        ]);
        
        // Ant colony settings
        this.addSection('Ant Colony', [
            this.createSlider('antCount', 'Population', 10, CONFIG.ant.maxCount, CONFIG.ant.count, 10, val => {
                CONFIG.ant.count = val;
                // When reducing population, no immediate effect; when increasing, add ants
                if (val > this.simulation.antColony.getAntCount()) {
                    const toAdd = val - this.simulation.antColony.getAntCount();
                    for (let i = 0; i < toAdd; i++) {
                        this.simulation.antColony.addAnt();
                    }
                }
            }),
            this.createSlider('antSpeed', 'Speed', 0.5, 5, CONFIG.ant.speed, 0.1, val => {
                CONFIG.ant.speed = val;
            }),
            this.createSlider('spawnRate', 'Spawn Rate', 0, 3, CONFIG.ant.spawnRate, 0.1, val => {
                CONFIG.ant.spawnRate = val;
            }),
            this.createSlider('explorationRate', 'Exploration Rate', 0, 0.5, CONFIG.ant.explorationRate, 0.01, val => {
                CONFIG.ant.explorationRate = val;
            })
        ]);
        
        // Pheromone settings
        this.addSection('Pheromones', [
            this.createSlider('pheromoneStrength', 'Strength', 10, 200, CONFIG.pheromone.toFood.strength, 10, val => {
                CONFIG.pheromone.toFood.strength = val;
                CONFIG.pheromone.toNest.strength = val;
            }),
            this.createSlider('evaporationRate', 'Evaporation', 0.97, 0.999, CONFIG.pheromone.toFood.evaporationRate, 0.001, val => {
                CONFIG.pheromone.toFood.evaporationRate = val;
                CONFIG.pheromone.toNest.evaporationRate = val;
            }),
            this.createSlider('diffusionRate', 'Diffusion', 0, 0.3, CONFIG.pheromone.toFood.diffusionRate, 0.01, val => {
                CONFIG.pheromone.toFood.diffusionRate = val;
                CONFIG.pheromone.toNest.diffusionRate = val;
            }),
            this.createButton('clearPheromones', 'Clear Pheromones', () => {
                this.simulation.pheromoneSystem.clear();
            })
        ]);
        
        // Visualization options
        this.addSection('Visualization', [
            this.createToggle('showPheromones', 'Show Pheromones', CONFIG.visualization.showPheromones, val => {
                CONFIG.visualization.showPheromones = val;
            }),
            this.createToggle('trailHistory', 'Show Ant Trails', CONFIG.visualization.trailHistory, val => {
                CONFIG.visualization.trailHistory = val;
            }),
            this.createToggle('showGrid', 'Show Grid', CONFIG.visualization.showGrid, val => {
                CONFIG.visualization.showGrid = val;
            }),
            this.createToggle('showStats', 'Show Statistics', CONFIG.visualization.showStats, val => {
                CONFIG.visualization.showStats = val;
                if (this.statsPanel) {
                    this.statsPanel.style.display = val ? 'block' : 'none';
                }
            })
        ]);
        
        // Educational info
        this.addSection('About ACO', [
            this.createToggleButton('showInfo', 'Show Algorithm Info', this.toggleInfoPanel.bind(this))
        ]);
    }
    
    // Create the info panel with educational content
    createInfoPanel() {
        // Remove existing info panel if it exists
        if (this.infoPanel) {
            this.infoPanel.remove();
        }
        
        this.infoPanel = document.createElement('div');
        this.infoPanel.className = 'info-panel';
        this.infoPanel.style.display = 'none';
        this.infoPanel.innerHTML = `
            <h3>Ant Colony Optimization</h3>
            <p>
                Ant Colony Optimization (ACO) is a nature-inspired algorithm that mimics how ants
                find the shortest path between their nest and food sources.
            </p>
            <h4>How it works:</h4>
            <ol>
                <li>Ants initially move randomly in search of food</li>
                <li>When food is found, they return to the nest, laying pheromone trails</li>
                <li>Other ants are more likely to follow stronger pheromone trails</li>
                <li>Pheromones evaporate over time, favoring shorter paths</li>
                <li>Eventually, most ants converge on the optimal path</li>
            </ol>
            <h4>Real-world Applications:</h4>
            <ul>
                <li>Routing optimization in transportation networks</li>
                <li>Task scheduling in manufacturing</li>
                <li>Protein folding in computational biology</li>
                <li>Network routing in telecommunications</li>
            </ul>
            <button id="closeInfo" class="close-button">Close</button>
        `;
        
        document.getElementById('simulation-container').appendChild(this.infoPanel);
        
        // Add close button event listener
        setTimeout(() => {
            const closeButton = document.getElementById('closeInfo');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.infoPanel.style.display = 'none';
                });
            }
        }, 0);
    }
    
    // Create the statistics panel
    createStatsPanel() {
        // Remove existing stats panel if it exists
        if (this.statsPanel) {
            this.statsPanel.remove();
        }
        
        this.statsPanel = document.createElement('div');
        this.statsPanel.className = 'stats-panel';
        this.statsPanel.style.display = CONFIG.visualization.showStats ? 'block' : 'none';
        document.getElementById('simulation-container').appendChild(this.statsPanel);
        this.updateStats();
    }
    
    // Update statistics display
    updateStats() {
        if (!this.statsPanel || !CONFIG.visualization.showStats) return;
        
        const simulation = this.simulation;
        const nest = simulation.nest;
        const antColony = simulation.antColony;
        
        // Update peak ant count
        this.stats.peakAnts = Math.max(this.stats.peakAnts, antColony.getAntCount());
        
        // Update simulation time
        this.stats.simulationTime += 1/60 * CONFIG.simulation.speedMultiplier;
        
        // Update food collected
        this.stats.foodCollected = nest.foodStored;
        
        const formattedTime = this.formatTime(this.stats.simulationTime);
        
        this.statsPanel.innerHTML = `
            <h3>Simulation Statistics</h3>
            <div class="stat-row">
                <span>Ants:</span>
                <span>${antColony.getAntCount()} (${antColony.getCarryingFoodCount()} carrying food)</span>
            </div>
            <div class="stat-row">
                <span>Food Collected:</span>
                <span>${Math.floor(nest.foodStored)} / ${nest.foodStorageGoal} (${Math.floor(nest.getStoragePercentage())}%)</span>
            </div>
            <div class="stat-row">
                <span>Simulation Time:</span>
                <span>${formattedTime}</span>
            </div>
            <div class="stat-row">
                <span>FPS:</span>
                <span>${this.currentFPS}</span>
            </div>
        `;
    }
    
    // Add a section to the control panel
    addSection(title, controls) {
        const section = document.createElement('div');
        section.className = 'panel-section';
        
        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);
        
        controls.forEach(control => {
            section.appendChild(control);
        });
        
        this.controlPanel.appendChild(section);
    }
    
    // Create a slider control
    createSlider(id, label, min, max, value, step, onChange) {
        const container = document.createElement('div');
        container.className = 'control-row';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'control-label';
        labelEl.textContent = label;
        
        const valueEl = document.createElement('span');
        valueEl.textContent = value;
        valueEl.style.marginLeft = '5px';
        valueEl.style.minWidth = '30px';
        valueEl.style.textAlign = 'right';
        labelEl.appendChild(valueEl);
        
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'control-input';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = id;
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.step = step;
        
        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            valueEl.textContent = val;
            onChange(val);
        });
        
        sliderContainer.appendChild(slider);
        
        container.appendChild(labelEl);
        container.appendChild(sliderContainer);
        
        return container;
    }
    
    // Create a button control
    createButton(id, text, onClick) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    
    // Create a toggle button
    createToggleButton(id, text, onClick) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    
    // Create a toggle switch
    createToggle(id, label, initialValue, onChange) {
        const container = document.createElement('div');
        container.className = 'control-row';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'control-label';
        labelEl.textContent = label;
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'control-input';
        
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = id;
        toggle.checked = initialValue;
        
        toggle.addEventListener('change', () => {
            onChange(toggle.checked);
        });
        
        toggleContainer.appendChild(toggle);
        
        container.appendChild(labelEl);
        container.appendChild(toggleContainer);
        
        return container;
    }
    
    // Create a group of buttons
    createButtonGroup(buttons) {
        const group = document.createElement('div');
        group.className = 'button-group';
        
        buttons.forEach(button => {
            const buttonEl = document.createElement('div');
            buttonEl.className = 'tool-button';
            buttonEl.id = button.id;
            if (button.active) buttonEl.classList.add('active');
            buttonEl.innerHTML = button.icon;
            
            // Add tooltip
            buttonEl.title = button.tooltip;
            
            buttonEl.addEventListener('click', () => {
                this.handleToolButtonClick(button.id);
            });
            
            group.appendChild(buttonEl);
        });
        
        return group;
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Play/Pause button
        const playPauseButton = document.getElementById('playPause');
        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => {
                CONFIG.simulation.paused = !CONFIG.simulation.paused;
            });
        }
        
        // Speed controls
        const speedDownButton = document.getElementById('speedDown');
        if (speedDownButton) {
            speedDownButton.addEventListener('click', () => {
                CONFIG.simulation.speedMultiplier = Math.max(0.25, CONFIG.simulation.speedMultiplier / 2);
            });
        }
        
        const speedNormalButton = document.getElementById('speedNormal');
        if (speedNormalButton) {
            speedNormalButton.addEventListener('click', () => {
                CONFIG.simulation.speedMultiplier = 1;
            });
        }
        
        const speedUpButton = document.getElementById('speedUp');
        if (speedUpButton) {
            speedUpButton.addEventListener('click', () => {
                CONFIG.simulation.speedMultiplier = Math.min(8, CONFIG.simulation.speedMultiplier * 2);
            });
        }
        
        // Canvas click handler for tool interaction
        const canvas = document.getElementById('defaultCanvas0'); // p5.js default canvas ID
        if (canvas) {
            canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        }
    }
    
    // Handle tool button clicks
    handleToolButtonClick(buttonId) {
        // Remove active class from all tool buttons
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(button => button.classList.remove('active'));
        
        // Add active class to clicked button
        const clickedButton = document.getElementById(buttonId);
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
        
        // Set active tool based on button ID
        switch (buttonId) {
            case 'selectTool':
                this.activeTool = 'none';
                break;
            case 'foodTool':
                this.activeTool = 'food';
                break;
            case 'obstacleTool':
                this.activeTool = 'obstacle';
                break;
            case 'removeTool':
                this.activeTool = 'remove';
                break;
        }
    }
    
    // Handle canvas clicks
    handleCanvasClick(event) {
        if (this.activeTool === 'none') return;
        
        // Get canvas-relative coordinates
        const canvas = document.getElementById('defaultCanvas0');
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Handle based on active tool
        switch (this.activeTool) {
            case 'food':
                this.simulation.foodManager.handleClick(x, y, this.simulation.toolFoodAmount);
                break;
            case 'obstacle':
                this.simulation.obstacleManager.handleClick(x, y, this.simulation.toolObstacleSize);
                break;
            case 'remove':
                // Try to remove an obstacle first, then food
                if (!this.simulation.obstacleManager.removeAt({ x, y })) {
                    // TODO: Implement food removal if needed
                }
                break;
        }
    }
    
    // Toggle info panel visibility
    toggleInfoPanel() {
        if (this.infoPanel) {
            const isVisible = this.infoPanel.style.display === 'block';
            this.infoPanel.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    // Handle reset button click
    handleResetClick() {
        this.simulation.reset();
    }
    
    // Format time in minutes:seconds
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Update FPS counter
    updateFPS(timestamp) {
        this.frameCountForFPS++;
        
        if (timestamp - this.lastFPSUpdate > 1000) { // Update every second
            this.currentFPS = Math.round(this.frameCountForFPS * 1000 / (timestamp - this.lastFPSUpdate));
            this.frameCountForFPS = 0;
            this.lastFPSUpdate = timestamp;
        }
    }
    
    // Main update method
    update(timestamp) {
        if (!this.initialized) return;
        
        this.updateFPS(timestamp);
        this.updateStats();
    }
} 