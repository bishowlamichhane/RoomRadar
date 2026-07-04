# 10 — Testing, Demo Prep & Defence

## Build-health gate
Run these and fix everything before calling the project done:
```bash
npx tsc --noEmit      # no type errors
npm run build         # production build succeeds
npm run db:reset      # migrate + seed cleanly from scratch
npm run dev           # boots, home shows seeded listings on the map
```

## Lightweight unit tests (enough to defend, not gold-plated)
Add a couple of tests for the two places bugs hide: the ML math and the fair-price logic. Use Node's built-in test runner (no extra deps) via `node --test` with `tsx`, or Vitest if you prefer (`npm i -D vitest`).

Test 1 — `predictRent` sanity:
- A 2BHK in Jhamsikhel (Lalitpur), 700 sqft, furnished, parking → predicted rent is a number in a plausible band (e.g. 15,000–40,000) and **greater** than the same listing without parking/furnished. Asserting monotonicity (more amenities ⇒ higher predicted rent) proves the model wiring is correct.

Test 2 — `fairness`:
- listed == predicted → "fair".
- listed = predicted * 1.3 → "high".
- listed = predicted * 0.8 → "below".

Test 3 — feature/coeff consistency:
- Assert `Object.keys(model.coefficients).sort()` equals `model.features.sort()` and that every feature in `predict.ts`'s `featureValues` exists in `model.features`. This catches drift between Python and TS.

## Manual test checklist (walk this before the demo)
Auth
- [ ] Register a new owner → redirected/logged in.
- [ ] Log out, log back in.
- [ ] Visiting `/admin` as non-admin redirects; as admin loads.

Listings
- [ ] Home shows seeded listings, map markers appear in the correct cities (Bhaktapur east, Lalitpur south).
- [ ] Filters: pick city=Lalitpur, roomType=2BHK, a price range → results and markers update.
- [ ] Open a listing detail → map centers on it, fair-price badge shows predicted vs listed.
- [ ] As owner: create a new listing. **Live suggested rent updates** as you change size/amenities.
- [ ] Created listing appears on home + dashboard, with a badge.
- [ ] Edit it (change rent) → badge changes accordingly.
- [ ] Delete it from dashboard.

Admin
- [ ] Admin can delete any listing.
- [ ] Admin can change a user's role / delete a user.

Results
- [ ] `/results` shows the comparison table, scatter (points near the diagonal), and feature-importance chart.

Robustness
- [ ] Submitting the listing form with a bad value (e.g. size=5) shows a validation error, not a crash.
- [ ] Direct GET `/api/listings` returns JSON.

## Seed-a-fresh-demo command
Document a single command in README so you can reset before the defence:
```bash
npm run db:reset && npm run dev
```

## README (write this at the end) must contain
1. **What it is** (one paragraph) + the three cities.
2. **Stack** with the pinned versions actually installed (run `npm ls next prisma next-auth` and paste).
3. **Setup**: `npm install` → set `.env` → `npm run db:migrate` → `npm run db:seed` → (optionally `npm run ml:train`) → `npm run dev`.
4. **Demo logins** (admin/owner/seeker from docs/04).
5. **ML section**: how the model was trained, the reported **MAE / RMSE / R²** for all three models (paste from `ml/metrics.json`), and the note that the served model is the exported linear model for deterministic inference.
6. **Defence talking points** (below).
7. **Swap to PostgreSQL** note (docs/03).
8. **Authors**: Bishow Lamichhane & Anjan Sharma (equal contribution).

## Defence talking points (put these in README and be ready to say them)
- **Why this stack**: Next.js full-stack lets us ship UI + API + SSR in one codebase; Prisma gives type-safe DB access; SQLite means zero-setup reproducibility for evaluation (one line to switch to Postgres).
- **Why the ML is real, not bolted on**: we collected/constructed a Valley-specific dataset, engineered features (one-hot city/room-type, a target-based area price index computed on the train split to avoid leakage), compared three regressors on held-out data, and report MAE in rupees — an intuitive error measure.
- **Why linear is served**: we benchmarked ensembles (which scored best) but serve an exported linear model for deterministic, dependency-free inference in the app; the comparison is on the results page. Honest and robust.
- **How fair-price works**: predicted rent vs listed rent → a percentage band → a colored badge. Directly attacks the market's core problem (price opacity).
- **Location handling**: area price index + one-hot city; markers placed by area coordinates.
- **Validation**: probable follow-ups on train/test split, avoiding leakage, and what the feature-importance chart says (location & size dominate).
- **Roles/security**: bcrypt-hashed passwords, JWT sessions, role checks in middleware and controllers.
- **Limitations & future work** (straight from the report): larger/live dataset, broker verification, native mobile app, a similar-rooms recommender, fraud detection.

## If time runs short — cut in this order (keep the spine intact)
1. Keep: auth, listings CRUD, map, predict + badge, seed, results page. (This is a full, defensible project.)
2. Trim first: admin user-role editing (keep listing moderation), listing photo variety, extra UI polish.
3. Never cut: the seed data, the fair-price badge, and the `/results` page — those are what make the demo land.
