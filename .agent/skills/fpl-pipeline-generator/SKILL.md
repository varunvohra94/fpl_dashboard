---
name: fpl-pipeline-generator
description: Generates Python batch processing scripts to extract data from the FPL JSON API and load it into PostgreSQL.
---
# Goal
Automate the reliable extraction, transformation, and loading (ETL) of FPL API data into the relational database.

# Instructions
1. Read the provided JSON payload structure from the user.
2. Write an asynchronous Python script using the `httpx` library to fetch the data.
3. Parse the data to calculate custom metrics, specifically the 3-game rolling average for player scores.
4. Generate SQLAlchemy declarative base models that match the transformed output data structure.
5. Provide the code clearly separated into extraction, transformation, and loading functions.

# Constraints
* Rely entirely on standard libraries or strictly typed, widely used packages (e.g., `httpx`, `pandas`, `sqlalchemy`).
* Do not introduce multi-threading; rely on `asyncio` for concurrent HTTP requests.