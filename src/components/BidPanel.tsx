"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { npr } from "@/lib/format";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Summary = {
  biddable: boolean;
  closesAt: string | null;
  startPrice: number;
  minIncrement: number;
  currentHighest: number | null;
  currentHighestBidderId: string | null;
  totalActiveBids: number;
  minNext: number;
  myBid: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  } | null;
};

type Props = {
  listingId: string;
  initialSummary: Summary;
  viewerId: string | null;
  isOwner: boolean;
  predictedRent: number;
};

const STATUS_TONE: Record<
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

function useCountdown(closesAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [closesAt]);
  if (!closesAt) return null;
  const target = new Date(closesAt).getTime();
  const ms = target - now;
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function BidPanel({
  listingId,
  initialSummary,
  viewerId,
  isOwner,
  predictedRent,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [amount, setAmount] = useState<number>(initialSummary.minNext);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown(summary.closesAt);

  const closed = countdown === "Closed";
  const canBid =
    !isOwner && !!viewerId && summary.biddable && !closed;

  const vsPredicted = useMemo(() => {
    const cmp = summary.currentHighest ?? summary.startPrice;
    return Math.round((cmp / predictedRent - 1) * 100);
  }, [summary, predictedRent]);

  async function refresh() {
    const r = await fetch(`/api/listings/${listingId}/bids`, {
      cache: "no-store",
    });
    if (r.ok) {
      const j = await r.json();
      setSummary(j.summary);
      setAmount(j.summary.minNext);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canBid) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, message: message || "" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === "below_increment" || j?.error === "below_start") {
          setError(
            `Your bid must be at least ${npr(j.minNext ?? summary.minNext)}.`,
          );
        } else if (j?.error === "self_bid") {
          setError("You can't bid on your own listing.");
        } else if (j?.error === "not_biddable") {
          setError("This listing is no longer accepting bids.");
        } else if (j?.error === "closed") {
          setError("Bidding on this listing has closed.");
        } else {
          setError("Could not place bid. Try again.");
        }
        return;
      }
      setMessage("");
      await refresh();
      router.refresh();
    } catch {
      setError("Network error placing bid.");
    } finally {
      setSubmitting(false);
    }
  }

  async function withdraw() {
    if (!summary.myBid) return;
    const ok = await confirm({
      title: "Withdraw your bid?",
      description: `This removes your active bid of ${npr(summary.myBid.amount)} from the listing. If you're currently winning, the next-highest bid becomes the winner.`,
      confirmLabel: "Withdraw bid",
      cancelLabel: "Keep bid",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/bids/${summary.myBid.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw" }),
    });
    if (res.ok) {
      await refresh();
      router.refresh();
    }
  }

  const myTone =
    summary.myBid && STATUS_TONE[summary.myBid.status]
      ? STATUS_TONE[summary.myBid.status]
      : null;
  const myBidActive =
    summary.myBid?.status === "WINNING" || summary.myBid?.status === "OUTBID";

  return (
    <div
      id="bid-panel"
      className="card p-6 border-2 border-[color:var(--color-primary)]/25 shadow-[0_16px_40px_-24px_rgba(14,110,110,0.4)] scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="mono">◈ Live bidding</div>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest rounded-full px-2.5 py-1 ${
            closed
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              closed ? "bg-red-500" : "bg-emerald-500 radar-pulse-dot"
            }`}
          />
          {closed ? "Closed" : "Accepting bids"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <MiniStat
          label="Current highest"
          value={
            summary.currentHighest !== null
              ? npr(summary.currentHighest)
              : "—"
          }
          sub={
            summary.currentHighest !== null
              ? `${vsPredicted >= 0 ? "+" : ""}${vsPredicted}% vs fair`
              : `Starts at ${npr(summary.startPrice)}`
          }
        />
        <MiniStat
          label="Bids so far"
          value={String(summary.totalActiveBids)}
          sub={`Step ${npr(summary.minIncrement)}`}
        />
        <MiniStat
          label="Min next bid"
          value={npr(summary.minNext)}
          sub={
            summary.currentHighest !== null
              ? "Higher than current + step"
              : "Starting bid"
          }
        />
        <MiniStat
          label={summary.closesAt ? "Closes in" : "Closing"}
          value={countdown ?? "Open"}
          sub={
            summary.closesAt
              ? new Date(summary.closesAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Owner will pick a winner"
          }
        />
      </div>

      {/* Viewer state */}
      {isOwner ? (
        <div className="mt-5 rounded-xl border border-black/5 bg-[color:var(--color-canvas)] px-4 py-3 text-sm">
          You&apos;re the owner of this listing. Manage incoming bids from your{" "}
          <a
            href="/dashboard/bids"
            className="text-[color:var(--color-primary-600)] font-medium underline underline-offset-2"
          >
            bids inbox
          </a>
          .
        </div>
      ) : !viewerId ? (
        <div className="mt-5">
          <a
            href={`/login?callbackUrl=${encodeURIComponent(`/listings/${listingId}#bid-panel`)}`}
            className="inline-flex items-center justify-center gap-2 w-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Place a bid · {npr(summary.minNext)}
            <span aria-hidden>→</span>
          </a>
          <p className="text-[11px] text-[color:var(--color-muted)] mt-2 text-center">
            You&apos;ll sign in first — we&apos;ll bring you right back here.
          </p>
        </div>
      ) : summary.myBid && myTone ? (
        <div
          className={`mt-5 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap ${myTone.bg} ${myTone.fg}`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${myTone.dot}`} />
            <span className="font-medium">
              Your bid · {npr(summary.myBid.amount)} · {myTone.label}
            </span>
          </div>
          {myBidActive && (
            <button
              onClick={withdraw}
              type="button"
              className="text-[11px] mono underline underline-offset-2 hover:opacity-80"
            >
              Withdraw
            </button>
          )}
        </div>
      ) : null}

      {/* Place-bid form */}
      {canBid && (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label className="text-xs mono">Your bid (NPR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
              min={summary.minNext}
              step={summary.minIncrement}
              required
              className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm font-mono tabular-nums"
            />
            <div className="text-[11px] text-[color:var(--color-muted)] mt-1">
              Must be at least {npr(summary.minNext)}.
            </div>
          </div>
          <div>
            <label className="text-xs mono">Message to owner · optional</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. I'm a working professional, can move in this month."
              className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <div className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={submitting}
          >
            {summary.myBid && myBidActive
              ? `Raise bid to ${npr(amount)}`
              : `Place bid · ${npr(amount)}`}
          </Button>
        </form>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-[color:var(--color-canvas)] border border-black/5 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold text-[color:var(--color-ink)] mt-0.5 truncate font-mono tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[color:var(--color-muted)] mt-0.5 truncate">
          {sub}
        </div>
      )}
    </div>
  );
}
