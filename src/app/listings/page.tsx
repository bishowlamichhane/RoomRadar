import { listListings } from "@/controllers/listingController";
import ListingCard from "@/components/ListingCard";
import SearchFilters from "@/components/SearchFilters";
import MapLoader from "@/components/MapLoader";
import { searchSchema } from "@/lib/validations";
import { serializeListings } from "@/lib/location";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const parsed = searchSchema.safeParse({
    city: sp.city,
    area: sp.area,
    roomType: sp.roomType,
    minRent: sp.minRent,
    maxRent: sp.maxRent,
    amenities: Array.isArray(sp.amenities)
      ? sp.amenities
      : sp.amenities
        ? [sp.amenities]
        : undefined,
  });
  const rawListings = await listListings(parsed.success ? parsed.data : {});
  const session = await auth();
  const viewer = session?.user
    ? { id: session.user.id, role: session.user.role ?? "SEEKER" }
    : null;
  const listings = await serializeListings(rawListings, viewer);

  const mapListings = listings.map((l) => ({
    id: l.id,
    title: l.title,
    latitude: l.latitude,
    longitude: l.longitude,
    rent: l.rent,
    area: l.area,
    city: l.city,
  }));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-6 sm:py-8">
      <div className="mb-6">
        <div className="mono">Explore</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          Find your next room
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          {listings.length} listings across Kathmandu, Lalitpur & Bhaktapur.
        </p>
      </div>

      <SearchFilters />

      <div className="grid gap-6 lg:grid-cols-5 mt-8">
        <div className="lg:col-span-3 space-y-5">
          {listings.length === 0 ? (
            <div className="card p-8 text-center text-[color:var(--color-muted)]">
              No rooms match your filters. Try widening your search.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] h-[420px]">
          <MapLoader listings={mapListings} />
        </div>
      </div>
    </div>
  );
}
