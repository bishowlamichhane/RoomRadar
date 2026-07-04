# 07 — Data Models (Prisma schema + seed)

## `prisma/schema.prisma`
SQLite provider, classic Prisma 6 generator. SQLite has no native enums, so use `String` fields with app-level validation (Zod) for `role` and `roomType`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         String    @default("SEEKER")   // SEEKER | OWNER | ADMIN
  listings     Listing[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Listing {
  id                String   @id @default(cuid())
  title             String
  description       String?
  city              String   // Kathmandu | Lalitpur | Bhaktapur
  area              String
  roomType          String   // Single Room | 1BHK | 2BHK | Flat | Hostel
  sizeSqft          Float
  floor             Int
  bedrooms          Int
  bathrooms         Int
  furnished         Boolean  @default(false)
  waterSupply       Boolean  @default(true)
  parking           Boolean  @default(false)
  attachedBathroom  Boolean  @default(false)
  wifiReady         Boolean  @default(false)
  kitchen           Boolean  @default(false)
  balcony           Boolean  @default(false)
  latitude          Float
  longitude         Float
  rent              Int      // listed rent (NPR/month)
  predictedRent     Int?     // model's suggestion, stored at create time
  photoUrl          String?  // single image URL for the demo
  available         Boolean  @default(true)
  owner             User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId           String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([city])
  @@index([area])
  @@index([roomType])
}
```

Notes:
- `predictedRent` is computed via `predictRent()` when a listing is created/updated, and stored so cards render without recomputing.
- `photoUrl` keeps it simple — no file uploads. Seed with royalty-free Unsplash room image URLs (or a placeholder service). No uploads = one fewer failure mode.
- `onDelete: Cascade` so deleting a user (admin) removes their listings cleanly.

## Migration
```bash
npm run db:migrate      # prisma migrate dev --name init
npm run db:generate     # if needed
```

## `prisma/seed.ts` — seed guidance
Write a `tsx` seed that:
1. Creates the three demo users (admin/owner/seeker) with **bcrypt-hashed** passwords (docs/04 credentials).
2. Creates **~40–60 listings** across the three cities using the **exact area names and approximate lat/lng from docs/06**. Spread them: ~40% Kathmandu, ~35% Lalitpur, ~25% Bhaktapur.
3. For each listing, **compute `predictedRent` with `predictRent()`** (import from `@/lib/ml/predict`) and set the listed `rent` to `predictedRent ± a random 0–25%` so that the demo shows a healthy mix of "fair", "above", and "below" badges. This is important: if every listing is exactly fair, the badge feature looks broken.
4. Assign all seeded listings to the demo **owner** (or a couple of extra owners for realism).
5. Use realistic titles: e.g. "Sunny 1BHK near Baneshwor Chowk", "2BHK flat in Jhamsikhel", "Single room, Suryabinayak".

Seed images: use a small rotating list of Unsplash room/apartment photo URLs so cards look real. If offline, use `https://picsum.photos/seed/<id>/600/400`.

Run: `npm run db:seed`. Verify with `npx prisma studio` that listings exist and coordinates look right (Bhaktapur east, Lalitpur south).

## Consistency reminder
The seed's feature fields, the schema, the ML feature vector (docs/06), and `predict.ts` must all use the same names and value domains. `lib/constants.ts` (docs/08) is the single source for the allowed cities/areas/roomTypes/amenities — import it in the seed and the form.
