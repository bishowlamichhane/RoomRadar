# RoomRadar

A room/flat rental finder for the **Kathmandu Valley** with an **ML-powered fair-price** check on every listing. Final-year B.Sc. CSIT project.

Seekers browse a map of listings across Kathmandu, Lalitpur and Bhaktapur and see, at a glance, whether each listing is a good deal, fair, or overpriced compared to the model's prediction. Owners get a live fair-rent suggestion while posting.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4, `src/`)
- **React 19**
- **Prisma 6** on **SQLite** (`prisma/dev.db`) — one-line switch to Postgres
- **Auth.js v5 (beta.25)** credentials + JWT sessions, bcryptjs hashing
- **Zod** for validation everywhere at the boundary
- **Leaflet + react-leaflet** on OpenStreetMap (no API key)
- **Recharts** for the results page charts
- **Python 3 + scikit-learn** for offline model training only (linear vs random-forest vs gradient boosting)

## Setup

1. **Get a free Neon Postgres URL** (2 minutes)
   - https://console.neon.tech → create a project → **Connection details** → copy the **Pooled** URI (into `DATABASE_URL`) and the **Unpooled** URI (into `DIRECT_URL`). Paste both into `.env`.
2. **Install & migrate**
   ```bash
   npm install
   npx prisma migrate dev --name init   # creates tables on your Neon DB
   npm run db:seed                      # 4 users + 50 listings across the 3 cities
   npm run dev
   ```
3. Open http://localhost:3000.

To reset the demo cleanly before defence:

```bash
npm run db:reset && npm run dev
```

### Prefer SQLite for offline dev?
The app was originally SQLite-first (see `prisma/_sqlite_migrations_archive/`).
Change `provider = "postgresql"` back to `"sqlite"` in `prisma/schema.prisma`
and set `DATABASE_URL="file:./dev.db"` — but you can't deploy that to Vercel.

To retrain the ML model (optional; sample outputs are committed):

```bash
npm run ml:train
# then copy ml/model.json and ml/metrics.json into src/lib/ml/
```

## Deployment — Vercel + Neon Postgres (free tier)

The app runs on **Vercel** with a **Neon Postgres** database and **Cloudinary**
media storage. All three have real free tiers, no credit card required.

### One-time setup

1. **Create a Neon project.**
   - Sign up at https://console.neon.tech
   - Create a project → default region (Frankfurt or Singapore is closest to Nepal)
   - From **"Connection details"** copy:
     - The **Pooled** connection string → this goes into `DATABASE_URL`
       (has `?pgbouncer=true` — leave that on)
     - Toggle **"Connection pooling"** OFF, copy the **Unpooled** URL →
       this goes into `DIRECT_URL` (Prisma migrate needs a non-pooled URL)

2. **Local .env** — paste both values into `.env`:
   ```
   DATABASE_URL="postgres://…?sslmode=require&pgbouncer=true"
   DIRECT_URL="postgres://…?sslmode=require"
   ```

3. **Run the first migration + seed against Neon (locally):**
   ```bash
   npm install
   npx prisma migrate dev --name init      # creates the tables on Neon
   npm run db:seed                         # inserts 4 users + 50 listings
   npm run dev                             # verify at http://localhost:3000
   ```

4. **Push the repo to GitHub** (or GitLab/Bitbucket).

5. **Import to Vercel.**
   - https://vercel.com/new → pick the repo → framework auto-detects Next.js
   - **Environment Variables** — add all of these (copy from your `.env`):
     - `DATABASE_URL`
     - `DIRECT_URL`
     - `AUTH_SECRET`
     - `NEXTAUTH_SECRET`
     - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
     - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
     - `CLOUDINARY_API_KEY` (optional)
     - `CLOUDINARY_API_SECRET` (optional)
   - Click **Deploy**.

6. **First deploy notes.**
   - The `build` script runs `prisma generate && prisma migrate deploy && next build` —
     so the schema is applied automatically. The seed does **not** run in prod
     by design; run it once manually if you want the demo data live:
     ```bash
     # from your machine, still pointing DATABASE_URL at the same Neon DB:
     npm run db:seed
     ```
   - Any subsequent `git push` triggers a fresh deploy with per-PR preview URLs.

### If you want to reset the deployed DB
Neon has instant DB branching. Create a fresh branch in the Neon console
(seconds) and point `DATABASE_URL` at it — no downtime, and the old branch
is preserved. Perfect for defence-day dry runs.

### Cloudinary in production
No change needed. Cloudinary URLs are absolute and served from their CDN,
so the same `NEXT_PUBLIC_CLOUDINARY_*` values work on both local and Vercel.

## Media uploads (Cloudinary)

Room photos and videos are uploaded straight from the browser to
[Cloudinary](https://cloudinary.com) (free tier — 25 GB storage / 25 GB
bandwidth per month). RoomRadar only stores the resulting CDN URLs in the DB.

### Setup (2 minutes)

1. Sign in at https://console.cloudinary.com (free account).
2. From the **Dashboard**, copy the **Cloud name** shown under
   "Product Environment Credentials". Paste it into `.env` as
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. Go to **Settings (gear icon) → Upload → Upload presets**. Click
   **"Add upload preset"**:
   - Give it a name, e.g. `roomradar_unsigned`
   - Set **Signing Mode = "Unsigned"** (important — this lets the browser upload without a server signature)
   - (Optional) Set **Folder = `roomradar/listings`**
   - Save
4. Copy the preset name and paste it into `.env` as
   `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
5. Restart the dev server (`npm run dev`).

The two `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` keys in `.env` are
**optional** — only needed if you later want server-signed uploads or a
delete-from-CDN endpoint. The unsigned preset covers everything the app
does today.

### If Cloudinary is not configured

The listing form still renders; the upload section shows a friendly
"Cloudinary not configured" hint instead of the upload buttons. Seeded
demo listings continue to display because their photo URLs are stored in
the database.

## Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@roomradar.np` | `admin123` |
| Owner | `owner@roomradar.np` | `owner123` |
| Owner | `owner2@roomradar.np` | `owner123` |
| Seeker | `seeker@roomradar.np` | `seeker123` |

(Weak passwords are for a local demo only.)

## ML — how it works

- **Offline training** (`ml/train.py`, Python + scikit-learn):
  - generates a deterministic synthetic Valley dataset of ~800 rows using researched NPR rent ranges;
  - one-hot encodes city and room type;
  - engineers an `area_price_index` — a target-based encoding of neighbourhood desirability, computed on the **train split only** to avoid leakage;
  - trains and evaluates **Linear Regression, Random Forest, Gradient Boosting** on a held-out 20% split;
  - exports two artifacts:
    - `ml/model.json` — the **linear model's coefficients + area index** for deterministic runtime inference;
    - `ml/metrics.json` — model comparison + actual/predicted pairs + feature importances (used by `/results`).
- **Runtime inference** (`src/lib/ml/predict.ts`, pure TypeScript):
  - reads `model.json` and evaluates `pred = intercept + Σ wᵢ·xᵢ`. No Python at request time — the app cannot crash because of a Python env problem during the demo.

### Reported metrics (from the sample training run)

| Model | R² | MAE (NPR) | RMSE (NPR) |
| --- | --- | --- | --- |
| Linear Regression | 0.956 | Rs 2,267 | Rs 2,947 |
| Random Forest | 0.960 | Rs 2,064 | Rs 2,831 |
| **Gradient Boosting** ★ | **0.969** | **Rs 1,807** | **Rs 2,478** |

The ensembles reported best; we **serve the linear model** for deterministic, dependency-free inference. The full comparison is on the `/results` page, along with an actual-vs-predicted scatter and a feature importance chart.

## Fair-price badge

For each listing we compare listed rent vs. the model's predicted rent:

- diff < −10% → **Below market** (blue)
- ±10% → **Fair price** (green)
- 10–20% above → **Slightly high** (amber)
- > 20% above → **Above fair** (red)

Implemented in `src/lib/fairPrice.ts`.

## Defence talking points

- **Why this stack** — Next.js gives us UI + API + SSR in one codebase; Prisma gives type-safe DB access; SQLite means zero-setup reproducibility (one line to switch to Postgres). Auth.js keeps auth in-repo, no third party.
- **The ML is real, not bolted on** — Valley-specific dataset, engineered features (one-hot city/room-type, target-based `area_price_index` on train split only), three models compared on held-out data, MAE reported in rupees.
- **Why linear is served** — ensembles scored best but we serve an exported linear model for deterministic, dependency-free inference. Full comparison is on `/results`. Honest and robust.
- **Fair-price** — predicted vs listed → percentage band → colored badge. Directly attacks the market's core problem (price opacity).
- **Location handling** — target-based `area_price_index` + one-hot city, markers on OpenStreetMap by area coordinates.
- **Auth/security** — bcrypt-hashed passwords, JWT sessions, role checks in **middleware** (coarse) and **controllers** (authoritative).
- **Limitations & future work** — larger/live dataset, broker verification, native mobile app, similar-rooms recommender, fraud detection.

## Switching SQLite → PostgreSQL

- Change `provider = "postgresql"` in `prisma/schema.prisma`.
- Set `DATABASE_URL` to a Postgres URL.
- Re-run `npx prisma migrate dev`.

No application code changes are required.

## Project structure

```
src/
  app/                  # App Router pages (home, listings, dashboard, admin, results, auth)
  components/           # Navbar, Footer, ListingCard, ListingForm, SearchFilters, FairPriceBadge, Map, charts/
  controllers/          # Business/DB logic called by the route handlers
  lib/                  # prisma, auth, constants, validations, format, fairPrice
  lib/ml/               # predict.ts + copied model.json + metrics.json
  types/                # shared TS types + next-auth augmentation
  middleware.ts         # route protection
prisma/schema.prisma    # SQLite schema for User + Listing
prisma/seed.ts          # seeds users + 50 realistic Kathmandu Valley listings
ml/                     # offline Python training script + artifacts
```

## Authors

**Bishow Lamichhane** and **Anjan Sharma** — equal contribution.
