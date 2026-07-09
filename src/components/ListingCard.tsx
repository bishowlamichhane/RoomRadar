import Link from "next/link";
import type { Listing } from "@prisma/client";
import { npr } from "@/lib/format";
import FairPriceBadge from "./FairPriceBadge";
import { parseMedia, firstImage, firstVideo } from "@/lib/media";

export default function ListingCard({ listing }: { listing: Listing }) {
  const perks: string[] = [];
  if (listing.roomType) perks.push(listing.roomType);
  if (listing.wifiReady) perks.push("Wi-Fi");
  if (listing.parking) perks.push("Parking");
  if (listing.attachedBathroom) perks.push("Attached bath");
  const line = perks.slice(0, 3).join(" · ");

  const media = parseMedia(listing.mediaUrls);
  const cover = firstImage(media) ?? listing.photoUrl;
  const hasVideo = !!firstVideo(media);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card overflow-hidden flex flex-col hover:-translate-y-0.5 transition-transform"
    >
      <div className="relative aspect-[4/3] bg-[color:var(--color-primary-tint)]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        )}
        <span className="absolute top-3 left-3 bg-white/95 text-[11px] font-medium rounded-full px-2.5 py-1 text-[color:var(--color-ink)]">
          ✓ Verified owner
        </span>
        {listing.biddable && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-[color:var(--color-primary)] text-white text-[10px] font-mono uppercase tracking-widest rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white radar-pulse-dot" />
            Accepting bids
          </span>
        )}
        {hasVideo && (
          <span className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-semibold rounded-full px-2 py-1 flex items-center gap-1">
            ▶ Video
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="text-[13px] text-[color:var(--color-muted)] flex items-center gap-1">
          <span>◎</span>
          <span>
            {listing.area}, {listing.city}
          </span>
        </div>
        <div className="font-display text-[17px] leading-tight font-semibold text-[color:var(--color-ink)]">
          {listing.title}
        </div>
        <div className="text-[12px] text-[color:var(--color-muted)]">{line}</div>
        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="font-display text-xl font-semibold text-[color:var(--color-ink)]">
              {npr(listing.rent)}
            </span>
            <span className="text-[12px] text-[color:var(--color-muted)] ml-1">/mo</span>
          </div>
          {listing.predictedRent && (
            <FairPriceBadge
              listed={listing.rent}
              predicted={listing.predictedRent}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
