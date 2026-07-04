# 03 — Infrastructure, Versions & Setup

Do these first. **Pin these versions.** They are chosen for a smooth one-sitting build, not for being newest.

## Prerequisites (check, don't assume)
```bash
node --version   # must be >= 20.9.0 (Next 15/16 need 20+). If lower, tell the user to install Node 20 LTS.
python3 --version # need Python 3.9+ for the ML script
```

## Step 1 — Scaffold Next.js 15
Run in the (empty) `roomradar` folder. If the folder already contains CLAUDE.md/docs, scaffold into it (create-next-app can init the current dir with `.`).

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```
- Answer **No** to any extra prompts you're unsure about; TypeScript/Tailwind/ESLint/App Router/src-dir/import-alias are set by the flags above.
- We deliberately use **Next.js 15** (not 16) to avoid Turbopack-default / Cache-Components surprises during a rushed build. `--no-turbopack` keeps the classic bundler.

> If `create-next-app@15` refuses to init a non-empty dir, move CLAUDE.md + docs out, scaffold, then move them back. Do not switch to a different framework.

## Step 2 — Install pinned dependencies
```bash
# Core runtime deps
npm install prisma@6 @prisma/client@6 next-auth@5.0.0-beta.25 bcryptjs zod leaflet react-leaflet recharts

# Dev/type deps
npm install -D @types/leaflet @types/bcryptjs tsx
```

Version intent (record in README):
- `next` → 15.x (from scaffold)
- `react` / `react-dom` → 19.x (comes with Next 15)
- `prisma` + `@prisma/client` → **6.x** (Prisma 6 keeps the classic `prisma-client-js` generator + `url` in datasource — simpler than Prisma 7's new config file. Do NOT install prisma@7.)
- `next-auth` → **5.0.0-beta.25** (Auth.js v5; stable enough and the modern API). If this exact beta fails to install, use the latest `next-auth@5.0.0-beta.*` and note it.
- `zod`, `bcryptjs`, `leaflet`, `react-leaflet`, `recharts`, `tsx` → latest compatible.

After install, run `npm run build` once to confirm the clean scaffold builds. Fix anything before proceeding.

## Step 3 — Environment variables
Create `.env` (and a committed `.env.example` with the same keys but empty values):

```
# SQLite — zero setup, file lives in prisma/dev.db
DATABASE_URL="file:./dev.db"

# Auth.js secret — generate a random string
AUTH_SECRET="REPLACE_WITH_RANDOM_32_CHARS"
NEXTAUTH_SECRET="REPLACE_WITH_RANDOM_32_CHARS"  # same value; kept for compatibility
```
Generate the secret with: `openssl rand -base64 32` (or any 32+ char random string) and write it into `.env` (not `.env.example`).

Add to `.gitignore` (create-next-app covers most; ensure these are present):
```
.env
/prisma/dev.db
/prisma/dev.db-journal
/ml/__pycache__
/src/lib/ml/model.json   # if you copy it in; optional
```
(But DO keep `ml/model.json` and `ml/metrics.json` tracked if you want the app to work without re-running Python. Prefer: commit them.)

## Step 4 — package.json scripts
Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev --name init",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force && npm run db:seed",
    "ml:train": "cd ml && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && python3 train.py"
  }
}
```
Also add the Prisma seed hook so `prisma db seed` works:
```json
{
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

## Step 5 — Prisma init
```bash
npx prisma init --datasource-provider sqlite   # if schema.prisma not already present
```
Then write the schema from `docs/07-models.md`, and run:
```bash
npm run db:migrate
npm run db:seed
```

## Step 6 — TypeScript config sanity
`tsconfig.json` should already have `"@/*": ["./src/*"]` from the scaffold. Confirm `strict: true`. Keep it strict — it catches the silent bugs.

## Swapping SQLite → PostgreSQL later (document, don't do now)
In README note: change `provider = "postgresql"` in `schema.prisma`, set `DATABASE_URL` to a Postgres URL, re-run `prisma migrate dev`. No app code changes. We use SQLite for the demo so there's nothing to install or connect.

## Build-health checkpoints
Run `npm run build` after: scaffold, schema+migrate, auth wiring, and after the UI. Never proceed past a red build.
