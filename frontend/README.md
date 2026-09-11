# Frontend Web Application (Next.js)

Mobile-responsive Fantasy Premier League (FPL) Rival Intelligence & Analytics Platform built with Next.js 16 (App Router), TypeScript, and Tailwind CSS.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Glassmorphic Design Tokens (Dark Obsidian, Premier League Neon Emerald & Purple)
- **Icons:** Lucide React (`lucide-react`)
- **Containerization:** Multi-stage Node.js Alpine Dockerfile

---

## 🌟 Core Features & Views

### 1. 🏆 Gameweek Intelligence & Rival Highlights Banner
* **Season Record Haul:** Tracks the highest single-gameweek score achieved by any manager this season.
* **Captaincy Master:** Cumulative points scored by captain picks so far this season (with multi-manager tie handling).
* **Bench Regrets King:** Cumulative running sum of points stranded on the bench (`points_on_bench`).
* **The Season Gambler:** Cumulative transfer hit point deductions taken over the season.
* **Active Chip Alert:** Visual badge for rivals deploying Wildcard, Free Hit, Bench Boost, or Triple Captain.
* **Form King:** Highlights the manager leading the rolling 3-GW moving average.

### 2. 📋 Tab 1: Custom Standings & Smart Transfer Feed
* **Custom Standings Table:**
  - True **Net Points** (`total_points - total_hits_cost`).
  - Total Hits cost deductions.
  - Rolling 3-GW Form badge with color coding.
  - Rank movement indicators (`▲ 2`, `▼ 1`, `=`).
  - Row click trigger opening the **Manager Scorecard Modal**.
* **Smart Transfer Feed (Wildcard & Free Hit Grouping):**
  - Groups 10+ transfer Wildcards into a compact **Squad Overhaul** card with collapsible preview to prevent feed explosion.
  - Filter by `[ All Moves ]`, `[ 1-2 Moves ]`, `[ Overhauls (3+) ]`.
* **Manager Drill-Down Modal:**
  - Gameweek-by-gameweek scorecard history table, net points, chip activation timeline, and overall FPL rank.

### 3. 📊 Tab 2: Race & League Analytics
* **🏎️ Animated Bar Chart Race:**
  - Interactive week-by-week rank race with Play / Pause (▶️ / ⏸️), speed toggles (1x, 2x, 4x), and gameweek scrubber slider.
* **🎯 Form vs. Hits Matrix (2x2 Quadrant Scatter):**
  - Classifies managers into *The Pure Strategists* (High Form, Low Hits), *The High Rollers* (High Form, High Hits), *The Silent Drifters* (Low Form, Low Hits), and *In The Mud* (Low Form, High Hits).
* **🧩 Chip Matrix Grid Table:**
  - Grid tracking Wildcard, Free Hit, Bench Boost, and Triple Captain availability for all league rivals.

### 4. ⚽ Tab 3: Matchday Stats
* Premier League top player statistics including goals, assists, expected goals (`xG`), expected assists (`xA`), Threat, Influence, and ICT index with position filtering.

---

## 💻 Local Development

### 1. Ensure Backend & PostgreSQL Are Running
```bash
# In separate terminals
docker compose up -d postgres
cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🐳 Docker Deployment

### Build Container
```bash
docker build -t fpl-frontend:latest -f Dockerfile .
```

### Run Container
```bash
docker run -d -p 3000:3000 --name fpl_frontend fpl-frontend:latest
```
