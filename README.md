# Ant Colony Optimization Simulation

An interactive, visual simulation of ant colony optimization (ACO) that demonstrates how collective intelligence emerges from simple rules. Built with p5.js to create an engaging educational experience that balances scientific accuracy with visual appeal.

## Features

- **Complete Ant Colony Optimization Algorithm**:
  - Dynamic pheromone deposition and evaporation mechanics
  - Probabilistic path selection based on pheromone intensity
  - Multiple food sources with varying resource quantities
  - Ant nest with spawning mechanics
  - Obstacles that ants navigate around

- **Visual Design**:
  - Smooth animations for ant movement with proper orientation
  - Gradient visualization of pheromone trails
  - Particle effects for food collection
  - Day/night cycle with lighting changes
  - Minimalist UI integrated with the simulation

- **Interactive Controls**:
  - Simulation speed (pause/play/fast-forward)
  - Colony parameters (population size, spawn rate)
  - Pheromone properties (strength, evaporation rate, diffusion)
  - Ant behavior variables (exploration vs. exploitation tendency)
  - Place/remove food sources and obstacles

- **Educational Component**:
  - Info panel explaining the principles of ant colony optimization
  - Statistics tracking (efficiency of paths, collection rates)
  - Visualization of optimal paths over time

## How to Run

Simply open `index.html` in a modern web browser. No server or compilation is required.

## Controls

- **Mouse Controls**:
  - Click with the food tool to place food sources
  - Click with the obstacle tool to place obstacles
  - Click with the remove tool to delete obstacles
  
- **Keyboard Shortcuts**:
  - Space: Play/pause simulation
  - R: Reset simulation
  - 1-4: Switch between tools (select, food, obstacle, remove)
  - Left/Right arrows: Decrease/increase simulation speed

## How It Works

The simulation demonstrates how ants, following simple rules, can collectively find optimal paths to food:

1. Ants initially move randomly in search of food
2. When food is found, they return to the nest, laying pheromone trails
3. Other ants are more likely to follow stronger pheromone trails
4. Pheromones evaporate over time, which favors shorter paths
5. Eventually, most ants converge on the optimal path

## Real-world Applications of Ant Colony Optimization

- Routing optimization in transportation networks
- Task scheduling in manufacturing
- Protein folding in computational biology
- Network routing in telecommunications

## Technical Implementation

- Object-oriented design with modular components
- Spatial partitioning for efficient collision detection
- Pheromone grid system with diffusion mechanics
- Performance optimizations for handling hundreds of ants

## Author

Created as an educational project to demonstrate emergent behavior through ant colony optimization.

## License

MIT License 