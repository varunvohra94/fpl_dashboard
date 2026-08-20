html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>FPL League Platform - Implementation Blueprint</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm;
            background-color: #fdfdfd;
            @bottom-right {
                content: counter(page);
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 9pt;
                color: #666;
            }
        }
        
        *, *::before, *::after { box-sizing: border-box; }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            background-color: #fdfdfd;
        }

        .header-banner {
            background-color: #37003c; /* FPL Purple */
            color: #ffffff;
            margin: -20mm -15mm 15mm -15mm;
            padding: 25mm 15mm 15mm 15mm;
            text-align: left;
            border-bottom: 5px solid #00ff87; /* FPL Green */
        }

        h1 {
            margin: 0;
            font-size: 28pt;
            font-weight: bold;
            letter-spacing: -0.5px;
        }

        .subtitle {
            font-size: 14pt;
            color: #e0e0e0;
            margin-top: 5px;
            font-weight: normal;
        }

        h2 {
            font-size: 16pt;
            color: #37003c;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 12px;
            page-break-after: avoid;
        }

        h3 {
            font-size: 13pt;
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 8px;
            page-break-after: avoid;
        }

        p {
            font-size: 10.5pt;
            margin-bottom: 12px;
        }

        ul {
            margin: 0 0 15px 0;
            padding-left: 20px;
        }

        li {
            font-size: 10.5pt;
            margin-bottom: 6px;
        }

        .phase-box {
            background-color: #f4f6f8;
            border-left: 4px solid #00ff87;
            padding: 12px 15px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .phase-title {
            font-weight: bold;
            font-size: 12pt;
            color: #37003c;
            margin-bottom: 5px;
        }

        .code-block {
            background-color: #2b2b2b;
            color: #f8f8f2;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9.5pt;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }

        .callout {
            background-color: #e8f4fd;
            border: 1px solid #b6d4fe;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 10pt;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
    </style>
</head>
<body>

    <div class="header-banner">
        <h1>FPL League Platform Blueprint</h1>
        <div class="subtitle">End-to-End Implementation Plan & Architecture Guide</div>
    </div>

    <p>This document outlines the step-by-step technical plan to build a bespoke Fantasy Premier League tracking and analytics platform. The project is divided into logical, sequential phases designed to establish a robust foundation before moving into complex visualizations and forecasting mechanics.</p>

    <h2>Phase 1: Environment & Infrastructure</h2>
    <p>The goal of this phase is to establish the version control strategy and deploy the foundational cloud resources using a modern, declarative approach. This ensures the environment is reproducible and clean.</p>
    
    <div class="phase-box">
        <div class="phase-title">Step 1.1: Initialize the Modular Monorepo</div>
        <ul>
            <li>Create the root repository (<code>fpl-league-platform</code>).</li>
            <li>Establish the four core directories: <code>frontend/</code>, <code>backend/</code>, <code>data_pipeline/</code>, and <code>infrastructure/</code>.</li>
            <li>Set up base <code>.gitignore</code> rules for Python, Node.js, and Terraform.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 1.2: Infrastructure as Code (Terraform)</div>
        <ul>
            <li>Navigate to the <code>infrastructure/</code> directory.</li>
            <li>Write Terraform modules to provision a Google Cloud SQL instance (PostgreSQL) for transactional storage.</li>
            <li>Configure Cloud Run services for the API and frontend containers.</li>
            <li>Provision a Cloud Scheduler job and a lightweight Cloud Function for the polling mechanism.</li>
            <li>Apply the Terraform state to spin up the Development/MVP environment.</li>
        </ul>
    </div>

    <h2>Phase 2: Data Modeling & ETL Pipeline</h2>
    <p>With infrastructure in place, the next objective is securely fetching data from the FPL endpoints, calculating custom metrics like rolling averages, and storing it relationally.</p>

    <div class="phase-box">
        <div class="phase-title">Step 2.1: PostgreSQL Schema Design</div>
        <ul>
            <li>Design tables for <code>manager</code>, <code>gameweek_metadata</code>, <code>manager_gameweek_scores</code>, and <code>transfers</code>.</li>
            <li>Implement SQLAlchemy models in the <code>data_pipeline/</code> directory.</li>
            <li>Run Alembic migrations to instantiate the schema in the Cloud SQL database.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 2.2: The Smart Polling Mechanism</div>
        <ul>
            <li>Write a lightweight Python Cloud Function that queries <code>/bootstrap-static/</code>.</li>
            <li>Implement the logic gate: check if the current gameweek has <code>finished == True</code> AND <code>data_checked == True</code>.</li>
            <li>If true, verify against the <code>gameweek_metadata</code> table to ensure it hasn't been processed yet.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 2.3: Batch Processing Engine</div>
        <ul>
            <li>Build the Python ETL worker triggered by the polling mechanism.</li>
            <li>Fetch league-specific data (manager picks, transfers).</li>
            <li>Calculate the <strong>rolling 3-game average</strong> for each manager using pandas or direct SQL window functions.</li>
            <li>Upsert the processed records into the PostgreSQL database.</li>
        </ul>
    </div>

    <h2>Phase 3: The API Layer</h2>
    <p>This phase exposes the processed database records to the frontend via a high-performance REST API.</p>

    <div class="phase-box">
        <div class="phase-title">Step 3.1: FastAPI Core Setup</div>
        <ul>
            <li>Initialize the FastAPI application in the <code>backend/</code> directory.</li>
            <li>Configure CORS to allow requests from the future Next.js domain.</li>
            <li>Set up the database connection pool securely using GCP secret manager or environment variables.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 3.2: Endpoint Development</div>
        <ul>
            <li><code>GET /league/standings</code>: Returns the current league table with point totals.</li>
            <li><code>GET /league/metrics</code>: Returns the rolling 3-game average and form data.</li>
            <li><code>GET /league/transfers</code>: Returns a chronological list of transfers made in the most recent gameweek (for the News Feed).</li>
        </ul>
    </div>

    <h2>Phase 4: Frontend MVP (Mobile-Responsive UI)</h2>
    <p>Construct the public-facing portal where league managers will consume the data. Focus on clean, server-side rendered delivery.</p>

    <div class="phase-box">
        <div class="phase-title">Step 4.1: Next.js Foundation</div>
        <ul>
            <li>Initialize the Next.js application in the <code>frontend/</code> directory.</li>
            <li>Configure Tailwind CSS for rapid, mobile-first styling.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 4.2: Component Assembly</div>
        <ul>
            <li><strong>League Table Component:</strong> Display standard standings alongside the rolling 3-game average column.</li>
            <li><strong>Transfer News Feed:</strong> Create a social-media style card layout highlighting who managers brought in and transferred out.</li>
            <li>Ensure the layout shifts gracefully from desktop grids to mobile stacks using Tailwind breakpoints.</li>
        </ul>
    </div>

    <h2>Phase 5: Advanced Visuals & Machine Learning (Post-MVP)</h2>
    <p>Once the foundation is stable, you can introduce complex features that significantly elevate the platform's value.</p>

    <div class="phase-box">
        <div class="phase-title">Step 5.1: Dynamic Bar Chart Race</div>
        <ul>
            <li>Integrate D3.js or a library like <code>react-chartjs-2</code>.</li>
            <li>Create an endpoint <code>GET /league/historical-ranks</code> to feed week-by-week cumulative scores.</li>
            <li>Render the animated race component to visualize positional fluctuations over the season.</li>
        </ul>
    </div>

    <div class="phase-box">
        <div class="phase-title">Step 5.2: Expected Points Forecasting Engine</div>
        <ul>
            <li>Extend the <code>data_pipeline</code> to ingest player-level underlying stats (xG, xA, FDR).</li>
            <li>Implement a machine learning model (e.g., LightGBM) to generate expected points (<code>xPts</code>) based on recent form and historical data.</li>
            <li>Aggregate player predictions into manager-level forecasts to generate automated "Head-to-Head Win Probability" match previews.</li>
        </ul>
    </div>

    <div class="callout">
        <strong>Strategic Note on Expansion:</strong> By maintaining a strict boundary between your ETL pipelines, REST API, and frontend applications within the monorepo, swapping out heuristics for advanced predictive models in Phase 5 will require zero changes to your UI components.
    </div>

</body>
</html>
"""

import os
from weasyprint import HTML

output_path = os.path.join(os.getcwd(), "docs", "fpl_platform_blueprint_v2.pdf")

# Ensure the output directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

HTML(string=html_content).write_pdf(output_path)
print(f"PDF successfully generated at: {output_path}")