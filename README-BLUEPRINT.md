# RoomRadar Blueprint — How to use this

This folder is a **complete build blueprint** for RoomRadar, meant to be dropped into your empty `roomradar` project folder and handed to **Claude Code**.

## How to use it (2 minutes)

1. Unzip this into your `roomradar` folder so it looks like:
   ```
   roomradar/
   ├── CLAUDE.md
   ├── README-BLUEPRINT.md   (this file — you can delete after reading)
   └── docs/
       ├── 01-overview.md
       ├── 02-structure.md
       ├── 03-infrastructure.md
       ├── 04-auth.md
       ├── 05-layout-and-ui.md
       ├── 06-data-and-ml.md
       ├── 07-models.md
       ├── 08-utilities.md
       ├── 09-routes-and-controllers.md
       └── 10-testing.md
   ```

2. Open a terminal in `roomradar/` and start Claude Code.

3. Paste this as your first message:

   > Read CLAUDE.md and every file in docs/ fully before writing any code. Then build the entire RoomRadar project in one pass following the build order in CLAUDE.md. Pin the versions in docs/03. Verify `npm run build` after each major step and fix errors before continuing. Seed real Kathmandu/Lalitpur/Bhaktapur data. Run the ML training script, wire the pure-TS inference, and make the fair-price badge and /results page work. When done, write the README and confirm `npm run dev` boots with listings on the map. Don't stop until the manual test checklist in docs/10 passes.

4. Let it run. When it pauses for the design layer, either let it generate the components or switch to **Claude Design** for the visual set (see docs/05), then continue.

## What's inside each doc
- **CLAUDE.md** — golden rules + exact build order. The spine.
- **01 overview** — requirements from your report (keep code and report aligned).
- **02 structure** — the full file tree to create.
- **03 infrastructure** — pinned versions, scaffold + install commands, env, scripts.
- **04 auth** — Auth.js v5 credentials, roles, middleware (with code).
- **05 layout & UI** — pages, components, Leaflet map gotchas, Claude Design usage.
- **06 data & ML** — the whole ML pipeline: dataset generator, `train.py` (ready to run), JSON export format, and the pure-TS inference module. **The most important doc.**
- **07 models** — Prisma schema + seed guidance.
- **08 utilities** — prisma client, constants, Zod schemas, formatters, fair-price logic (with code).
- **09 routes & controllers** — thin route handlers + controllers (with code).
- **10 testing** — build gate, unit tests, manual checklist, defence talking points.

## Key design choices (so you can explain them)
- **Next.js 15 + SQLite + Prisma 6 + Auth.js v5** — deliberately conservative, zero-external-setup stack so it builds and runs in one sitting.
- **ML trained offline in Python, served as JSON via pure-TS inference** — the website can never crash because of a Python problem during your defence.
- **Three cities, real area names + coordinates, seeded mix of fair/high/below listings** — makes the demo and the badge feature look real.

Authors: **Bishow Lamichhane** & **Anjan Sharma** (equal contribution).
