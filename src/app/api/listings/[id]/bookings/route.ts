import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listBookingsForListing,
  myBookingForListing,
} from "@/controllers/bookingController";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/listings/:id/bookings
 *  - Seekers get { mine } — just their own booking on this listing (or null).
 *  - Listing owner / admin get { all, mine } — everyone's bookings.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ mine: null });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!listing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isPrivileged =
    listing.ownerId === session.user.id || session.user.role === "ADMIN";

  const mine = await myBookingForListing(id, session.user.id);
  if (!isPrivileged) return NextResponse.json({ mine });

  const all = await listBookingsForListing(id);
  return NextResponse.json({ mine, all });
}
