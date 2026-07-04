# 02 — Project Structure (target file tree)

Create exactly this layout. `src/` dir is enabled. Paths use the `@/*` import alias mapping to `src/*`.

```
roomradar/
├── CLAUDE.md                       # (already present) build instructions
├── README.md                       # you write this at the end
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env                            # DATABASE_URL, AUTH_SECRET (see docs/03)
├── .env.example
├── .gitignore
│
├── prisma/
│   ├── schema.prisma               # models (docs/07)
│   ├── seed.ts                     # seeds Nepal listings + users (docs/06)
│   └── dev.db                      # SQLite file (generated)
│
├── ml/                             # OFFLINE machine learning (Python)
│   ├── train.py                    # trains + compares models, exports json (docs/06)
│   ├── requirements.txt            # pandas, scikit-learn, numpy
│   ├── dataset.csv                 # generated from seed OR written by train.py
│   ├── model.json                  # EXPORTED best model (read by the app)
│   └── metrics.json                # EXPORTED metrics for the /results page
│
├── public/
│   └── (static assets, marker icons if needed)
│
└── src/
    ├── app/
    │   ├── layout.tsx              # root layout, app shell (docs/05)
    │   ├── page.tsx                # home = search + map (docs/05)
    │   ├── globals.css
    │   │
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   │
    │   ├── listings/
    │   │   ├── page.tsx            # browse/search results (can reuse home)
    │   │   ├── new/page.tsx        # owner: post a listing (with live rent suggestion)
    │   │   └── [id]/
    │   │       ├── page.tsx        # listing detail + fair-price badge + map
    │   │       └── edit/page.tsx   # owner: edit own listing
    │   │
    │   ├── dashboard/
    │   │   └── page.tsx            # owner's own listings
    │   │
    │   ├── admin/
    │   │   └── page.tsx            # admin: moderate listings & users
    │   │
    │   ├── results/
    │   │   └── page.tsx            # model comparison + charts (defence page)
    │   │
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── register/route.ts
    │       ├── listings/route.ts            # GET (list/search) + POST (create)
    │       ├── listings/[id]/route.ts       # GET one + PATCH + DELETE
    │       ├── predict/route.ts             # POST features -> predicted rent
    │       └── admin/
    │           ├── listings/[id]/route.ts   # DELETE (admin)
    │           └── users/[id]/route.ts      # PATCH role / DELETE
    │
    ├── components/
    │   ├── ui/                      # small reusable bits (Button, Input, Badge, Card…)
    │   ├── Navbar.tsx
    │   ├── Footer.tsx
    │   ├── ListingCard.tsx
    │   ├── ListingForm.tsx          # used by new + edit
    │   ├── SearchFilters.tsx
    │   ├── FairPriceBadge.tsx
    │   ├── Map.tsx                  # Leaflet map (client-only, dynamic import)
    │   └── charts/
    │       ├── ActualVsPredicted.tsx
    │       └── FeatureImportance.tsx
    │
    ├── lib/
    │   ├── prisma.ts                # Prisma client singleton (docs/08)
    │   ├── auth.ts                  # Auth.js config + helpers (docs/04)
    │   ├── validations.ts           # Zod schemas (docs/08)
    │   ├── format.ts                # NPR formatting, etc. (docs/08)
    │   ├── fairPrice.ts             # listed-vs-predicted logic (docs/08)
    │   ├── constants.ts             # cities, areas, room types, amenities (docs/08)
    │   └── ml/
    │       ├── predict.ts           # pure-TS inference from ml/model.json (docs/06)
    │       └── model.json           # copy of ml/model.json for import (or import from ml/)
    │
    ├── controllers/                 # business logic, called by route handlers (docs/09)
    │   ├── listingController.ts
    │   ├── userController.ts
    │   └── predictController.ts
    │
    ├── types/
    │   └── index.ts                 # shared TS types (Listing DTO, Features, etc.)
    │
    └── middleware.ts                # route protection (docs/04)
```

## Conventions
- **Route handlers stay thin.** They parse/validate input, call a controller function, and return the response. All DB logic lives in `controllers/`.
- **Server Components by default.** Only mark `"use client"` where you need state/effects/leaflet (Map, forms, filters, charts).
- **The Map component must be dynamically imported with `ssr: false`** — Leaflet touches `window`.
- **One source of truth for the feature list** — `lib/constants.ts` exports the cities/areas/roomTypes/amenities used by the form, the seed, and the ML feature vector.
