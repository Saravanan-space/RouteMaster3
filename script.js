const ROBOT_SPEED = 1.5;
const CELL_DISTANCE = 1;

let robotCell = null;
let targetCell = null;
let currentPathInterval = null;
let draggedItem = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("csvInput").addEventListener("change", handleCSVUpload);
  
  document.getElementById("algoToggle").addEventListener("change", (e) => {
    document.getElementById("algoLabel").innerText = e.target.checked ? "Algorithm: A*" : "Algorithm: BFS";
  });

  try {
    const data = JSON.parse(document.getElementById("jsonInput").value);
    drawGrid(data.grid, data.start);
  } catch(e) {
    console.error("Initial parse error", e);
  }
});

function getState() {
  try {
    return JSON.parse(document.getElementById("jsonInput").value);
  } catch {
    alert("Invalid JSON in textarea");
    return null;
  }
}

function updateState(grid, start) {
  const data = { grid, start };
  document.getElementById("jsonInput").value = JSON.stringify(data, null, 2);
}

function downloadJSON() {
  const state = document.getElementById("jsonInput").value;
  const blob = new Blob([state], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Warehouse_Config.doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.trim().split("\n");
    let grid = [];
    let start = [0, 0];
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i].split(",").map(val => parseInt(val.trim()));
        if(row.some(isNaN)) continue;
        grid.push(row);
    }
    
    updateState(grid, start);
    drawGrid(grid, start);
    document.getElementById("csvInput").value = "";
  };
  reader.readAsText(file);
}

function runRoute() {
  const data = getState();
  if (!data) return;

  const grid = data.grid;
  const start = data.start;
  const target = findTarget(grid);

  if (!target) {
    alert("No target available! Place a target first.");
    return;
  }

  drawGrid(grid, start);

  const isAStar = document.getElementById("algoToggle").checked;
  const result = routeMaster(grid, start, target, isAStar);

  updateStats(result);

  document.getElementById("output").textContent = JSON.stringify({
    algo: isAStar ? "A*" : "BFS",
    ...result
  }, null, 2);

  if (result.target_reached) {
    moveRobot(result.path);
  }
}

function generateWarehouse(size = 15) {
  let grid = [];
  for (let i = 0; i < size; i++) {
    let row = [];
    for (let j = 0; j < size; j++) {
      row.push(Math.random() < 0.25 ? 1 : 0);
    }
    grid.push(row);
  }

  const sx = Math.floor(Math.random() * size);
  const sy = Math.floor(Math.random() * size);

  let tx, ty;
  do {
    tx = Math.floor(Math.random() * size);
    ty = Math.floor(Math.random() * size);
  } while (tx === sx && ty === sy);

  grid[tx][ty] = 2;

  updateState(grid, [sx, sy]);
  drawGrid(grid, [sx, sy]);
}

function findTarget(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j] === 2) return [i, j];
    }
  }
  return null;
}

function routeMaster(grid, start, target, isAStar) {
  const startTime = performance.now();
  let searchResult;
  
  if (isAStar) {
    searchResult = aStarMode(grid, start, target);
  } else {
    searchResult = bfsMode(grid, start, target);
  }

  const endTime = performance.now();
  let exec = Math.round(endTime - startTime);
  if (exec === 0) exec = 1;

  const pathLength = searchResult.path ? searchResult.path.length - 1 : 0;
  const efficiency = searchResult.visitedNodes > 0 
                     ? Math.round(((pathLength || 1) / searchResult.visitedNodes) * 100) 
                     : 0;

  return {
    total_steps: pathLength,
    path: searchResult.path || [],
    target_reached: !!searchResult.path,
    execution_time_ms: exec,
    visited_nodes: searchResult.visitedNodes,
    efficiency: Math.min(efficiency, 100)
  };
}

function bfsMode(grid, start, target) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  const queue = [start];
  const visited = new Set([start.toString()]);
  const parent = {};
  let visitedNodes = 0;

  while (queue.length) {
    const [x, y] = queue.shift();
    visitedNodes++;

    if (x === target[0] && y === target[1]) {
      return { path: reconstruct(parent, start, target), visitedNodes };
    }

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && ny >= 0 && nx < rows && ny < cols && grid[nx][ny] !== 1 && !visited.has([nx, ny].toString())) {
        visited.add([nx, ny].toString());
        parent[[nx, ny]] = [x, y];
        queue.push([nx, ny]);
      }
    }
  }
  return { path: null, visitedNodes };
}

function aStarMode(grid, start, target) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  const h = (pos) => Math.abs(pos[0] - target[0]) + Math.abs(pos[1] - target[1]);

  const openSet = [start];
  const parent = {};
  
  const gScore = {};
  gScore[start.toString()] = 0;
  
  const fScore = {};
  fScore[start.toString()] = h(start);
  
  let visitedNodes = 0;
  const closedSet = new Set();

  while (openSet.length > 0) {
    let currentIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      const p1 = openSet[i].toString();
      const p0 = openSet[currentIdx].toString();
      if ((fScore[p1] || Infinity) < (fScore[p0] || Infinity)) {
        currentIdx = i;
      }
    }
    
    const current = openSet[currentIdx];
    openSet.splice(currentIdx, 1);
    
    if (closedSet.has(current.toString())) continue;
    closedSet.add(current.toString());
    visitedNodes++;

    if (current[0] === target[0] && current[1] === target[1]) {
      return { path: reconstruct(parent, start, target), visitedNodes };
    }

    for (const [dx, dy] of dirs) {
      const nx = current[0] + dx;
      const ny = current[1] + dy;
      const neighbor = [nx, ny];
      const neighStr = neighbor.toString();
      
      if (nx >= 0 && ny >= 0 && nx < rows && ny < cols && grid[nx][ny] !== 1) {
        if (closedSet.has(neighStr)) continue;
        
        const tentativeG = gScore[current.toString()] + 1;
        
        if (!openSet.some(p => p[0] === nx && p[1] === ny)) {
          openSet.push(neighbor);
        } else if (tentativeG >= (gScore[neighStr] || Infinity)) {
          continue;
        }

        parent[neighbor] = current;
        gScore[neighStr] = tentativeG;
        fScore[neighStr] = tentativeG + h(neighbor);
      }
    }
  }
  return { path: null, visitedNodes };
}

function reconstruct(parent, start, target) {
  let path = [target];
  let cur = target.toString();

  while (cur !== start.toString()) {
    const prev = parent[cur];
    if (!prev) return null;
    path.push(prev);
    cur = prev.toString();
  }
  return path.reverse();
}

function drawGrid(grid, start) {
  const gridDiv = document.getElementById("grid");
  gridDiv.innerHTML = "";
  
  robotCell = null;
  targetCell = null;
  if(currentPathInterval) clearInterval(currentPathInterval);

  const rows = grid.length;
  const cols = grid[0].length || 1;

  let tileSize = Math.floor(900 / cols);
  if (tileSize > 40) tileSize = 40;
  if (tileSize < 18) tileSize = 18;

  gridDiv.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.r = i;
      cell.dataset.c = j;
      cell.style.width = tileSize + "px";
      cell.style.height = tileSize + "px";

      if (grid[i][j] === 1) cell.classList.add("obstacle");
      if (grid[i][j] === 2) {
        cell.classList.add("target");
        cell.draggable = true;
        targetCell = cell;
      }

      if (i === start[0] && j === start[1]) {
        cell.classList.add("robot", "start");
        cell.draggable = true;
        robotCell = cell;
      }

      cell.id = `cell-${i}-${j}`;

      // Click to toggle obstacles
      cell.addEventListener("mousedown", (e) => {
        const targetCls = cell.classList;
        if(targetCls.contains("robot") || targetCls.contains("target")) return;
        
        let data = getState();
        if(!data) return;
        if(data.grid[i][j] === 1) {
          data.grid[i][j] = 0;
          cell.classList.remove("obstacle");
        } else {
          data.grid[i][j] = 1;
          cell.classList.add("obstacle");
        }
        updateState(data.grid, data.start);
      });

      // Drag Logic
      cell.addEventListener("dragstart", (e) => {
        if(cell.classList.contains("robot")) draggedItem = "start";
        else if(cell.classList.contains("target")) draggedItem = "target";
        else e.preventDefault();
      });

      cell.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      cell.addEventListener("dragenter", (e) => {
        if(!cell.classList.contains("obstacle")) {
          cell.classList.add("drag-over");
        }
      });
      
      cell.addEventListener("dragleave", (e) => {
        cell.classList.remove("drag-over");
      });

      cell.addEventListener("drop", (e) => {
        e.preventDefault();
        cell.classList.remove("drag-over");
        if(cell.classList.contains("obstacle")) return;

        let data = getState();
        if(!data) return;

        const newR = parseInt(cell.dataset.r);
        const newC = parseInt(cell.dataset.c);

        if(draggedItem === "start") {
           data.start = [newR, newC];
           if(data.grid[newR][newC] === 2) data.grid[newR][newC] = 0;
           updateState(data.grid, data.start);
           drawGrid(data.grid, data.start);
        } else if (draggedItem === "target") {
           for(let r=0; r<data.grid.length; r++){
              for(let c=0; c<data.grid[0].length; c++){
                 if(data.grid[r][c] === 2) data.grid[r][c] = 0;
              }
           }
           data.grid[newR][newC] = 2;
           if(data.start[0]===newR && data.start[1]===newC) {
              data.start = [0, 0]; 
           }
           updateState(data.grid, data.start);
           drawGrid(data.grid, data.start);
        }
        draggedItem = null;
      });

      gridDiv.appendChild(cell);
    }
  }
}

function moveRobot(path) {
  let step = 0;
  if(currentPathInterval) clearInterval(currentPathInterval);

  currentPathInterval = setInterval(() => {
    if (step >= path.length) {
      if (targetCell) targetCell.classList.add("picked");
      clearInterval(currentPathInterval);
      return;
    }

    if (robotCell) robotCell.classList.remove("robot", "start");

    const [x, y] = path[step];
    const next = document.getElementById(`cell-${x}-${y}`);
    if(next) {
        next.classList.add("robot", "path");
        if(step === 0) next.classList.add("start");
        robotCell = next;
    }
    step++;
  }, 100);
}

function updateStats(res) {
  const steps = res.total_steps;
  const distance = steps * CELL_DISTANCE;
  
  document.getElementById("steps").innerText = steps;
  document.getElementById("distance").innerText = distance + " m";
  document.getElementById("time").innerText = res.execution_time_ms + " ms";

  const status = document.getElementById("reached");
  status.innerText = res.target_reached
    ? "📦 Package picked up"
    : "⚠ Unable to reach target";

  // Efficiency Bar Update
  const effBar = document.getElementById("efficiencyBar");
  effBar.style.width = res.efficiency + "%";
  effBar.innerText = res.efficiency + "%";
  
  if(res.efficiency > 70) effBar.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";
  else if(res.efficiency > 30) effBar.style.background = "linear-gradient(90deg, #eab308, #ca8a04)";
  else effBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
}