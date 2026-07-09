import { AREA_COORDS, BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// Represents just the coordinate + gating fields we need from a listing.
// Kept structural (not a Prisma type) so both server-rendered and API paths
// can pass in plain objects.
export type CoordSource = {
  area: string;
  latitude: number;
  longitude: number;
};

export type VisibleLocation =
  | { lat: number; lng: number; precise: true }
  | { lat: number; lng: number; precise: false };

// Deterministic ~0-400m jitter derived from the coord itself so the fuzzed
// point is stable across requests (same viewer sees the same approx pin,
// not one that wanders every reload).
function fallbackApprox(lat: number, lng: number): { lat: number; lng: number } {
  const seed = Math.abs(Math.round((lat + lng) * 10000));
  const dLat = ((seed % 200) - 100) / 100000; // ~±0.001° ≈ ±110m
  const dLng = (((seed >> 3) % 200) - 100) / 100000;
  return {
    lat: Math.round((lat + dLat) * 1000) / 1000,
    lng: Math.round((lng + dLng) * 1000) / 1000,
  };
}

/**
 * Return either the exact coordinate or a deliberately approximate one for
 * public consumption. The approximate point is the area center from
 * AREA_COORDS when available; otherwise the real point rounded to ~3 decimals
 * with a small jitter (~400m). Callers MUST use this before emitting any
 * lat/lng to a client that doesn't own the listing.
 */
export function visibleLocation(
  listing: CoordSource,
  unlocked: boolean,
): VisibleLocation {
  if (unlocked) {
    return { lat: listing.latitude, lng: listing.longitude, precise: true };
  }
  const area = AREA_COORDS[listing.area];
  if (area) return { lat: area.lat, lng: area.lng, precise: false };
  const approx = fallbackApprox(listing.latitude, listing.longitude);
  return { lat: approx.lat, lng: approx.lng, precise: false };
}

export type Viewer = {
  id: string;
  role: string;
} | null;

/**
 * Determine which listing ids (from the given set) the viewer has unlocked
 * via a CONFIRMED + PAID booking. Owner/admin unlocks are handled per-row in
 * the serializer since they depend on the listing's ownerId.
 */
export async function unlockedByPaidBooking(
  viewerId: string,
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const rows = await prisma.booking.findMany({
    where: {
      seekerId: viewerId,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      listingId: { in: listingIds },
    },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}

// Minimal shape needed to gate a listing. Any Prisma Listing satisfies this.
type ListingLike = CoordSource & { id: string; ownerId: string };

/**
 * Compute per-listing unlock flags for a batch. Uses a single DB call to
 * find the viewer's paid bookings across the given listings.
 */
export async function unlockMap(
  viewer: Viewer,
  listings: ListingLike[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!viewer) {
    for (const l of listings) map.set(l.id, false);
    return map;
  }
  const isAdmin = viewer.role === "ADMIN";
  const paidSet = isAdmin
    ? new Set<string>()
    : await unlockedByPaidBooking(
        viewer.id,
        listings.map((l) => l.id),
      );
  for (const l of listings) {
    const unlocked =
      isAdmin || l.ownerId === viewer.id || paidSet.has(l.id);
    map.set(l.id, unlocked);
  }
  return map;
}

/**
 * Replace exact lat/lng with visible coords and add locationUnlocked flag.
 * MUST be applied to any listing payload leaving the server for a client.
 */
export function applyLocationGate<T extends ListingLike>(
  listing: T,
  unlocked: boolean,
): Omit<T, "latitude" | "longitude"> & {
  latitude: number;
  longitude: number;
  locationUnlocked: boolean;
  locationPrecise: boolean;
} {
  const vis = visibleLocation(listing, unlocked);
  return {
    ...listing,
    latitude: vis.lat,
    longitude: vis.lng,
    locationUnlocked: unlocked,
    locationPrecise: vis.precise,
  };
}

/**
 * Convenience — gate a whole batch, doing the unlock query once.
 */
export async function serializeListings<T extends ListingLike>(
  listings: T[],
  viewer: Viewer,
) {
  const map = await unlockMap(viewer, listings);
  return listings.map((l) => applyLocationGate(l, map.get(l.id) ?? false));
}

export async function serializeListing<T extends ListingLike>(
  listing: T,
  viewer: Viewer,
) {
  const [only] = await serializeListings([listing], viewer);
  return only;
}
