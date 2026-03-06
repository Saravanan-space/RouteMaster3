# 📦 RouteMaster Order Picker

**RouteMaster** is an intelligent warehouse logistics application designed to solve the **“Walking Bottleneck”** problem in modern e-commerce fulfillment centers.

In large warehouses, workers often spend a significant amount of time walking inefficient paths while collecting items. RouteMaster optimizes this process by calculating the **shortest and most efficient route** for pickers in a **grid-based warehouse environment**, while safely avoiding obstacles such as shelves.

---

# 🚀 Live Deployment

You can access the deployed application here:

👉 https://routemaster-order-picker.vercel.app

---

# 📂 Repository Structure

The project follows a **clean and standard React project structure** to ensure easy evaluation and maintainability.

```
RouteMaster1/

├── public/
│   └── index.html         # Root HTML file

├── src/
│   ├── App.jsx            # Core application logic & algorithm
│   ├── main.jsx           # React entry point
│   └── index.css          # Tailwind CSS imports

├── package.json           # Project dependencies
├── README.md              # Project documentation
└── .gitignore             # Files excluded from Git
```

---

# 🧠 Core Algorithm

RouteMaster uses the **Breadth-First Search (BFS)** algorithm to compute the **shortest path from the starting point to the target location**.

### Why BFS?

Breadth-First Search is ideal for grid environments because:

* It guarantees the **shortest path in an unweighted grid**
* It systematically explores neighbors level by level
* It works efficiently for **real-time pathfinding problems**

### Movement Rules

The picker or robot can move only in four directions:

* Up
* Down
* Left
* Right

Diagonal movement is **not allowed** to maintain realistic warehouse movement constraints.

### Obstacle Handling

Cells with value `1` represent **obstacles or shelves**.

The BFS algorithm automatically avoids these cells while calculating the path.

---

# 🛠 Tech Stack

| Technology   | Purpose                                 |
| ------------ | --------------------------------------- |
| React.js     | Frontend framework and state management |
| Tailwind CSS | Responsive styling and layout           |
| Lucide React | High-quality vector icons               |
| Vercel       | Deployment and hosting                  |

---

# 📊 Mandatory JSON Interface

The application follows a **strict JSON input/output format** for evaluation.

---

## Input Schema

```
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

| Field  | Description                     |
| ------ | ------------------------------- |
| grid   | Warehouse layout matrix         |
| 0      | Walkable path                   |
| 1      | Obstacle or shelf               |
| start  | Starting coordinate             |
| target | Location of the item to collect |

---

## Output Schema

```
{
  "total_steps": 3,
  "path": [[0,0],[0,1],[1,1],[1,2]]
}
```

### Field Description

| Field       | Description                                       |
| ----------- | ------------------------------------------------- |
| total_steps | Total steps required to reach the target          |
| path        | List of coordinates followed from start to target |

---

# ⚙️ Installation & Setup

Follow these steps to run the project locally.

---

## 1️⃣ Clone the Repository

```
git clone https://github.com/Saravanan-space/RouteMaster1.git
```

---

## 2️⃣ Navigate to the Project Folder

```
cd RouteMaster1
```

---

## 3️⃣ Install Dependencies

```
npm install
```

---

## 4️⃣ Start the Development Server

```
npm start
```

The application will run at:

```
http://localhost:3000
```

---

# 🎯 Evaluation Checklist

The project satisfies the following evaluation criteria.

✅ **Algorithm Accuracy**
Shortest path computation using BFS with obstacle avoidance.

✅ **Schema Compliance**
Strict JSON input/output formatting.

✅ **UI Visualization**
Interactive grid visualization with highlighted route.

✅ **Code Quality**
Clean React architecture and modular implementation.

✅ **Explainability**
Algorithm logic documented clearly in README and code.

---

# 🤝 Credits

**Developer**
Saravanan TM

**Institution**
KSIT College — AIML Branch

---

# 📌 Project Goal

The goal of RouteMaster is to demonstrate how **algorithmic pathfinding can optimize warehouse logistics**, reducing unnecessary walking distance and improving efficiency in fulfillment operations.
