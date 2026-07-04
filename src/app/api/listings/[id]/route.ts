import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listingSchema } from "@/lib/validations";
import {
  getListing,
  updateListing,
  deleteListing,
} from "@/controllers/listingController";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(listing);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const res = await updateListing(
    id,
    session.user.id,
    session.user.role === "ADMIN",
    parsed.data,
  );
  if ("error" in res) {
    return NextResponse.json(
      { error: res.error },
      { status: res.error === "not_found" ? 404 : 403 },
    );
  }
  return NextResponse.json(res.listing);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await deleteListing(
    id,
    session.user.id,
    session.user.role === "ADMIN",
  );
  if ("error" in res) {
    return NextResponse.json(
      { error: res.error },
      { status: res.error === "not_found" ? 404 : 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
