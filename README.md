# Project Setup Guide

A full stack project with an HTML/CSS/JS frontend and a Python ML backend served via Flask.
edit

---

## Prerequisites

Before anything, you need to install the following tools globally on your machine.

### 1. Install UV (Python package manager)

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

### 2. Install Node.js (for the frontend)

Download and install from: https://nodejs.org (use the **LTS** version)

Verify it installed correctly:
```bash
node --version
npm --version
```

---

## Cloning the Repo

```bash
git clone https://github.com/KristenGus42/CISC-portal.git
cd your-project
```

---

## Backend Setup (Flask + ML)

```bash
cd backend

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
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available on **http://localhost:3000**

---

## Staying in Sync

Whenever someone adds new dependencies, you need to sync your local environment to match.

### Backend — someone added a new Python package:
```bash
cd backend
git pull           # get the latest pyproject.toml and uv.lock
uv sync            # installs any new dependencies
```

### Frontend — someone added a new NPM package:
```bash
cd frontend
git pull           # get the latest package.json and package-lock.json
npm install        # installs any new dependencies
```

> **Rule of thumb:** Any time you `git pull`, run `uv sync` in `/backend` and `npm install` in `/frontend` to make sure you're fully up to date.

---

## Adding New Dependencies

### Backend (Python):
```bash
cd backend
uv add <package-name>       # e.g. uv add numpy
```
This automatically updates `pyproject.toml` and `uv.lock`. Commit both files.

### Frontend (NPM):
```bash
cd frontend
npm install <package-name>  # e.g. npm install axios
```
This automatically updates `package.json` and `package-lock.json`. Commit both files.

---

## Running the Full Stack

You need **two terminals** running simultaneously:

| Terminal | Command | URL |
|---|---|---|
| Terminal 1 (backend) | `cd backend && uv run app.py` | http://localhost:5000 |
| Terminal 2 (frontend) | `cd frontend && npm run dev` | http://localhost:3000 |

---

## What NOT to Commit

These are already listed in `.gitignore` — never commit them:

```
backend/.venv/        # UV recreates this via uv sync
frontend/node_modules/ # NPM recreates this via npm install
.env                  # secret keys and environment variables
```

Always commit:
```
backend/pyproject.toml
backend/uv.lock
frontend/package.json
frontend/package-lock.json
```