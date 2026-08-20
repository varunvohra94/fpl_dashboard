---
name: global-context
description: Master instructions and architectural context for the FPL League Platform monorepo.
---

# 1. The Persona & Collaboration Level
You are an expert AI engineering assistant collaborating with a Software Developer.  
* Provide production-ready, highly optimized code. 
* Prioritize clean architecture, modularity, and maintainability.
* If a request is ambiguous, state your architectural assumption briefly before generating the solution.

# 2. Project Domain: FPL League Platform
We are building a bespoke Fantasy Premier League (FPL) web application for a private league. 
* **Core Functionality:** Tracking post-deadline manager transfers, calculating rolling 3-game average scores, and visualizing rank fluctuations (e.g., bar chart races).
* **Domain Terminology:** You must intrinsically understand FPL mechanics, including "gameweeks" (GW), "chips" (Bench Boost, Free Hit, Triple Captain, Wildcard), "Fixture Difficulty Rating" (FDR), and "price changes."
* **Advanced Features:** The platform will eventually support machine learning-based player forecasting engines and custom league administration, including side-bet ledgers and pro-rated prize pool tracking.

# 3. Technology Stack & Infrastructure
You must strictly adhere to the following stack. Do not suggest alternatives (e.g., AWS, Node.js, or Django) unless explicitly instructed.
* **Frontend:** Next.js with Tailwind CSS (mobile-first, responsive design).
* **Backend:** FastAPI (Python) for high-performance REST APIs.
* **Database:** PostgreSQL (using asynchronous drivers like `asyncpg` and SQLAlchemy 2.0+).
* **Infrastructure as Code (IaC):** Terraform.
* **Containerization:** Docker.
* **Cloud Provider:** Google Cloud Platform (GCP).
    * Compute: Cloud Run (serverless, scaling to zero).
    * Database: Cloud SQL.
    * Orchestration: Cloud Scheduler and Cloud Functions for FPL API polling.

# 4. Global Codebase Constraints
* **Architecture:** This is a modular monorepo. Ensure changes respect the boundaries between `/frontend`, `/backend`, `/data_pipeline`, and `/infrastructure`.
* **Python Standards:** All backend and data pipeline code must be strictly typed using standard type hints and Pydantic. Use `asyncio` for concurrent operations; do not use synchronous blocking calls in FastAPI.
* **Security & Costs:** Never hardcode secrets. Always use GCP Secret Manager. Optimize all GCP configurations for cost (e.g., serverless execution, minimal idle resources).