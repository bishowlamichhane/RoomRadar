# 09 — Routes & Controllers

Route handlers are thin (parse → validate → call controller → respond). Controllers hold all DB/business logic and do authorization checks.

## Controllers

### `src/controllers/listingController.ts`
```ts
import { prisma } from "@/lib/prisma";
import { predictRent } from "@/lib/ml/predict";
import type { z } from "zod";
import { listingSchema, searchSchema } from "@/lib/validations";

type ListingInput = z.infer<typeof listingSchema>;
type SearchInput  = z.infer<typeof searchSchema>;

export async function listListings(filters: SearchInput) {
  const where: any = {};
  if (filters.city) where.city = filters.city;
  if (filters.area) where.area = filters.area;
  if (filters.roomType) where.roomType = filters.roomType;
  if (filters.minRent || filters.maxRent) {
    where.rent = {};
    if (filters.minRent) where.rent.gte = filters.minRent;
    if (filters.maxRent) where.rent.lte = filters.maxRent;
  }
  if (filters.amenities?.length) {
    for (const a of filters.amenities) where[a] = true;   // only allow known keys!
  }
  return prisma.listing.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function getListing(id: string) {
  return prisma.listing.findUnique({ where: { id }, include: { owner: { select: { id:true, name:true } } } });
}

export async function createListing(ownerId: string, data: ListingInput) {
  const predicted = predictRent(data as any);
  return prisma.listing.create({
    data: { ...data, description: data.description || null, photoUrl: data.photoUrl || null,
            predictedRent: predicted, ownerId },
  });
}

export async function updateListing(id: string, requesterId: string, isAdmin: boolean, data: ListingInput) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return { error: "not_found" as const };
  if (existing.ownerId !== requesterId && !isAdmin) return { error: "forbidden" as const };
  const predicted = predictRent(data as any);
  const updated = await prisma.listing.update({
    where: { id }, data: { ...data, description: data.description || null,
      photoUrl: data.photoUrl || null, predictedRent: predicted } });
  return { listing: updated };
}

export async function deleteListing(id: string, requesterId: string, isAdmin: boolean) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return { error: "not_found" as const };
  if (existing.ownerId !== requesterId && !isAdmin) return { error: "forbidden" as const };
  await prisma.listing.delete({ where: { id } });
  return { ok: true as const };
}

export async function listingsByOwner(ownerId: string) {
  return prisma.listing.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
}
```

### `src/controllers/userController.ts`
```ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { registerSchema } from "@/lib/validations";

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return { error: "email_taken" as const };
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
    select: { id:true, name:true, email:true, role:true },
  });
  return { user };
}

export async function listUsers() {
  return prisma.user.findMany({ select: { id:true, name:true, email:true, role:true, createdAt:true,
    _count: { select: { listings:true } } }, orderBy: { createdAt:"desc" } });
}

export async function setUserRole(id: string, role: string) {
  return prisma.user.update({ where:{id}, data:{role}, select:{id:true, role:true} });
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where:{id} });   // cascades listings
  return { ok:true as const };
}
```

### `src/controllers/predictController.ts`
```ts
import { predictRent, type PredictInput } from "@/lib/ml/predict";
export function predict(input: PredictInput) {
  return { predictedRent: predictRent(input) };
}
```

## Route handlers

### `src/app/api/register/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { registerUser } from "@/controllers/userController";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.flatten() }, { status: 400 });
  const res = await registerUser(parsed.data);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json(res.user, { status: 201 });
}
```

### `src/app/api/listings/route.ts`  (GET search, POST create)
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listingSchema, searchSchema } from "@/lib/validations";
import { listListings, createListing } from "@/controllers/listingController";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = {
    city: sp.get("city") ?? undefined,
    area: sp.get("area") ?? undefined,
    roomType: sp.get("roomType") ?? undefined,
    minRent: sp.get("minRent") ?? undefined,
    maxRent: sp.get("maxRent") ?? undefined,
    amenities: sp.getAll("amenities"),
  };
  const parsed = searchSchema.safeParse(raw);
  const data = await listListings(parsed.success ? parsed.data : {});
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  if ((session.user as any).role !== "OWNER" && (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error:"forbidden" }, { status:403 });
  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"invalid", issues: parsed.error.flatten() }, { status:400 });
  const listing = await createListing((session.user as any).id, parsed.data);
  return NextResponse.json(listing, { status:201 });
}
```

### `src/app/api/listings/[id]/route.ts`  (GET one, PATCH, DELETE)
- `GET` → `getListing(id)`; 404 if null.
- `PATCH` → auth required; validate with `listingSchema`; call `updateListing(id, userId, isAdmin, data)`; map `not_found`→404, `forbidden`→403.
- `DELETE` → auth required; call `deleteListing(...)`; same error mapping.
- Note: in Next 15, `params` is a Promise — `const { id } = await params;`.

### `src/app/api/predict/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { predictSchema } from "@/lib/validations";
import { predict } from "@/controllers/predictController";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = predictSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:"invalid" }, { status:400 });
  return NextResponse.json(predict(parsed.data as any));
}
```
(Predict is public — the post-listing form calls it live. That's fine; it leaks no data.)

### `src/app/api/admin/listings/[id]/route.ts`  (DELETE, admin)
- Require `session.user.role === "ADMIN"` (middleware also guards, but re-check).
- `deleteListing(id, adminId, true)`.

### `src/app/api/admin/users/[id]/route.ts`  (PATCH role / DELETE, admin)
- Require ADMIN.
- `PATCH` body `{ role }` (validate against ROLES) → `setUserRole`.
- `DELETE` → `deleteUser`. Guard against an admin deleting themselves if you like.

## Server-side data for pages
Pages that render server-side (home, detail, dashboard, admin, results) should import the controller functions **directly** (not fetch their own API) to avoid an extra round trip. The `/api/*` routes exist for client-side calls (predict, create/edit/delete from forms, admin actions).

## Error contract
Return JSON `{ error: "<code>" }` with correct status. Client shows friendly messages. Log server errors with `console.error` but never leak stack traces to the client.
