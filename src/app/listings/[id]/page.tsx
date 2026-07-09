import { getListing } from "@/controllers/listingController";
import { getBidSummary } from "@/controllers/bidController";
import { notFound } from "next/navigation";
import { npr } from "@/lib/format";
import { fairness, VERDICT_META } from "@/lib/fairPrice";
import FairPriceBadge from "@/components/FairPriceBadge";
import MapLoader from "@/components/MapLoader";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AMENITIES, APPROX_RADIUS_M } from "@/lib/constants";
import DeleteButton from "./DeleteButton";
import BidPanel from "@/components/BidPanel";
import {
  parseMedia,
  firstVideo,
  type MediaItem,
} from "@/lib/media";
import ListingGallery from "@/components/ListingGallery";
import { serializeListing } from "@/lib/location";
import TourRequestPanel from "@/components/TourRequestPanel";

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawListing = await getListing(id);
  if (!rawListing) notFound();
  const session = await auth();
  const isOwner = session?.user?.id === rawListing.ownerId;
  const isAdmin = session?.user?.role === "ADMIN";
  const viewer = session?.user
    ? { id: session.user.id, role: session.user.role ?? "SEEKER" }
    : null;
  const listing = await serializeListing(rawListing, viewer);
  const predicted = listing.predictedRent ?? listing.rent;
  const bidSummary = listing.biddable
    ? await getBidSummary(listing.id, session?.user?.id ?? null)
    : null;
  const { diff, verdict } = fairness(listing.rent, predicted);
  const meta = VERDICT_META[verdict];

  const pos = Math.min(100, Math.max(0, 50 + diff * 100));
  const media = parseMedia(listing.mediaUrls);
  const galleryItems: MediaItem[] = media.filter((m) => m.type === "image");
  if (galleryItems.length === 0 && listing.photoUrl) {
    galleryItems.push({ url: listing.photoUrl, type: "image" });
  }
  const videoUrl = firstVideo(media);

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <Link
        href="/listings"
        className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
      >
        ← Back to explore
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3">
        {/* Left: main */}
        <div className="lg:col-span-2 space-y-6">
          <ListingGallery items={galleryItems} title={listing.title} />

          {videoUrl && (
            <div className="rounded-2xl overflow-hidden border border-black/5 bg-black">
              <video
                src={videoUrl}
                controls
                playsInline
                className="w-full aspect-video"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-[color:var(--color-muted)] mb-1">
                ◎ {listing.area}, {listing.city}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold">
                {listing.title}
              </h1>
              {bidSummary && (
                <a
                  href="#bid-panel"
                  className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-[color:var(--color-primary-tint)] border border-[color:var(--color-primary)]/25 hover:border-[color:var(--color-primary)]/45 text-[color:var(--color-primary-600)] text-xs font-semibold transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] radar-pulse-dot" />
                  Accepting bids · Place a bid ↓
                </a>
              )}
            </div>
            <FairPriceBadge
              listed={listing.rent}
              predicted={predicted}
              size="md"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Fact label="Type" value={listing.roomType} />
            <Fact label="Size" value={`${listing.sizeSqft} sq ft`} />
            <Fact
              label="Floor"
              value={`${listing.floor}${listing.floor === 0 ? " (ground)" : ""}`}
            />
            <Fact
              label="Beds"
              value={`${listing.bedrooms} · ${listing.bathrooms} bath`}
            />
          </div>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">
              About this room
            </h2>
            <p className="text-[color:var(--color-ink)]/80 leading-relaxed text-[15px]">
              {listing.description ??
                "A comfortable rental in the Kathmandu Valley."}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">
              Amenities
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITIES.map((a) => {
                const on = listing[a.key as keyof typeof listing] as boolean;
                return (
                  <div
                    key={a.key}
                    className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
                      on
                        ? "bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary-600)]"
                        : "bg-black/5 text-[color:var(--color-muted)] line-through"
                    }`}
                  >
                    <span>{on ? "✓" : "—"}</span>
                    {a.label}
                  </div>
                );
              })}
              <div
                className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
                  listing.furnished
                    ? "bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary-600)]"
                    : "bg-black/5 text-[color:var(--color-muted)]"
                }`}
              >
                <span>{listing.furnished ? "✓" : "—"}</span>
                Furnished
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">
              Where it is
            </h2>
            <div className="h-72 rounded-2xl overflow-hidden relative">
              <MapLoader
                listings={[
                  {
                    id: listing.id,
                    title: listing.title,
                    latitude: listing.latitude,
                    longitude: listing.longitude,
                    rent: listing.rent,
                    area: listing.area,
                    city: listing.city,
                  },
                ]}
                center={{ lat: listing.latitude, lng: listing.longitude }}
                zoom={listing.locationUnlocked ? 15 : 13}
                approxCircle={
                  listing.locationUnlocked
                    ? undefined
                    : {
                        lat: listing.latitude,
                        lng: listing.longitude,
                        radiusM: APPROX_RADIUS_M,
                      }
                }
              />
              {!listing.locationUnlocked && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-white/95 backdrop-blur border border-black/10 px-4 py-3 text-xs text-[color:var(--color-ink)] shadow-sm">
                  <div className="font-semibold text-[color:var(--color-primary-600)]">
                    Approximate area shown
                  </div>
                  <div className="text-[color:var(--color-muted)] mt-0.5">
                    Exact location unlocks after your tour booking is
                    confirmed and paid.
                  </div>
                </div>
              )}
            </div>
          </section>

          {session?.user && !isOwner && !isAdmin && (
            <TourRequestPanel
              listingId={listing.id}
              title={listing.title}
            />
          )}
        </div>

        {/* Right: pricing panel */}
        <aside className="space-y-5">
          <div
            className={`card p-6 ${
              // Sticky is nice on non-biddable listings (keeps the price
              // panel visible while scrolling), but with a BidPanel sibling
              // below it the sticky card stays pinned while the BidPanel
              // scrolls up over it. Drop sticky whenever there's a sibling.
              bidSummary ? "" : "sticky top-24"
            }`}
          >
            {bidSummary && (
              <a
                href="#bid-panel"
                className="mb-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 bg-[color:var(--color-primary-tint)] border border-[color:var(--color-primary)]/25 hover:border-[color:var(--color-primary)]/45 transition-colors group"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[color:var(--color-primary)] radar-pulse-dot flex-none" />
                  <span className="text-[color:var(--color-primary-600)] font-semibold text-sm truncate">
                    Accepting bids
                    {bidSummary.currentHighest !== null && (
                      <span className="font-mono tabular-nums font-medium ml-1">
                        · top {npr(bidSummary.currentHighest)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-[color:var(--color-primary-600)] text-xs mono group-hover:translate-y-0.5 transition-transform">
                  Place a bid ↓
                </span>
              </a>
            )}
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-4xl font-semibold">
                  {npr(listing.rent)}
                </div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  /month
                </div>
              </div>
              <FairPriceBadge listed={listing.rent} predicted={predicted} />
            </div>

            <div className="mt-5 border-t border-black/5 pt-5">
              <div className="mono">◈ Fair-price analysis</div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-[color:var(--color-muted)]">
                    Listed
                  </div>
                  <div className="font-display text-xl font-semibold">
                    {npr(listing.rent)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[color:var(--color-muted)]">
                    Predicted fair
                  </div>
                  <div className="font-display text-xl font-semibold text-[color:var(--color-primary)]">
                    {npr(predicted)}
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[color:var(--color-ink)]"
                  style={{ left: `${pos}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
                <span>Great deal</span>
                <span>Fair</span>
                <span>Overpriced</span>
              </div>
              <p className="mt-4 text-sm text-[color:var(--color-muted)] leading-relaxed">
                {diff > 0.1 ? (
                  <>
                    <strong>
                      {Math.round(diff * 100)}% above
                    </strong>{" "}
                    the predicted market rent for similar {listing.roomType}s in{" "}
                    {listing.area}. Comparable listings average {npr(predicted)}
                    .
                  </>
                ) : diff < -0.1 ? (
                  <>
                    <strong>
                      {Math.round(-diff * 100)}% below
                    </strong>{" "}
                    the market — a solid deal for a {listing.roomType} in{" "}
                    {listing.area}.
                  </>
                ) : (
                  <>
                    This listing is <strong>{meta.label.toLowerCase()}</strong>{" "}
                    against comparable rooms in {listing.area}.
                  </>
                )}
              </p>
            </div>

            {(isOwner || isAdmin) && (
              <div className="mt-6 flex gap-2">
                {isOwner && (
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className="flex-1 bg-[color:var(--color-ink)] text-white text-sm font-medium rounded-xl px-4 py-2.5 text-center"
                  >
                    Edit
                  </Link>
                )}
                <DeleteButton
                  id={listing.id}
                  isAdmin={isAdmin}
                />
              </div>
            )}
          </div>

          {bidSummary && (
            <BidPanel
              listingId={listing.id}
              initialSummary={bidSummary}
              viewerId={session?.user?.id ?? null}
              isOwner={isOwner}
              predictedRent={predicted}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="mono">{label}</div>
      <div className="font-display text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

