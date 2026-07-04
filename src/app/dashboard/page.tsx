import { auth } from "@/lib/auth";
import { listingsByOwner } from "@/controllers/listingController";
import { redirect } from "next/navigation";
import Link from "next/link";
import { npr } from "@/lib/format";
import FairPriceBadge from "@/components/FairPriceBadge";
import { fairness } from "@/lib/fairPrice";
import DashboardRowActions from "./DashboardRowActions";
import { parseMedia, firstImage } from "@/lib/media";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const listings = await listingsByOwner(session.user.id);
  const fairCount = listings.filter((l) => {
    if (!l.predictedRent) return false;
    return fairness(l.rent, l.predictedRent).verdict === "fair";
  }).length;
  const fairRatio = listings.length
    ? Math.round((fairCount / listings.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="mono">Owner portal</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-[color:var(--color-muted)] mt-1">
            You have {listings.length} active listing{listings.length === 1 ? "" : "s"} on RoomRadar.
          </p>
        </div>
        <Link
          href="/listings/new"
          className="bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap"
        >
          + Post new listing
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-4 mb-8">
        <KpiCard
          tone="primary"
          label="Active listings"
          value={listings.length}
        />
        <KpiCard
          label="Fairly priced"
          value={`${fairRatio}%`}
          tone="tint"
        />
        <KpiCard
          label="Rooms below market"
          value={listings.filter((l) =>
            l.predictedRent
              ? fairness(l.rent, l.predictedRent).verdict === "below"
              : false,
          ).length}
        />
        <KpiCard
          label="Rooms above fair"
          value={listings.filter((l) =>
            l.predictedRent
              ? fairness(l.rent, l.predictedRent).verdict === "high"
              : false,
          ).length}
        />
      </div>

      {/* Listings table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold">My listings</h2>
      </div>

      {listings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[color:var(--color-muted)] mb-4">
            You haven&apos;t posted anything yet.
          </p>
          <Link
            href="/listings/new"
            className="inline-block bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Post your first room
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2.4fr_1fr_1.4fr_1.6fr] gap-4 px-5 py-3 bg-[color:var(--color-canvas)] text-[11px] uppercase tracking-wider font-semibold text-[color:var(--color-muted)]">
            <span>Listing</span>
            <span>Rent</span>
            <span>Fair status</span>
            <span className="text-right">Actions</span>
          </div>
          {listings.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-1 md:grid-cols-[2.4fr_1fr_1.4fr_1.6fr] gap-4 px-5 py-4 border-t border-black/5 items-center"
            >
              {/* Listing (thumb + title/meta) */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-[color:var(--color-primary-tint)] overflow-hidden flex-shrink-0">
                  {(() => {
                    const cover =
                      firstImage(parseMedia(l.mediaUrls)) ?? l.photoUrl;
                    return cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={l.title}
                        className="w-full h-full object-cover"
                      />
                    ) : null;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)] truncate">
                    {l.roomType} · {l.area}, {l.city}
                  </div>
                </div>
              </div>

              {/* Rent */}
              <div>
                <div className="font-display text-lg font-semibold">
                  {npr(l.rent)}
                </div>
                <div className="text-[11px] text-[color:var(--color-muted)]">
                  /month
                </div>
              </div>

              {/* Badge */}
              <div>
                {l.predictedRent && (
                  <FairPriceBadge
                    listed={l.rent}
                    predicted={l.predictedRent}
                    size="sm"
                  />
                )}
                {l.predictedRent && (
                  <div className="text-[11px] text-[color:var(--color-muted)] mt-1">
                    Predicted {npr(l.predictedRent)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 md:justify-end">
                <Link
                  href={`/listings/${l.id}`}
                  className="text-sm font-medium border border-black/10 hover:border-black/30 rounded-lg px-3 py-2 text-[color:var(--color-ink)]"
                >
                  View
                </Link>
                <Link
                  href={`/listings/${l.id}/edit`}
                  className="text-sm font-semibold bg-[color:var(--color-ink)] hover:bg-black text-white rounded-lg px-3 py-2"
                >
                  Edit
                </Link>
                <DashboardRowActions id={l.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "tint";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-gradient-to-br from-[#0e6e6e] to-[#0b4b4b] text-white border-transparent"
      : tone === "tint"
        ? "bg-gradient-to-br from-[#E1F0EF] to-[#CFE9E7] border-[#B9DAD8]"
        : "bg-white";
  const labelColor =
    tone === "primary"
      ? "text-white/80"
      : tone === "tint"
        ? "text-[color:var(--color-primary-600)]"
        : "text-[color:var(--color-muted)]";
  const valueColor = tone === "tint" ? "text-[color:var(--color-primary-600)]" : "";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className={`text-xs font-medium ${labelColor}`}>{label}</div>
      <div className={`font-display text-3xl font-semibold mt-2 ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
