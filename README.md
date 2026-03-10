# Project Setup Guide

A full stack project with an HTML/CSS/JS frontend and a Python ML backend served via Flask.

---

### 1. Install UV (Python package manager) 

If you have not yet installed UV, please do so. If you have, you can skip this step. 

**Mac/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Verify it installed correctly:
```bash
uv --version
```

---

### 2. Install Node.js 

If you have not yet installed Node.js, please do so. If you have, you can skip this step. 

Download and install from: https://nodejs.org (use the **LTS** version)

Verify it installed correctly:
```bash
node --version
npm --version
```

---

## Backend Setup (Flask + ML)

```bash
cd server

# Create virtual environment and install all dependencies
uv sync

# Run the Flask server
uv run app.py
```

Flask will start on **http://localhost:5000**

---

## Frontend Setup (HTML/CSS/JS)

Open a **second terminal** and run:

```bash
cd client

# Install dependencies
npm install

# Start the dev server
npm run dev
```
---

## Staying in Sync

Whenever someone adds new dependencies, you need to sync your local environment to match.

### Backend — someone added a new Python package:
```bash
cd server
git pull           # get the latest pyproject.toml and uv.lock
uv sync            # installs any new dependencies
```

### Frontend — someone added a new NPM package:
```bash
cd client
git pull           # get the latest package.json and package-lock.json
npm install        # installs any new dependencies
```

---

## Adding New Dependencies

### Backend (Python):
```bash
cd server
uv add <package-name>       # e.g. uv add numpy
```
This automatically updates `pyproject.toml` and `uv.lock`. Commit both files.

### Frontend (NPM):

```bash
cd client
npm install # Install npm
npm run dev # Run server
```

---

## Running the Full Stack

You need **two terminals** running simultaneously:

| Terminal | Command | URL |
|---|---|---|
| Terminal 1 (backend) | `cd server && uv run app.py` |
| Terminal 2 (frontend) | `cd client && npm run dev` |

---