import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listBidsForOwner } from "@/controllers/bidController";
import { npr } from "@/lib/format";
import BidRowActions from "@/components/BidRowActions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  string,
  { bg: string; fg: string; dot: string; label: string }
> = {
  WINNING: {
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Winning",
  },
  OUTBID: {
    bg: "bg-amber-100",
    fg: "text-amber-800",
    dot: "bg-amber-500",
    label: "Outbid",
  },
  ACCEPTED: {
    bg: "bg-[color:var(--color-primary-tint)]",
    fg: "text-[color:var(--color-primary-600)]",
    dot: "bg-[color:var(--color-primary)]",
    label: "Accepted",
  },
  REJECTED: {
    bg: "bg-red-100",
    fg: "text-red-700",
    dot: "bg-red-500",
    label: "Rejected",
  },
  WITHDRAWN: {
    bg: "bg-black/5",
    fg: "text-[color:var(--color-muted)]",
    dot: "bg-[color:var(--color-muted)]",
    label: "Withdrawn",
  },
  EXPIRED: {
    bg: "bg-black/5",
    fg: "text-[color:var(--color-muted)]",
    dot: "bg-[color:var(--color-muted)]",
    label: "Expired",
  },
};

export default async function OwnerBidsInboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "SEEKER") redirect("/bids");
  if (session.user.role === "ADMIN") redirect("/admin");

  const bids = await listBidsForOwner(session.user.id);
  const active = bids.filter(
    (b) => b.status === "WINNING" || b.status === "OUTBID",
  );
  const settled = bids.filter(
    (b) => b.status !== "WINNING" && b.status !== "OUTBID",
  );
  const totalHighestSum = active
    .filter((b) => b.status === "WINNING")
    .reduce((sum, b) => sum + b.amount, 0);

  // Group active bids by listing so the owner can see the leaderboard per listing.
  const byListing = new Map<
    string,
    { listing: (typeof active)[number]["listing"]; bids: typeof active }
  >();
  for (const b of active) {
    const cur = byListing.get(b.listing.id);
    if (cur) cur.bids.push(b);
    else byListing.set(b.listing.id, { listing: b.listing, bids: [b] });
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono">Owner portal · bidding</div>
          <h1 className="font-display text-3xl font-semibold text-[color:var(--color-ink)]">
            Bids on your listings
          </h1>
          <p className="text-[color:var(--color-muted)] text-sm mt-1 max-w-xl">
            Review live offers across every listing that&apos;s accepting bids.
            Accepting a bid closes bidding on that listing and marks it as
            taken.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
        >
          ← Back to dashboard
        </Link>
      </header>

      {/* KPI strip — same shape as admin/health BigStats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Total bids" value={String(bids.length)} />
        <BigStat label="Active bids" value={String(active.length)} />
        <BigStat
          label="Listings receiving bids"
          value={String(byListing.size)}
        />
        <BigStat
          label="Winning total"
          value={npr(totalHighestSum)}
        />
      </section>

      {/* Active leaderboards per listing */}
      <section className="space-y-6">
        <div className="mono">◈ Active bidding · per listing</div>
        {byListing.size === 0 ? (
          <div className="card p-10 text-center text-[color:var(--color-muted)]">
            No active bids yet. When seekers place bids on your biddable
            listings, they&apos;ll show up here.
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(byListing.values()).map(({ listing, bids: list }) => {
              const sorted = [...list].sort((a, b) => b.amount - a.amount);
              const highest = sorted[0];
              return (
                <div key={listing.id} className="card p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="font-display text-lg font-semibold text-[color:var(--color-ink)] hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
                        ◎ {listing.area}, {listing.city} · Listed{" "}
                        {npr(listing.rent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-semibold">
                        Highest bid
                      </div>
                      <div className="font-display text-2xl font-semibold text-[color:var(--color-primary-600)] font-mono tabular-nums">
                        {npr(highest.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                          <th className="pb-2 pr-3">Bidder</th>
                          <th className="pb-2 pr-3 text-right">Amount</th>
                          <th className="pb-2 pr-3">Status</th>
                          <th className="pb-2 pr-3">Placed</th>
                          <th className="pb-2 pr-3">Message</th>
                          <th className="pb-2 pr-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => {
                          const tone =
                            STATUS_META[b.status] ?? STATUS_META.WITHDRAWN;
                          return (
                            <tr
                              key={b.id}
                              className="border-t border-black/5 align-top"
                            >
                              <td className="py-3 pr-3">
                                <div className="text-sm font-medium text-[color:var(--color-ink)]">
                                  {b.bidder.name}
                                </div>
                                <div className="text-[11px] text-[color:var(--color-muted)]">
                                  {b.bidder.email}
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-right font-mono tabular-nums font-semibold">
                                {npr(b.amount)}
                              </td>
                              <td className="py-3 pr-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest rounded-full px-2 py-0.5 ${tone.bg} ${tone.fg}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
                                  />
                                  {tone.label}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-[11px] text-[color:var(--color-muted)] whitespace-nowrap">
                                {new Date(b.createdAt).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>
                              <td className="py-3 pr-3 text-[12px] text-[color:var(--color-ink)]/80 max-w-sm">
                                {b.message ?? (
                                  <span className="text-[color:var(--color-muted)] italic">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-3 pr-3 text-right">
                                <BidRowActions
                                  bidId={b.id}
                                  variant="owner"
                                  status={b.status}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Settled bids */}
      {settled.length > 0 && (
        <section className="card p-6">
          <div className="mono mb-3">◈ Settled bids</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                  <th className="pb-2 pr-3">Listing</th>
                  <th className="pb-2 pr-3">Bidder</th>
                  <th className="pb-2 pr-3 text-right">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Settled</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((b) => {
                  const tone = STATUS_META[b.status] ?? STATUS_META.WITHDRAWN;
                  return (
                    <tr key={b.id} className="border-t border-black/5">
                      <td className="py-3 pr-3">
                        <Link
                          href={`/listings/${b.listing.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {b.listing.title}
                        </Link>
                        <div className="text-[11px] text-[color:var(--color-muted)]">
                          {b.listing.area}, {b.listing.city}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-sm">
                        {b.bidder.name}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums">
                        {npr(b.amount)}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest rounded-full px-2 py-0.5 ${tone.bg} ${tone.fg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
                          />
                          {tone.label}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-[11px] text-[color:var(--color-muted)] whitespace-nowrap">
                        {new Date(b.updatedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--color-canvas)] border border-black/5 px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-semibold">
        {label}
      </div>
      <div className="text-[15px] font-semibold text-[color:var(--color-ink)] mt-1 truncate font-mono tabular-nums">
        {value}
      </div>
    </div>
  );
}
