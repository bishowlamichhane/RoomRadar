import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listBidsForBidder } from "@/controllers/bidController";
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

export default async function MyBidsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const bids = await listBidsForBidder(session.user.id);
  const winning = bids.filter((b) => b.status === "WINNING").length;
  const outbid = bids.filter((b) => b.status === "OUTBID").length;
  const accepted = bids.filter((b) => b.status === "ACCEPTED").length;

  return (
    <div className="max-w-7xl mx-auto px-5 py-10 space-y-8">
      <header>
        <div className="mono">Bidding · seeker</div>
        <h1 className="font-display text-3xl font-semibold text-[color:var(--color-ink)]">
          My bids
        </h1>
        <p className="text-[color:var(--color-muted)] text-sm mt-1 max-w-xl">
          Every offer you&apos;ve placed on RoomRadar, with live status. When
          you get outbid, raise your offer from the listing page.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Total bids placed" value={String(bids.length)} />
        <BigStat label="Currently winning" value={String(winning)} />
        <BigStat label="Outbid" value={String(outbid)} />
        <BigStat label="Accepted by owner" value={String(accepted)} />
      </section>

      {bids.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mono mb-2">◈ No bids yet</div>
          <p className="text-[color:var(--color-muted)] text-sm mb-5">
            Browse listings marked as <em>Accepting bids</em> and place your
            offer — you&apos;ll see it here.
          </p>
          <Link
            href="/listings"
            className="inline-block bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Browse listings →
          </Link>
        </div>
      ) : (
        <section className="card p-6">
          <div className="mono mb-3">◈ Bid history</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                  <th className="pb-2 pr-3">Listing</th>
                  <th className="pb-2 pr-3 text-right">Your bid</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Placed</th>
                  <th className="pb-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => {
                  const tone = STATUS_META[b.status] ?? STATUS_META.WITHDRAWN;
                  return (
                    <tr key={b.id} className="border-t border-black/5 align-top">
                      <td className="py-3 pr-3">
                        <Link
                          href={`/listings/${b.listing.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {b.listing.title}
                        </Link>
                        <div className="text-[11px] text-[color:var(--color-muted)]">
                          ◎ {b.listing.area}, {b.listing.city} · Listed{" "}
                          {npr(b.listing.rent)}
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
                        {new Date(b.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <BidRowActions
                          bidId={b.id}
                          variant="bidder"
                          status={b.status}
                        />
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
