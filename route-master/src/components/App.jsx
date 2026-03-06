import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, DownloadIcon, PackageIcon } from './Icons';
import '../index.css';

const ROBOT_SPEED = 1.5;
const CELL_DISTANCE = 1;

const initialConfig = {
    grid: [
        [0, 0, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 0, 2, 0]
    ],
    start: [0, 0]
};

const App = () => {
    const [gridConfig, setGridConfig] = useState(initialConfig);
    const [algo, setAlgo] = useState('BFS'); // 'BFS' or 'A*'

    const [draggedItem, setDraggedItem] = useState(null);

    const [result, setResult] = useState({
        steps: 0,
        distance: 0,
        time: 0,
        status: '—',
        efficiency: 0,
        path: [],
        targetReached: false
    });

    const [robotPos, setRobotPos] = useState(initialConfig.start);
    const [animatingStep, setAnimatingStep] = useState(null);
    const [targetPicked, setTargetPicked] = useState(false);

    const [jsonInputText, setJsonInputText] = useState(JSON.stringify(initialConfig, null, 2));

    const [genConfig, setGenConfig] = useState({ size: 15, obstacles: 15 });

    // Sync json text when gridConfig changes (if not actively editing text)
    useEffect(() => {
        setJsonInputText(JSON.stringify(gridConfig, null, 2));
        setRobotPos(gridConfig.start);
        setAnimatingStep(null);
        setTargetPicked(false);
        setResult({
            steps: 0, distance: 0, time: 0, status: '—', efficiency: 0, path: [], targetReached: false
        });
    }, [gridConfig]);

    const updateState = (newGrid, newStart) => {
        setGridConfig({ grid: newGrid, start: newStart });
    };

    const handleJsonChange = (e) => {
        setJsonInputText(e.target.value);
        try {
            const parsed = JSON.parse(e.target.value);
            if (parsed.grid && parsed.start) {
                setGridConfig(parsed);
            }
        } catch {
            // ignore parse errors while typing
        }
    };

    const downloadJSON = () => {
        const blob = new Blob([jsonInputText], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Warehouse_Config.doc";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.trim().split("\n");
            const newGrid = [];
            const newStart = [0, 0];
            for (let i = 0; i < lines.length; i++) {
                const row = lines[i].split(",").map(val => parseInt(val.trim()));
                if (row.some(isNaN)) continue;
                newGrid.push(row);
            }
            updateState(newGrid, newStart);
            e.target.value = "";
        };
        reader.readAsText(file);
    };

    const generateWarehouse = () => {
        const size = Math.max(5, Math.min(30, Number(genConfig.size) || 15));
        const obstacleCount = Math.max(0, Math.min(size * size - 2, Number(genConfig.obstacles) || 15));

        const newGrid = Array(size).fill(0).map(() => Array(size).fill(0));

        let placedObstacles = 0;
        while (placedObstacles < obstacleCount) {
            const rx = Math.floor(Math.random() * size);
            const ry = Math.floor(Math.random() * size);
            if (newGrid[rx][ry] === 0) {
                newGrid[rx][ry] = 1;
                placedObstacles++;
            }
        }

        const sx = Math.floor(Math.random() * size);
        const sy = Math.floor(Math.random() * size);
        newGrid[sx][sy] = 0; // ensure start isn't an obstacle

        let tx, ty;
        do {
            tx = Math.floor(Math.random() * size);
            ty = Math.floor(Math.random() * size);
        } while ((tx === sx && ty === sy) || newGrid[tx][ty] === 1);

        newGrid[tx][ty] = 2;
        updateState(newGrid, [sx, sy]);
    };

    const findTarget = (grid) => {
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid[i].length; j++) {
                if (grid[i][j] === 2) return [i, j];
            }
        }
        return null;
    };

    const runRoute = () => {
        const { grid, start } = gridConfig;
        const target = findTarget(grid);

        if (!target) {
            alert("No target available! Place a target first.");
            return;
        }

        const startTime = performance.now();
        let searchResult = algo === 'A*' ? aStarMode(grid, start, target) : bfsMode(grid, start, target);
        const endTime = performance.now();

        let exec = Math.round(endTime - startTime);
        if (exec === 0) exec = 1;

        const pathLength = searchResult.path ? searchResult.path.length - 1 : 0;
        const eff = searchResult.visitedNodes > 0
            ? Math.round(((pathLength || 1) / searchResult.visitedNodes) * 100)
            : 0;

        const newResult = {
            steps: pathLength,
            distance: (pathLength * CELL_DISTANCE),
            time: exec,
            status: searchResult.path ? "📦 Package picked up" : "⚠ Unable to reach target",
            efficiency: Math.min(eff, 100),
            path: searchResult.path || [],
            targetReached: !!searchResult.path
        };

        setResult(newResult);
        setAnimatingStep(0);
        setTargetPicked(false);
    };

    useEffect(() => {
        if (animatingStep !== null && result.path.length > 0) {
            if (animatingStep >= result.path.length) {
                if (result.targetReached) setTargetPicked(true);
                return;
            }

            const timer = setTimeout(() => {
                setRobotPos(result.path[animatingStep]);
                setAnimatingStep(s => s + 1);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [animatingStep, result]);

    // Algorithms
    const bfsMode = (grid, start, target) => {
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
    };

    const aStarMode = (grid, start, target) => {
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
    };

    const reconstruct = (parent, start, target) => {
        let path = [target];
        let cur = target.toString();
        while (cur !== start.toString()) {
            const prev = parent[cur];
            if (!prev) return null;
            path.push(prev);
            cur = prev.toString();
        }
        return path.reverse();
    };

    // Drag and drop logic
    const handleCellClick = (r, c) => {
        const { grid, start } = gridConfig;
        if ((r === start[0] && c === start[1]) || grid[r][c] === 2) return;

        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = newGrid[r][c] === 1 ? 0 : 1;
        updateState(newGrid, start);
    };

    const handleDragStart = (e, type) => {
        setDraggedItem(type);
    };

    const handleDrop = (e, r, c) => {
        e.preventDefault();
        if (!draggedItem) return;

        const { grid, start } = gridConfig;
        if (grid[r][c] === 1) {
            setDraggedItem(null);
            return;
        }

        const newGrid = grid.map(row => [...row]);
        let newStart = [...start];

        if (draggedItem === 'start') {
            newStart = [r, c];
            if (newGrid[r][c] === 2) newGrid[r][c] = 0;
        } else if (draggedItem === 'target') {
            for (let i = 0; i < newGrid.length; i++) {
                for (let j = 0; j < newGrid[0].length; j++) {
                    if (newGrid[i][j] === 2) newGrid[i][j] = 0;
                }
            }
            newGrid[r][c] = 2;
            if (newStart[0] === r && newStart[1] === c) {
                newStart = [0, 0];
            }
        }

        updateState(newGrid, newStart);
        setDraggedItem(null);
    };

    // Render variables
    const getEffColor = (eff) => {
        if (eff > 70) return "linear-gradient(90deg, #22c55e, #16a34a)";
        if (eff > 30) return "linear-gradient(90deg, #eab308, #ca8a04)";
        return "linear-gradient(90deg, #ef4444, #dc2626)";
    };

    const renderedGridPath = new Set(
        (animatingStep !== null ? result.path.slice(0, animatingStep + 1) : result.path)
            .map(p => p.toString())
    );

    const { grid, start } = gridConfig;
    const cols = grid[0]?.length || 1;
    const tileSize = Math.max(18, Math.min(40, Math.floor(900 / cols)));

    return (
        <div className="app">
            <header>
                <h1>RouteMaster</h1>
                <p>Autonomous Warehouse Navigation System</p>
            </header>

            <section className="map-panel">
                <div className="panel-header">
                    <div className="panel-title">Warehouse Map</div>
                    <div className="map-controls">
                        <label className="toggle">
                            <input type="checkbox" onChange={(e) => setAlgo(e.target.checked ? 'A*' : 'BFS')} checked={algo === 'A*'} />
                            <span className="slider"></span>
                            <span className="label-text" id="algoLabel">Algorithm: {algo}</span>
                        </label>
                        <div className="btn-group">
                            <input type="file" id="csvInput" accept=".csv" style={{ display: "none" }} onChange={handleCSVUpload} />
                            <button className="small-btn" onClick={() => document.getElementById('csvInput').click()}>
                                <UploadIcon /> Upload CSV
                            </button>
                            <button className="small-btn" onClick={downloadJSON}>
                                <DownloadIcon /> Download JSON
                            </button>
                        </div>
                    </div>
                </div>
                <p className="hint">Drag start (blue) / target (orange) to move them. Click any empty cell to place/remove obstacles.</p>

                <div id="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${tileSize}px)` }}>
                    {grid.map((row, r) => (
                        row.map((cellType, c) => {
                            const isStart = r === start[0] && c === start[1];
                            const isRobotPos = r === robotPos[0] && c === robotPos[1];
                            const isPath = renderedGridPath.has([r, c].toString());

                            let classes = "cell";
                            if (cellType === 1) classes += " obstacle";
                            if (cellType === 2) classes += " target";
                            if (cellType === 2 && targetPicked) classes += " picked";
                            if (isStart && !isRobotPos) classes += " path start"; // Leftover trail for start
                            if (isRobotPos) classes += " robot start";
                            else if (isPath && !isRobotPos) classes += " path";

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={classes}
                                    style={{ width: tileSize, height: tileSize }}
                                    draggable={isStart || cellType === 2}
                                    onDragStart={(e) => handleDragStart(e, isStart ? 'start' : 'target')}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, r, c)}
                                    onMouseDown={() => handleCellClick(r, c)}
                                />
                            );
                        })
                    ))}
                </div>
            </section>

            <section className="bottom-panels">
                <div className="panel input">
                    <div className="panel-title">Warehouse Input</div>
                    <textarea
                        value={jsonInputText}
                        onChange={handleJsonChange}
                    />
                    <div className="action-buttons">
                        <button onClick={runRoute}>Compute Optimal Route</button>
                        <button onClick={generateWarehouse}>Generate Random</button>
                    </div>

                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Grid Size (NxN)</label>
                            <input
                                type="number"
                                min="5" max="30"
                                value={genConfig.size}
                                onChange={(e) => setGenConfig({ ...genConfig, size: e.target.value })}
                                style={{ width: '100%', padding: '8px', background: '#020617', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: '6px' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Obstacles</label>
                            <input
                                type="number"
                                min="0"
                                value={genConfig.obstacles}
                                onChange={(e) => setGenConfig({ ...genConfig, obstacles: e.target.value })}
                                style={{ width: '100%', padding: '8px', background: '#020617', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: '6px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="panel metrics">
                    <div className="panel-title">Execution Metrics</div>
                    <div className="stats">
                        <div>
                            <label>Steps</label>
                            <span>{result.steps}</span>
                        </div>
                        <div>
                            <label>Distance</label>
                            <span>{result.distance} m</span>
                        </div>
                        <div>
                            <label>Exec Time</label>
                            <span>{result.time} ms</span>
                        </div>
                        <div>
                            <label>Status</label>
                            <span style={{ fontSize: '16px' }}>{result.status}</span>
                        </div>
                    </div>

                    <div className="efficiency-container">
                        <label>Search Efficiency (Path Nodes / Explored Nodes)</label>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${result.efficiency}%`,
                                    background: getEffColor(result.efficiency)
                                }}
                            >
                                {result.efficiency}%
                            </div>
                        </div>
                    </div>

                    <pre>
                        {JSON.stringify({
                            algo,
                            total_steps: result.steps,
                            target_reached: result.targetReached,
                            execution_time_ms: result.time,
                            efficiency: result.efficiency
                        }, null, 2)}
                    </pre>
                </div>
            </section>
        </div>
    );
};

export default App;
