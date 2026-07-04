# 08 — Utilities & Helpers

Small, well-tested building blocks. Write these before the routes/UI so everything imports from one place.

## `src/lib/prisma.ts` — Prisma client singleton
Prevents exhausting connections during Next.js hot reload.
```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## `src/lib/constants.ts` — single source of truth
Export the controlled vocabularies used everywhere (form, seed, ML, validation):
```ts
export const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur"] as const;
export const ROOM_TYPES = ["Single Room", "1BHK", "2BHK", "Flat", "Hostel"] as const;
export const AMENITIES = [
  { key: "waterSupply", label: "Water Supply" },
  { key: "parking", label: "Parking" },
  { key: "attachedBathroom", label: "Attached Bathroom" },
  { key: "wifiReady", label: "Wi-Fi Ready" },
  { key: "kitchen", label: "Kitchen" },
  { key: "balcony", label: "Balcony" },
] as const;
export const ROLES = ["SEEKER", "OWNER", "ADMIN"] as const;

// Areas by city (must match docs/06 names). Include coords for map defaults if useful.
export const AREAS: Record<(typeof CITIES)[number], string[]> = {
  Kathmandu: ["Baneshwor","Koteshwor","Kalanki","Chabahil","Baluwatar","Maharajgunj","Kirtipur","Balaju","Gongabu","Samakhusi","Naxal","Thamel"],
  Lalitpur: ["Kupondole","Jhamsikhel","Pulchowk","Satdobato","Lagankhel","Imadol","Ekantakuna","Sanepa","Bhaisepati"],
  Bhaktapur: ["Suryabinayak","Kamalbinayak","Sallaghari","Dudhpati","Katunje","Sipadol","Thimi","Gatthaghar"],
};

export const VALLEY_CENTER = { lat: 27.7050, lng: 85.3300, zoom: 12 };
```

## `src/lib/validations.ts` — Zod schemas
Validate every external input. Reuse in forms, API routes, and auth.
```ts
import { z } from "zod";
import { CITIES, ROOM_TYPES } from "@/lib/constants";

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["SEEKER", "OWNER"]),   // never allow ADMIN from the public form
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const listingSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  city: z.enum(CITIES),
  area: z.string().min(2),
  roomType: z.enum(ROOM_TYPES),
  sizeSqft: z.coerce.number().min(60).max(5000),
  floor: z.coerce.number().int().min(0).max(30),
  bedrooms: z.coerce.number().int().min(0).max(10),
  bathrooms: z.coerce.number().int().min(0).max(10),
  furnished: z.coerce.boolean(),
  waterSupply: z.coerce.boolean(),
  parking: z.coerce.boolean(),
  attachedBathroom: z.coerce.boolean(),
  wifiReady: z.coerce.boolean(),
  kitchen: z.coerce.boolean(),
  balcony: z.coerce.boolean(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  rent: z.coerce.number().int().min(1000).max(500000),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

// features-only schema for /api/predict (no title/rent needed)
export const predictSchema = listingSchema.pick({
  city:true, area:true, roomType:true, sizeSqft:true, floor:true,
  bedrooms:true, bathrooms:true, furnished:true, waterSupply:true,
  parking:true, attachedBathroom:true, wifiReady:true, kitchen:true, balcony:true,
});

export const searchSchema = z.object({
  city: z.enum(CITIES).optional(),
  area: z.string().optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  amenities: z.array(z.string()).optional(),
}).partial();
```

## `src/lib/format.ts`
```ts
export const npr = (n: number) =>
  "Rs " + Math.round(n).toLocaleString("en-IN");   // en-IN gives 15,000 grouping

export const pct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;
```

## `src/lib/fairPrice.ts` — the badge logic
```ts
export type FairVerdict = "below" | "fair" | "slightlyHigh" | "high";

export function fairness(listed: number, predicted: number) {
  const diff = (listed - predicted) / predicted;   // >0 means listed above prediction
  let verdict: FairVerdict;
  if (diff < -0.10) verdict = "below";
  else if (diff <= 0.10) verdict = "fair";
  else if (diff <= 0.20) verdict = "slightlyHigh";
  else verdict = "high";
  return { diff, verdict };
}

export const VERDICT_META: Record<FairVerdict, { label: string; tone: "blue"|"green"|"amber"|"red" }> = {
  below:        { label: "Below market",  tone: "blue" },
  fair:         { label: "Fair price",    tone: "green" },
  slightlyHigh: { label: "Slightly high", tone: "amber" },
  high:         { label: "Above fair",    tone: "red" },
};
```

## `src/types/index.ts`
Export shared DTO types (a `ListingDTO` that mirrors the Prisma model but is safe to send to the client, `PredictInput` re-exported from `lib/ml/predict`, etc.). Keep server-only fields (passwordHash) out of anything sent to the client.

## Principles
- Every route handler that takes input calls the matching Zod schema first and returns 400 on failure.
- Never send `passwordHash` to the client.
- Keep money as integers (NPR), format only at the edge with `npr()`.
