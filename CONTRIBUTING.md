# 🤝 Contributing to FPL League Platform

Thank you for your interest in contributing to the **FPL League Platform**! Whether you are a fellow mini-league manager adding new stat calculations, polishing the UI, or optimizing the data pipeline, this guide will help you get started quickly and smoothly.

---

## 📋 Table of Contents
- [Prerequisites & Development Setup](#-prerequisites--development-setup)
- [Git Branching Strategy](#-git-branching-strategy)
- [Local Development Workflow](#-local-development-workflow)
- [Code Quality & Testing](#-code-quality--testing)
- [Submitting a Pull Request](#-submitting-a-pull-request)
- [Project Architecture Overview](#-project-architecture-overview)

---

## 🛠️ Prerequisites & Development Setup

Make sure you have the required tools installed before beginning:

| Tool | Recommended Version | Purpose |
| :--- | :--- | :--- |
| **Git** | Latest | Source control |
| **Docker Desktop** | Latest | Runs local PostgreSQL 16 database container |
| **Python** | `3.11+` | Backend API & Data Pipeline runtime |
| **`uv`** | Latest (`>= 0.5.0`) | Fast Python package & virtual environment manager |
| **Node.js** | `v20+` (LTS) | Next.js Frontend runtime and build tool |
| **Make** | Built-in | CLI task runner & local orchestration |

### Quick Setup Commands:
```bash
# 1. Clone your fork or the repository
git clone https://github.com/varunvohra94/fpl_dashboard.git
cd fpl_dashboard

# 2. Copy environment template
cp .env.example .env

# 3. Install all dependencies across Python & Node workspaces
make install
```

---

## 🌿 Git Branching Strategy

We follow a clean, trunk-based feature branching model:

1. **Always branch off the latest `main` branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/my-new-feature
   ```

2. **Branch naming conventions:**
   - `feature/<name>`: New UI tabs, stat tables, analytics metrics (e.g., `feature/captaincy-table`)
   - `fix/<name>`: Bug fixes or data ingestion corrections (e.g., `fix/live-points-mapping`)
   - `docs/<name>`: Documentation improvements and setup guides (e.g., `docs/contributing-guide`)
   - `refactor/<name>`: Code cleanup, performance optimizations, or schema refactoring

---

## 💻 Local Development Workflow

The fastest way to test your changes end-to-end is with the unified test environment:

```bash
# Starts PostgreSQL (Docker), runs DB bootstrap & backfill, launches FastAPI backend & Next.js UI
make test-env
```

### Local Endpoints:
- 🌐 **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- 📚 **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 🩺 **Backend Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### Running Individual Services (Optional):
If you prefer running services in separate terminals:
```bash
# Terminal 1: Database
make docker-up

# Terminal 2: FastAPI Backend
make backend

# Terminal 3: Next.js Frontend
make frontend
```

---

## 🧪 Code Quality & Testing

Before submitting a pull request, ensure all linters, formatting checks, and test suites pass cleanly.

### 1. Automated Unit & Integration Tests
```bash
# Run all backend and pipeline test suites
make test
```

### 2. Linting & Formatting
```bash
# Run Python and Frontend linters
make lint

# Auto-format Python code with Ruff
make format
```

### 3. Frontend Production Build Check
```bash
# Verify Next.js TypeScript and production compilation
npm --prefix frontend run build
```

---

## 🚀 Submitting a Pull Request

1. **Commit your changes with clear, descriptive commit messages:**
   ```bash
   git add .
   git commit -m "feat: add rolling 5-game defensive points breakdown"
   ```

2. **Push your feature branch to GitHub:**
   ```bash
   git push -u origin feature/my-new-feature
   ```

3. **Open a Pull Request:**
   - Navigate to the repository on GitHub.
   - Click **"Compare & pull request"**.
   - Fill out the PR template with:
     - **Summary:** What changes were made and why.
     - **Key Features:** Bullet points highlighting new endpoints, components, or pipeline logic.
     - **Verification:** Proof of passing unit tests and frontend builds.

---

## 🏛️ Project Architecture Overview

| Directory | Responsibilities | Key Files |
| :--- | :--- | :--- |
| `backend/` | FastAPI REST API, SQLAlchemy models, metric calculations | `app/api/v1/endpoints/`, `app/models/` |
| `frontend/` | Next.js App Router (React), Tailwind CSS, Lucide icons | `src/app/page.tsx`, `src/components/`, `src/lib/api.ts` |
| `data_pipeline/` | Asynchronous FPL API ETL engine & poller | `src/poller.py`, `src/transformer.py`, `src/loader.py` |
| `infrastructure/` | Terraform modules for Cloud Run, Cloud SQL & Artifact Registry | `terraform/modules/`, `sql/init.sql` |

---

Thank you for helping make the FPL League Platform better! ⚽🏆
