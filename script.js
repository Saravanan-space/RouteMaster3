// ═══════════════════════════════════════════
//   ROUTEMASTER — FULL SCRIPT
// ═══════════════════════════════════════════

// ─── CONSTANTS ───
const ROBOT_SPEED = 1.5;
const CELL_DISTANCE = 1;
const TILE_3D = 2;

// ─── STATE ───
let robotCell = null;
let targetCell = null;
let currentPathInterval = null;
let draggedItem = null;
let currentViewMode = "2d";
let lastComputedResult = null;
let currentPath = [];
let currentRobotStep = 0;
let routeStatusTimeout = null;

// ─── THREE.JS STATE ───
let scene3d, camera3d, renderer3d;
let sceneStreet, cameraStreet, rendererStreet;
let streetAnimId = null;

// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("csvInput").addEventListener("change", handleCSVUpload);

  document.getElementById("algoToggle").addEventListener("change", (e) => {
    document.getElementById("algoLabel").innerText = e.target.checked ? "Algorithm: A*" : "Algorithm: BFS";
  });

  try {
    const data = JSON.parse(document.getElementById("jsonInput").value);
    drawGrid(data.grid, data.start);
  } catch (e) {
    console.error("Initial parse error", e);
  }
});

// ═══════════════════════════════════════════
//   VIEW MODE SWITCHING
// ═══════════════════════════════════════════

function setViewMode(mode) {
  currentViewMode = mode;
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  document.getElementById("view-2d").style.display = mode === "2d" ? "block" : "none";
  document.getElementById("view-3d").style.display = mode === "3d" ? "block" : "none";
  document.getElementById("view-street").style.display = mode === "street" ? "block" : "none";

  if (mode === "3d") {
    const data = getState();
    if (data) init3DView(data);
  } else if (mode === "street") {
    const data = getState();
    if (data) initStreetView(data);
  }

  if (mode !== "street" && streetAnimId) {
    cancelAnimationFrame(streetAnimId);
    streetAnimId = null;
  }
}

// ═══════════════════════════════════════════
//   CORE HELPERS
// ═══════════════════════════════════════════

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
      if (row.some(isNaN)) continue;
      grid.push(row);
    }
    // Ensure start cell is clear
    if (grid.length > 0 && grid[0].length > 0) {
      grid[0][0] = 0;
    }
    updateState(grid, start);
    drawGrid(grid, start);
    document.getElementById("csvInput").value = "";
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════
//   GRID GENERATION (FIXED)
// ═══════════════════════════════════════════

function generateWarehouse() {
  const sizeInput = document.getElementById("genSize");
  const obsInput = document.getElementById("genObstacles");

  const size = Math.max(3, Math.min(100, parseInt(sizeInput.value) || 15));
  const maxObs = size * size - 2; // Reserve start + target
  const obstacleCount = Math.max(0, Math.min(maxObs, parseInt(obsInput.value) || 15));

  // Create empty grid
  let grid = Array(size).fill(0).map(() => Array(size).fill(0));

  // Start is ALWAYS (0, 0)
  const start = [0, 0];

  // Place target randomly (never at start)
  let tx, ty;
  do {
    tx = Math.floor(Math.random() * size);
    ty = Math.floor(Math.random() * size);
  } while (tx === 0 && ty === 0);
  grid[tx][ty] = 2;

  // Place obstacles randomly (never on start or target)
  let placed = 0;
  let attempts = 0;
  while (placed < obstacleCount && attempts < obstacleCount * 10) {
    const rx = Math.floor(Math.random() * size);
    const ry = Math.floor(Math.random() * size);
    attempts++;
    // Skip start cell and target cell
    if (rx === 0 && ry === 0) continue;
    if (rx === tx && ry === ty) continue;
    if (grid[rx][ry] !== 0) continue;
    grid[rx][ry] = 1;
    placed++;
  }

  updateState(grid, start);
  drawGrid(grid, start);
}

// ═══════════════════════════════════════════
//   ROUTE COMPUTATION
// ═══════════════════════════════════════════

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

  lastComputedResult = result;
  currentPath = result.path || [];

  updateStats(result);

  document.getElementById("output").textContent = JSON.stringify({
    algo: isAStar ? "A*" : "BFS",
    ...result
  }, null, 2);

  if (result.target_reached) {
    moveRobot(result.path);
  }

  // Capture grid image asynchronously then save to history
  captureGridImage().then(imgBase64 => {
    saveToHistory({
      timestamp: new Date().toISOString(),
      gridSize: `${grid.length}x${grid[0].length}`,
      algorithm: isAStar ? "A*" : "BFS",
      steps: result.total_steps,
      distance: result.total_steps * CELL_DISTANCE,
      executionTime: result.execution_time_ms,
      gridConfig: data,
      gridImage: imgBase64
    });
  });

  // Update 3D if active
  if (currentViewMode === "3d") init3DView(data);
  if (currentViewMode === "street") initStreetView(data);
}

function findTarget(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j] === 2) return [i, j];
    }
  }
  return null;
}

// ═══════════════════════════════════════════
//   AI SCAN
// ═══════════════════════════════════════════

function runScan() {
  const data = getState();
  if (!data) return;

  const grid = data.grid;
  const target = findTarget(grid);

  if (!target) {
    alert("No target available! Place a target first.");
    return;
  }

  drawGrid(grid, data.start);

  const scanStatus = document.getElementById("scanStatus");
  const scanBtn = document.getElementById("scanBtn");
  scanStatus.style.display = "block";
  scanStatus.textContent = "Scanning shelves...";
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning...";
  scanBtn.style.background = "#475569";

  const rows = grid.length;
  const cols = grid[0].length;
  let r = 0, c = 0;

  const scanInterval = setInterval(() => {
    if (r >= rows) {
      clearInterval(scanInterval);
      scanStatus.textContent = "Scan complete. Nothing found.";
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan Warehouse";
      scanBtn.style.background = "linear-gradient(90deg, #8b5cf6, #3b82f6)";
      return;
    }

    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) cell.classList.add("scanning");

    if (grid[r][c] === 2) {
      clearInterval(scanInterval);
      scanStatus.textContent = `Item detected at (${r}, ${c}) — optimizing route.`;
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan Warehouse";
      scanBtn.style.background = "linear-gradient(90deg, #8b5cf6, #3b82f6)";
      setTimeout(() => { runRoute(); }, 800);
      return;
    }

    c++;
    if (c >= cols) { c = 0; r++; }
  }, 35);
}

// ═══════════════════════════════════════════
//   ALGORITHMS
// ═══════════════════════════════════════════

function routeMaster(grid, start, target, isAStar) {
  const startTime = performance.now();
  let searchResult = isAStar ? aStarMode(grid, start, target) : bfsMode(grid, start, target);
  const endTime = performance.now();

  let exec = Math.round(endTime - startTime);
  if (exec === 0) exec = 1;

  const pathLength = searchResult.path ? searchResult.path.length - 1 : 0;
  const efficiency = searchResult.visitedNodes > 0
    ? Math.round(((pathLength || 1) / searchResult.visitedNodes) * 100) : 0;

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
      const nx = x + dx, ny = y + dy;
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
      if ((fScore[openSet[i].toString()] || Infinity) < (fScore[openSet[currentIdx].toString()] || Infinity)) {
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
      const nx = current[0] + dx, ny = current[1] + dy;
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

// ═══════════════════════════════════════════
//   2D GRID DRAW (performance-optimized)
// ═══════════════════════════════════════════

function drawGrid(grid, start) {
  const gridDiv = document.getElementById("grid");
  gridDiv.innerHTML = "";

  robotCell = null;
  targetCell = null;
  if (currentPathInterval) clearInterval(currentPathInterval);

  const rows = grid.length;
  const cols = grid[0].length || 1;

  // Dynamic tile sizing for up to 100x100
  let tileSize = Math.floor(900 / cols);
  if (tileSize > 40) tileSize = 40;
  if (tileSize < 8) tileSize = 8;

  // Reduce gap for large grids
  const gap = cols > 30 ? 1 : (cols > 15 ? 2 : 3);
  gridDiv.style.gap = gap + "px";
  gridDiv.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;

  // Use DocumentFragment for performance
  const frag = document.createDocumentFragment();

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

      // Only add pseudo-element details for small grids
      if (cols <= 50) {
        cell.addEventListener("mousedown", createCellClickHandler(i, j, cell));
        cell.addEventListener("dragstart", createDragStartHandler(cell));
        cell.addEventListener("dragover", (e) => e.preventDefault());
        cell.addEventListener("dragenter", () => {
          if (!cell.classList.contains("obstacle")) cell.classList.add("drag-over");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
        cell.addEventListener("drop", createDropHandler(cell));
      }

      frag.appendChild(cell);
    }
  }

  gridDiv.appendChild(frag);
}

// Event handler factories (avoid closure leaks)
function createCellClickHandler(i, j, cell) {
  return () => {
    // Loophole fix: prevent obstacles on start or target
    if (cell.classList.contains("robot") || cell.classList.contains("target")) return;
    if (cell.classList.contains("start")) return;

    let data = getState();
    if (!data) return;

    // Also block if this is the start or target position in data
    if (i === data.start[0] && j === data.start[1]) return;
    const target = findTarget(data.grid);
    if (target && i === target[0] && j === target[1]) return;

    if (data.grid[i][j] === 1) {
      // Removing an obstacle
      data.grid[i][j] = 0;
      cell.classList.remove("obstacle");
      updateState(data.grid, data.start);
    } else {
      // Adding an obstacle
      data.grid[i][j] = 1;
      cell.classList.add("obstacle");
      updateState(data.grid, data.start);

      // Check if this obstacle is on the current route path
      if (currentPath.length > 0) {
        const isOnPath = currentPath.some(p => p[0] === i && p[1] === j);
        if (isOnPath) {
          cell.classList.add("blocked-alert");
          triggerRecalculation();
        }
      }
    }
  };
}

function createDragStartHandler(cell) {
  return (e) => {
    if (cell.classList.contains("robot")) draggedItem = "start";
    else if (cell.classList.contains("target")) draggedItem = "target";
    else e.preventDefault();
  };
}

function createDropHandler(cell) {
  return (e) => {
    e.preventDefault();
    cell.classList.remove("drag-over");
    if (cell.classList.contains("obstacle")) return;

    let data = getState();
    if (!data) return;

    const newR = parseInt(cell.dataset.r);
    const newC = parseInt(cell.dataset.c);

    if (draggedItem === "start") {
      data.start = [newR, newC];
      if (data.grid[newR][newC] === 2) data.grid[newR][newC] = 0;
      updateState(data.grid, data.start);
      drawGrid(data.grid, data.start);
    } else if (draggedItem === "target") {
      for (let r = 0; r < data.grid.length; r++)
        for (let c = 0; c < data.grid[0].length; c++)
          if (data.grid[r][c] === 2) data.grid[r][c] = 0;
      data.grid[newR][newC] = 2;
      if (data.start[0] === newR && data.start[1] === newC) data.start = [0, 0];
      updateState(data.grid, data.start);
      drawGrid(data.grid, data.start);
    }
    draggedItem = null;
  };
}

// ─── 2D ROBOT ANIMATION ───
function moveRobot(path) {
  let step = 0;
  currentRobotStep = 0;
  if (currentPathInterval) clearInterval(currentPathInterval);

  currentPathInterval = setInterval(() => {
    if (step >= path.length) {
      if (targetCell) targetCell.classList.add("picked");
      clearInterval(currentPathInterval);
      currentPathInterval = null;
      currentPath = [];
      return;
    }
    if (robotCell) robotCell.classList.remove("robot", "start");

    const [x, y] = path[step];
    const next = document.getElementById(`cell-${x}-${y}`);
    if (next) {
      next.classList.add("robot", "path");
      if (step === 0) next.classList.add("start");
      robotCell = next;
    }
    step++;
    currentRobotStep = step;
  }, 100);
}

// ─── ROUTE STATUS BANNER ───
function showRouteStatus(message, isSuccess) {
  const banner = document.getElementById("routeStatus");
  const textEl = document.getElementById("routeStatusText");
  if (!banner || !textEl) return;

  if (routeStatusTimeout) {
    clearTimeout(routeStatusTimeout);
    routeStatusTimeout = null;
  }

  textEl.textContent = message;
  banner.style.display = "flex";
  banner.classList.remove("success");

  // Re-trigger fade-in animation
  banner.style.animation = "none";
  void banner.offsetHeight; // reflow
  banner.style.animation = "";

  if (isSuccess) {
    banner.classList.add("success");
    routeStatusTimeout = setTimeout(() => {
      banner.style.display = "none";
    }, 3000);
  }
}

// ─── DYNAMIC ROUTE RECALCULATION ───
function triggerRecalculation() {
  // 1. Stop current robot animation
  if (currentPathInterval) {
    clearInterval(currentPathInterval);
    currentPathInterval = null;
  }

  // 2. Show redirecting status
  showRouteStatus("⚠️ Redirecting... optimizing new route", false);

  // 3. Get current state
  const data = getState();
  if (!data) return;

  const grid = data.grid;
  const target = findTarget(grid);
  if (!target) {
    showRouteStatus("❌ No target found. Cannot recalculate.", true);
    currentPath = [];
    return;
  }

  // 4. Determine robot's current position
  let robotPos = data.start;
  if (robotCell) {
    const r = parseInt(robotCell.dataset.r);
    const c = parseInt(robotCell.dataset.c);
    if (!isNaN(r) && !isNaN(c)) {
      robotPos = [r, c];
    }
  }

  // 5. Clear old path highlighting (keep robot and target intact)
  document.querySelectorAll(".cell.path").forEach(cell => {
    if (!cell.classList.contains("robot") && !cell.classList.contains("target")) {
      cell.classList.remove("path");
    }
  });

  // 6. Recompute route from robot's current position
  const isAStar = document.getElementById("algoToggle").checked;

  // Small delay so the user sees the "Redirecting" message
  setTimeout(() => {
    const result = routeMaster(grid, robotPos, target, isAStar);
    lastComputedResult = result;

    if (result.target_reached) {
      currentPath = result.path;
      updateStats(result);

      document.getElementById("output").textContent = JSON.stringify({
        algo: isAStar ? "A*" : "BFS",
        ...result
      }, null, 2);

      // 7. Show success message and resume movement
      showRouteStatus("✅ New optimal route generated.", true);
      moveRobot(result.path);
    } else {
      currentPath = [];
      showRouteStatus("❌ No path available — route fully blocked.", true);
      updateStats(result);

      document.getElementById("output").textContent = JSON.stringify({
        algo: isAStar ? "A*" : "BFS",
        ...result
      }, null, 2);
    }
  }, 400);
}

// ─── STATS ───
function updateStats(res) {
  document.getElementById("steps").innerText = res.total_steps;
  document.getElementById("distance").innerText = (res.total_steps * CELL_DISTANCE) + " m";
  document.getElementById("time").innerText = res.execution_time_ms + " ms";

  const status = document.getElementById("reached");
  status.innerText = res.target_reached ? "📦 Package picked up" : "⚠ Unable to reach target";

  const effBar = document.getElementById("efficiencyBar");
  effBar.style.width = res.efficiency + "%";
  effBar.innerText = res.efficiency + "%";

  if (res.efficiency > 70) effBar.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";
  else if (res.efficiency > 30) effBar.style.background = "linear-gradient(90deg, #eab308, #ca8a04)";
  else effBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
}

// ═══════════════════════════════════════════
//   GRID IMAGE CAPTURE & PNG EXPORT
// ═══════════════════════════════════════════

async function captureGridImage() {
  try {
    const gridEl = document.getElementById("grid");
    const canvas = await html2canvas(gridEl, {
      backgroundColor: "#0f172a",
      scale: 2,
      logging: false
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Grid capture failed:", err);
    return null;
  }
}

async function exportGridAsPNG() {
  const imgData = await captureGridImage();
  if (!imgData) {
    alert("Failed to capture grid image.");
    return;
  }
  const timestamp = Date.now();
  const a = document.createElement("a");
  a.href = imgData;
  a.download = `warehouse_grid_${timestamp}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ═══════════════════════════════════════════
//   WORD EXPORT WITH GRID IMAGE
// ═══════════════════════════════════════════

async function saveGridAsWord() {
  const imgData = await captureGridImage();

  let imageHTML = "";
  if (imgData) {
    imageHTML = `<img src="${imgData}" style="max-width:100%; border:2px solid #1e293b; border-radius:8px;" />`;
  } else {
    imageHTML = "<p><em>[Grid image capture failed]</em></p>";
  }

  const state = document.getElementById("jsonInput").value;

  const docContent = `
    <html>
    <head><meta charset="utf-8"><title>RouteMaster Grid Export</title></head>
    <body style="font-family: Arial, sans-serif; padding: 30px; background: #fff; color: #111;">
      <h1 style="color: #0ea5e9;">RouteMaster — Warehouse Grid Snapshot</h1>
      <hr/>
      <h2>Grid Visualization</h2>
      ${imageHTML}
      <br/><br/>
      <h2>JSON Configuration</h2>
      <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px; overflow: auto;">${state}</pre>
      <br/>
      <p style="color: #999; font-size: 11px;">Exported from RouteMaster on ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `;

  const blob = new Blob([docContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "RouteMaster_Grid_Export.doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════
//   ROUTE HISTORY (localStorage)
// ═══════════════════════════════════════════

const HISTORY_KEY = "routemaster_history";

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const history = getHistory();
  history.unshift(entry); // newest first
  // Keep max 50 entries
  if (history.length > 50) history.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function deleteHistoryItem(index) {
  const history = getHistory();
  history.splice(index, 1);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function loadHistoryItem(index) {
  const history = getHistory();
  const item = history[index];
  if (!item || !item.gridConfig) return;

  updateState(item.gridConfig.grid, item.gridConfig.start);
  drawGrid(item.gridConfig.grid, item.gridConfig.start);
  closeHistory();
}

function clearHistory() {
  if (!confirm("Clear all route history?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function openHistory() {
  document.getElementById("historyModal").style.display = "flex";
  renderHistory();
}

function closeHistory() {
  document.getElementById("historyModal").style.display = "none";
}

function closeHistoryOutside(event) {
  if (event.target === document.getElementById("historyModal")) {
    closeHistory();
  }
}

// ═══════════════════════════════════════════
//   INFO / HELP MODAL
// ═══════════════════════════════════════════

function openInfo() {
  document.getElementById("infoModal").style.display = "flex";
}

function closeInfo() {
  document.getElementById("infoModal").style.display = "none";
}

function downloadHistoryImage(index) {
  const history = getHistory();
  const item = history[index];
  if (!item || !item.gridImage) {
    alert("No grid image available for this entry.");
    return;
  }
  const a = document.createElement("a");
  a.href = item.gridImage;
  a.download = `warehouse_grid_${new Date(item.timestamp).getTime()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const history = getHistory();

  if (history.length === 0) {
    list.innerHTML = `<div class="history-empty">No route history yet.<br/>Compute a route to start logging!</div>`;
    return;
  }

  list.innerHTML = history.map((item, idx) => {
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    const hasImage = !!item.gridImage;

    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="timestamp">${dateStr}</span>
        </div>
        ${hasImage ? `<div style="margin-bottom:8px;"><img src="${item.gridImage}" style="max-width:100%;max-height:120px;border-radius:6px;border:1px solid #334155;" /></div>` : ''}
        <div class="history-item-details">
          <span>📐 ${item.gridSize}</span>
          <span>🧮 ${item.algorithm}</span>
          <span>👣 ${item.steps} steps</span>
          <span>📏 ${item.distance} m</span>
          <span>⏱️ ${item.executionTime} ms</span>
        </div>
        <div class="history-item-actions">
          <button onclick="loadHistoryItem(${idx})" style="background: linear-gradient(90deg, #06b6d4, #3b82f6);">📂 Load Grid</button>
          ${hasImage ? `<button onclick="downloadHistoryImage(${idx})" style="background: linear-gradient(90deg, #f59e0b, #ef4444);">📸 Download Image</button>` : ''}
          <button onclick="deleteHistoryItem(${idx})" style="background: #ef4444;">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join("");
}


// ═══════════════════════════════════════════
//   THREE.JS — 3D WAREHOUSE (Orbit)
// ═══════════════════════════════════════════

function init3DView(data) {
  const container = document.getElementById("canvas3d-container");
  if (renderer3d) { renderer3d.dispose(); container.innerHTML = ""; }

  const W = container.clientWidth;
  const H = container.clientHeight;
  const grid = data.grid;
  const start = data.start;
  const rows = grid.length;
  const cols = grid[0].length;

  scene3d = new THREE.Scene();
  scene3d.background = new THREE.Color(0x020617);
  scene3d.fog = new THREE.FogExp2(0x020617, 0.015);

  camera3d = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
  camera3d.position.set(cols * TILE_3D * 0.5, Math.max(rows, cols) * TILE_3D * 0.8, rows * TILE_3D * 1.2);
  camera3d.lookAt(cols * TILE_3D * 0.5, 0, rows * TILE_3D * 0.5);

  renderer3d = new THREE.WebGLRenderer({ antialias: true });
  renderer3d.setSize(W, H);
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3d.shadowMap.enabled = true;
  container.appendChild(renderer3d.domElement);

  scene3d.add(new THREE.AmbientLight(0x334155, 0.6));
  const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
  dirLight.position.set(cols * TILE_3D, 30, rows * TILE_3D * 0.5);
  dirLight.castShadow = true;
  scene3d.add(dirLight);

  const floorGeo = new THREE.PlaneGeometry(cols * TILE_3D + 4, rows * TILE_3D + 4);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cols * TILE_3D * 0.5, -0.01, rows * TILE_3D * 0.5);
  floor.receiveShadow = true;
  scene3d.add(floor);

  const gridHelper = new THREE.GridHelper(Math.max(cols, rows) * TILE_3D + 4, Math.max(cols, rows) + 2, 0x1e293b, 0x1e293b);
  gridHelper.position.set(cols * TILE_3D * 0.5, 0.02, rows * TILE_3D * 0.5);
  scene3d.add(gridHelper);

  const pathSet = new Set();
  if (lastComputedResult && lastComputedResult.path) lastComputedResult.path.forEach(p => pathSet.add(p.toString()));

  // Reusable geometries for performance
  const shelfGeo = new THREE.BoxGeometry(TILE_3D * 0.85, 2.5, TILE_3D * 0.85);
  const crateGeo = new THREE.BoxGeometry(TILE_3D * 0.6, TILE_3D * 0.6, TILE_3D * 0.6);
  const botGeo = new THREE.BoxGeometry(TILE_3D * 0.5, TILE_3D * 0.5, TILE_3D * 0.5);
  const pathGeo = new THREE.BoxGeometry(TILE_3D * 0.5, 0.08, TILE_3D * 0.5);
  const tileGeo = new THREE.BoxGeometry(TILE_3D * 0.95, 0.05, TILE_3D * 0.95);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * TILE_3D + TILE_3D * 0.5;
      const wz = r * TILE_3D + TILE_3D * 0.5;
      const cellVal = grid[r][c];
      const isStart = r === start[0] && c === start[1];
      const isPath = pathSet.has([r, c].toString());

      if (cellVal === 1) {
        const shelf = new THREE.Mesh(shelfGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.2 }));
        shelf.position.set(wx, 1.25, wz);
        shelf.castShadow = true;
        scene3d.add(shelf);
      } else if (cellVal === 2) {
        const crate = new THREE.Mesh(crateGeo, new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 }));
        crate.position.set(wx, TILE_3D * 0.3, wz);
        crate.castShadow = true;
        crate.userData.isCrate = true;
        scene3d.add(crate);
      } else if (isStart) {
        const bot = new THREE.Mesh(botGeo, new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x2563eb, emissiveIntensity: 0.5 }));
        bot.position.set(wx, TILE_3D * 0.25, wz);
        scene3d.add(bot);
      }

      if (isPath && cellVal !== 1) {
        const pm = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }));
        pm.position.set(wx, 0.05, wz);
        scene3d.add(pm);
      }

      if (cellVal !== 1) {
        const tc = isPath ? 0x0f2e1a : (isStart ? 0x172554 : 0x1e293b);
        const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: tc, roughness: 0.8 }));
        tile.position.set(wx, 0.025, wz);
        tile.receiveShadow = true;
        scene3d.add(tile);
      }
    }
  }

  // Manual orbit
  let isDragging = false, prevMouse = { x: 0, y: 0 };
  const spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: Math.max(rows, cols) * TILE_3D * 1.0 };
  const target3d = new THREE.Vector3(cols * TILE_3D * 0.5, 0, rows * TILE_3D * 0.5);

  function updateCam() {
    camera3d.position.set(
      target3d.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      target3d.y + spherical.radius * Math.cos(spherical.phi),
      target3d.z + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
    );
    camera3d.lookAt(target3d);
  }

  renderer3d.domElement.addEventListener("mousedown", (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  renderer3d.domElement.addEventListener("mouseup", () => isDragging = false);
  renderer3d.domElement.addEventListener("mouseleave", () => isDragging = false);
  renderer3d.domElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    spherical.theta -= (e.clientX - prevMouse.x) * 0.005;
    spherical.phi = Math.max(0.2, Math.min(Math.PI * 0.45, spherical.phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
    updateCam();
  });
  renderer3d.domElement.addEventListener("wheel", (e) => {
    spherical.radius = Math.max(5, Math.min(200, spherical.radius + e.deltaY * 0.05));
    updateCam();
  });

  updateCam();

  let t3d = 0;
  function anim3D() {
    if (currentViewMode !== "3d") return;
    requestAnimationFrame(anim3D);
    t3d += 0.02;
    scene3d.traverse(o => {
      if (o.userData.isCrate) { o.rotation.y += 0.01; o.position.y = TILE_3D * 0.3 + Math.sin(t3d * 2) * 0.1; }
    });
    renderer3d.render(scene3d, camera3d);
  }
  anim3D();
}


// ═══════════════════════════════════════════
//   THREE.JS — STREET VIEW (First-Person)
// ═══════════════════════════════════════════

function initStreetView(data) {
  const container = document.getElementById("street-container");
  if (streetAnimId) { cancelAnimationFrame(streetAnimId); streetAnimId = null; }

  const hud = document.getElementById("street-hud");
  container.innerHTML = "";
  container.appendChild(hud);

  if (!lastComputedResult || !lastComputedResult.path || lastComputedResult.path.length < 2) {
    hud.querySelector("#street-step").textContent = "No route! Compute one first.";
    hud.querySelector("#street-progress").textContent = "";
    return;
  }

  const W = container.clientWidth;
  const H = container.clientHeight;
  const grid = data.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const path = lastComputedResult.path;

  sceneStreet = new THREE.Scene();
  sceneStreet.background = new THREE.Color(0x020617);
  sceneStreet.fog = new THREE.FogExp2(0x020617, 0.04);

  cameraStreet = new THREE.PerspectiveCamera(70, W / H, 0.1, 300);

  rendererStreet = new THREE.WebGLRenderer({ antialias: true });
  rendererStreet.setSize(W, H);
  rendererStreet.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendererStreet.shadowMap.enabled = true;
  container.appendChild(rendererStreet.domElement);

  sceneStreet.add(new THREE.AmbientLight(0x94a3b8, 0.3));

  const headLight = new THREE.PointLight(0x38bdf8, 1.2, 20);
  headLight.position.set(0, 1.6, 0);
  cameraStreet.add(headLight);
  sceneStreet.add(cameraStreet);

  // Ceiling lights
  for (let r = 0; r < rows; r += 4) {
    for (let c = 0; c < cols; c += 4) {
      const l = new THREE.PointLight(0x64748b, 0.3, 12);
      l.position.set(c * TILE_3D + TILE_3D * 0.5, 4, r * TILE_3D + TILE_3D * 0.5);
      sceneStreet.add(l);
    }
  }

  // Floor + Ceiling
  const floorGeo = new THREE.PlaneGeometry(cols * TILE_3D + 6, rows * TILE_3D + 6);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cols * TILE_3D * 0.5, 0, rows * TILE_3D * 0.5);
  floor.receiveShadow = true;
  sceneStreet.add(floor);

  const ceil = new THREE.Mesh(floorGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x020617, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cols * TILE_3D * 0.5, 5, rows * TILE_3D * 0.5);
  sceneStreet.add(ceil);

  const pathSet = new Set(path.map(p => p.toString()));

  const shelfGeo = new THREE.BoxGeometry(TILE_3D * 0.9, 3.5, TILE_3D * 0.9);
  const crateGeo = new THREE.BoxGeometry(TILE_3D * 0.5, TILE_3D * 0.5, TILE_3D * 0.5);
  const glowGeo = new THREE.BoxGeometry(TILE_3D * 0.4, 0.06, TILE_3D * 0.4);
  const tileGeo = new THREE.BoxGeometry(TILE_3D * 0.95, 0.04, TILE_3D * 0.95);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * TILE_3D + TILE_3D * 0.5;
      const wz = r * TILE_3D + TILE_3D * 0.5;
      const cellVal = grid[r][c];
      const isPath = pathSet.has([r, c].toString());

      if (cellVal === 1) {
        const shelf = new THREE.Mesh(shelfGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 }));
        shelf.position.set(wx, 1.75, wz);
        shelf.castShadow = true;
        sceneStreet.add(shelf);
      } else if (cellVal === 2) {
        const crate = new THREE.Mesh(crateGeo, new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xfbbf24, emissiveIntensity: 0.6 }));
        crate.position.set(wx, TILE_3D * 0.25, wz);
        crate.userData.isCrate = true;
        sceneStreet.add(crate);

        const beacon = new THREE.PointLight(0xfbbf24, 1.5, 10);
        beacon.position.set(wx, 2, wz);
        sceneStreet.add(beacon);
      }

      if (isPath && cellVal !== 1) {
        const gm = new THREE.Mesh(glowGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
        gm.position.set(wx, 0.04, wz);
        sceneStreet.add(gm);
      }

      if (cellVal !== 1) {
        const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: isPath ? 0x0a1f10 : 0x1e293b, roughness: 0.85 }));
        tile.position.set(wx, 0.02, wz);
        tile.receiveShadow = true;
        sceneStreet.add(tile);
      }
    }
  }

  // Camera path
  const worldPath = path.map(([r, c]) => new THREE.Vector3(c * TILE_3D + TILE_3D * 0.5, 1.6, r * TILE_3D + TILE_3D * 0.5));

  let pathProgress = 0;
  const moveSpeed = 0.012;
  let tStreet = 0;

  function animStreet() {
    streetAnimId = requestAnimationFrame(animStreet);
    tStreet += 0.02;

    if (pathProgress < worldPath.length - 1) {
      pathProgress += moveSpeed;
      if (pathProgress > worldPath.length - 1) pathProgress = worldPath.length - 1;

      const idx = Math.floor(pathProgress);
      const t = pathProgress - idx;
      const from = worldPath[idx];
      const to = worldPath[Math.min(idx + 1, worldPath.length - 1)];

      cameraStreet.position.lerpVectors(from, to, t);

      const lookIdx = Math.min(idx + 2, worldPath.length - 1);
      const lookTarget = worldPath[lookIdx].clone();
      lookTarget.y = 1.4;
      cameraStreet.lookAt(lookTarget);

      document.getElementById("street-step").textContent = `Step: ${Math.floor(pathProgress)} / ${worldPath.length - 1}`;
      document.getElementById("street-progress").textContent = `Progress: ${Math.round((pathProgress / (worldPath.length - 1)) * 100)}%`;
    }

    sceneStreet.traverse(o => {
      if (o.userData.isCrate) { o.rotation.y += 0.015; o.position.y = TILE_3D * 0.25 + Math.sin(tStreet * 3) * 0.08; }
    });

    rendererStreet.render(sceneStreet, cameraStreet);
  }

  animStreet();
}