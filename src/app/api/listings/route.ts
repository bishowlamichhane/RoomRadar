import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listingSchema, searchSchema } from "@/lib/validations";
import {
  listListings,
  createListing,
} from "@/controllers/listingController";
import { serializeListings } from "@/lib/location";

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
  const session = await auth();
  const viewer = session?.user
    ? { id: session.user.id, role: session.user.role ?? "SEEKER" }
    : null;
  const gated = await serializeListings(data, viewer);
  return NextResponse.json(gated);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const listing = await createListing(session.user.id, parsed.data);
  // Owner just created it, so it's unlocked for them by definition.
  return NextResponse.json(
    { ...listing, locationUnlocked: true, locationPrecise: true },
    { status: 201 },
  );
}
