# 📦 RouteMaster Order Picker

RouteMaster is an intelligent warehouse logistics application designed to solve the **“Walking Bottleneck”** problem in modern e-commerce fulfillment centers.

Warehouse workers often spend a large portion of their time **walking inefficient routes while collecting items**. RouteMaster solves this problem by computing the **most efficient path between a start position and a target location** inside a **grid-based warehouse** while avoiding obstacles such as shelves.

The system also provides **advanced visualization modes and algorithm switching** to help users understand and compare different pathfinding strategies.

---

# 🚀 Live Deployment

Access the live application here:

👉 https://route-master3.vercel.app/

---

# ✨ Key Features

### 🧠 Intelligent Pathfinding

* Computes the **optimal route** inside a warehouse grid
* Automatically **avoids obstacles and shelves**
* Efficient shortest path computation

### 🔁 Algorithm Switching

Users can dynamically switch between two pathfinding algorithms:

* **Breadth-First Search (BFS)**
* **A* Search Algorithm**

This allows comparison between:

* **Guaranteed shortest-path search (BFS)**
* **Heuristic-guided optimized search (A*)**

---

### 🗺 Interactive Grid Visualization

* Real-time warehouse grid rendering
* Highlighted **start and target positions**
* Clear **step-by-step path visualization**

---

### 🧊 3D Warehouse Visualizer

RouteMaster includes a **3D visualization mode** that converts the warehouse grid into a **three-dimensional environment**.

This helps visualize:

* Shelf placement
* Warehouse layout
* Navigation paths

---

### 🚶 Street View Navigation Mode

A **street-view style navigation mode** allows users to explore the warehouse from a **first-person perspective**, simulating how a picker walks through the aisles.

---

# 📂 Repository Structure

The project is organized as follows:

```
route-master/

├── .vscode/
│   └── launch.json
│
├── route-master/
│   ├── node_modules/
│   │
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── index.css
│   │   └── index.js
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md
│
├── RouteMaster3/
│   ├── index.html
│   └── script.js
```

### Folder Description

**route-master/**
Main React application that contains the warehouse pathfinding system.

**src/**
Contains the main application logic, algorithms, and UI components.

**components/**
Reusable UI components used throughout the application.

**public/**
Static assets and root HTML entry file.

**RouteMaster3/**
Contains additional visualization scripts such as **3D or experimental visual modes**.

---

# 🧠 Core Algorithms

RouteMaster supports **two pathfinding algorithms**.

---

## 1️⃣ Breadth-First Search (BFS)

BFS guarantees the **shortest path in an unweighted grid**.

### Advantages

* Always finds the **true shortest path**
* Reliable and simple
* Perfect for grid-based environments

### Movement Rules

Movement is limited to **four directions**:

* Up
* Down
* Left
* Right

Diagonal movement is **not allowed**.

### Obstacle Handling

Cells with value `1` represent **obstacles or shelves**, which the algorithm automatically avoids.

---

## 2️⃣ A* Search Algorithm

A* is a **heuristic-based pathfinding algorithm** that improves search efficiency by prioritizing promising paths.

### Advantages

* Faster exploration for larger grids
* Guided by heuristics
* Efficient for real-time systems

### Heuristic Used

Manhattan Distance

```
h(n) = |x1 - x2| + |y1 - y2|
```

This estimates the distance from the current node to the target.

---

# 📊 JSON Interface

The system follows a **strict JSON input/output structure**.

---

## Input Schema

```json
{
  "grid": [
    [0, 0, 1],
    [1, 0, 0]
  ],
  "start": [0, 0],
  "target": [1, 2]
}
```

### Field Description

| Field  | Description             |
| ------ | ----------------------- |
| grid   | Warehouse layout matrix |
| 0      | Walkable path           |
| 1      | Obstacle or shelf       |
| start  | Starting coordinate     |
| target | Target item location    |

---

## Output Schema

```json
{
  "total_steps": 3,
  "path": [[0,0],[0,1],[1,1],[1,2]]
}
```

### Field Description

| Field       | Description                              |
| ----------- | ---------------------------------------- |
| total_steps | Number of steps taken                    |
| path        | Coordinates followed to reach the target |

---

# 🛠 Tech Stack

| Technology   | Purpose                |
| ------------ | ---------------------- |
| React.js     | Frontend framework     |
| Tailwind CSS | UI styling             |
| Lucide React | Icon library           |
| Vite         | Development build tool |
| Vercel       | Hosting and deployment |

---

# ⚙️ Installation & Setup

Follow these steps to run the project locally.

---

## 1️⃣ Clone the Repository

```
git clone https://github.com/Saravanan-space/RouteMaster1.git
```

---

## 2️⃣ Navigate to Project Directory

```
cd route-master
```

---

## 3️⃣ Install Dependencies

```
npm install
```

---

## 4️⃣ Start the Development Server

```
npm run dev
```

The application will run at:

```
http://localhost:5173
```

---

# 🎯 Evaluation Checklist

The project satisfies the following evaluation criteria.

✅ **Algorithm Accuracy**
Shortest path computation using BFS and A* with obstacle avoidance.

✅ **Schema Compliance**
Strict JSON input/output formatting.

✅ **Visualization**
Grid visualization, 3D warehouse view, and street-view navigation mode.

✅ **Code Quality**
Clean React architecture and modular implementation.

✅ **Explainability**
Algorithms and design clearly documented.

---

# 🤝 Team Credits

Developed by:

* **T. M. Saravanan**
* **Shreya S**
* **Shrujan Tejas K**
* **Divya**

---

# 📌 Project Objective

RouteMaster demonstrates how **pathfinding algorithms combined with interactive visualization** can optimize warehouse logistics by reducing unnecessary walking distance and improving operational efficiency in modern fulfillment systems.
