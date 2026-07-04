# CLAUDE.md — RoomRadar Build Instructions (READ THIS FIRST)

You are building **RoomRadar**, a room/flat rental finder for Nepal with ML-based rent price prediction. This is a final-year B.Sc. CSIT project that must be completed in ONE sitting and demoed at a defence. Prioritize **something that runs end-to-end** over feature completeness. A working, seedable, demoable app beats a half-finished ambitious one.

## Golden rules for this build

1. **Never leave the app in a non-running state.** After every major module, run `npm run build` (or at least `npx tsc --noEmit`) and fix errors before moving on.
2. **Follow the docs in order.** Read every file in `docs/` before writing code. They define the exact stack, schema, routes, and file layout. Do not invent a different architecture.
3. **Pin the versions in `docs/03-infrastructure.md`.** Do not upgrade to newer majors even if npm suggests them. These versions are chosen for stability, not novelty. If an install fails, report it — do not silently switch to a different major version.
4. **The ML model must never crash the web app.** The Python training script runs offline and exports a plain JSON file (`ml/model.json`). The Next.js app reads that JSON and does pure-arithmetic inference in TypeScript. There is NO live Python call at request time. This is deliberate — respect it.
5. **Seed realistic Nepal data.** All listings are in **Kathmandu, Lalitpur, or Bhaktapur**. Use real area names (Baneshwor, Kupondole, Suryabinayak, etc. — full list in `docs/06-data-and-ml.md`). Rents in NPR. This is what makes the demo credible.
6. **Think before large edits.** For schema, auth, and the ML inference math, re-read the relevant doc and reason through it twice before writing. These three are where silent bugs hide.
7. **Do not use any paid API or key-required service.** Maps use OpenStreetMap tiles via Leaflet (no key). DB is local SQLite (no connection string). Auth is self-contained.

## What RoomRadar does (scope)

- **Seekers** browse/search/filter room & flat listings on an interactive map, and see a **"Fair Price" badge** comparing the listed rent to the ML-predicted fair rent.
- **Owners** register, post listings (location, size, floor, amenities, photos-by-URL), and get a **suggested rent** from the model while posting.
- **Admin** moderates listings and users.
- **ML core**: a regression model trained on the seeded dataset predicts monthly rent from features. We compare Linear Regression, Random Forest, and Gradient Boosting offline, pick the best, and export it. The app shows predicted vs. listed price.

## Build order (do these in sequence)

Follow this exact sequence. Each step has a dedicated doc. Verify the app still builds after each.

1. **Scaffold + infrastructure** → `docs/03-infrastructure.md`
   Create the Next.js app, install pinned deps, set up config, folder structure from `docs/02-structure.md`.
2. **Database + models** → `docs/07-models.md` + `docs/06-data-and-ml.md` (schema section)
   Write `prisma/schema.prisma`, run migration, write the seed script with real Nepal data.
3. **ML pipeline** → `docs/06-data-and-ml.md`
   Write the Python training script, run it, produce `ml/model.json` + metrics. Write the TS inference module `lib/ml/predict.ts`.
4. **Utilities & helpers** → `docs/08-utilities.md`
   Prisma client singleton, auth helpers, validation schemas, formatters, the fair-price calculator.
5. **Auth** → `docs/04-auth.md`
   Auth.js credentials setup, register/login, session, route protection, roles.
6. **API routes / controllers** → `docs/09-routes-and-controllers.md`
   Listings CRUD, search/filter, predict endpoint, admin endpoints. Thin route handlers calling controller functions.
7. **Layout + pages + UI** → `docs/05-layout-and-ui.md`
   App shell, home/search with map, listing detail, post-listing form, auth pages, admin dashboard. **This is where you invoke Claude Design** for the visual components (see that doc).
8. **Testing + polish** → `docs/10-testing.md`
   Manual test checklist, a few unit tests for the ML math and fair-price logic, seed-and-demo script, README with run instructions and defence talking points.

## Tech stack (summary — full detail in docs/03)

- **Framework**: Next.js 15 (App Router, TypeScript, `src/` dir, Tailwind)
- **DB**: SQLite via Prisma ORM (file-based, zero setup; swappable to Postgres — instructions in doc)
- **Auth**: Auth.js (NextAuth v5 beta) — credentials provider, JWT sessions
- **Validation**: Zod
- **Maps**: Leaflet + react-leaflet + OpenStreetMap (no API key)
- **ML (offline)**: Python 3, pandas, scikit-learn → exports `ml/model.json`
- **ML (runtime)**: pure TypeScript inference reading the JSON, no Python at request time
- **Password hashing**: bcryptjs
- **Charts (result analysis page)**: Recharts

## Two-person credit

This project is by **Bishow Lamichhane** and **Anjan Sharma**. If you generate any "authors" / contributors / about section, credit both equally. Otherwise you don't need to mention roles in the code.

## When you finish

Produce a `README.md` at the project root with: setup commands, how to seed, how to run, default login credentials (from the seed), the model's reported MAE/RMSE/R², and a short "Defence talking points" section. Make sure `npm run dev` starts cleanly and the seeded map has listings visible.

---
Now open `docs/01-overview.md` and read all docs before writing any code.
