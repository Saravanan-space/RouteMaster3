# RouteMaster | Autonomous Warehouse Navigation System

RouteMaster is a powerful, visually stunning web application designed strictly for Warehouse Navigation logic. It enables a user to build diverse warehouse maps, place a start and target point intuitively through Drag-n-Drop, place and remove obstacles by interacting directly with the grid, and visually animate the pathfinding of the selected algorithm.

## Beautiful UI / UX
The application strictly focuses on a Cyberpunk-inspired aesthetic, boasting a dynamic moving grid & floating linear gradients.

## Core Features
1. **Interactive Warehouse Grid:** Easily resize and rebuild the matrix. Click cells to toggle obstacles on/off.
2. **Dynamic Drag-and-Drop:** Seamlessly drag the start robot (Blue) or target (Orange) across the map.
3. **Advanced Pathfinding Toggle:** Switch in real-time between **Breadth-First Search (BFS)** and **A* Search Algorithm**. 
4. **Execution Metrics & Efficiency Progress Bar:** Detailed steps, distances, computed algorithms vs Explored nodes for absolute clarity, alongside visual percentage bars tracking path efficiency.
5. **State Imports/Exports:** 
  - Upload Comma-Separated Values (`.csv`) structural files.
  - Download current states as `Warehouse_Config.doc` right off the browser via the new JSON data-export.

## Required Setup Scripts
This modern architecture makes use of the optimal `React` and `Vite` setup to structure components optimally. Make sure `Node.js` is installed on your machine.

To get started, clone the repository or open this exact directory onto your path and run:
```bash
# 1. Install necessary dependencies natively
npm install

# 2. Re-compile and start development server
npm run dev
```

Visit the `http://localhost:<PORT>` URL defined inside your executed terminal console. Enjoy route mastery!
