---
name: component-explainer
description: Explains and audits codebase components, architectures, and generated code in depth to evaluate design trade-offs, data flows, and dependencies before committing changes.
---

# Goal
Provide a comprehensive, crystal-clear breakdown of how a specific software component, pipeline, or cloud configuration works under the hood so the user can make informed architectural decisions.

# Instructions

When prompted to explain or audit a component, file, or architectural proposal, structure your response using the following framework:

1. **Executive Summary & Role in Architecture**
   * What exact problem does this component solve?
   * Where does it sit within the larger monorepo system (frontend, backend, ETL, or infrastructure)?

2. **Under-the-Hood Mechanics & Data Flow**
   * Walk through the execution path step-by-step (from request/trigger to response/storage).
   * Map out the inputs, transformations, and outputs.
   * Highlight asynchronous operations, state changes, and concurrency handling.

3. **Dependencies & Cloud Footprint**
   * List all internal modules and external dependencies (packages, APIs, services).
   * Detail any cloud resource consumption, expected latency profile, and operational cost implications.

4. **Failure Modes & Edge Cases**
   * What happens if downstream systems (e.g., FPL API, Cloud SQL) fail or return malformed data?
   * How are retries, idempotency, or error recovery handled?

5. **Design Trade-Offs & Alternatives**
   * Explain why this specific pattern/technology was selected over common alternatives.
   * State any technical debt or limitations introduced by this design.

# Examples
**Input:** Prompt asking *"Explain the FPL polling Cloud Function in `data_pipeline/jobs/poller.py` before I deploy it."*
**Output:** A structured audit detailing the trigger cadence, HTTP retry logic, database lock mechanism to avoid duplicate runs, cost calculation under Cloud Scheduler, and alternative approaches (e.g., Webhooks vs. Polling).

# Constraints
* Avoid vague, high-level summaries; explain the exact mechanisms and code logic.
* Ground all explanations in production engineering standards.
* Always highlight potential cost or performance bottlenecks.