"use client";

import { useEffect, useState } from "react";
import { npr } from "@/lib/format";
import { BOOKING_FEE_NPR } from "@/lib/constants";
import Spinner from "@/components/ui/Spinner";

type MyBooking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED";
  paymentStatus: "UNPAID" | "AWAITING_PAYMENT" | "PAID";
  tourDate: string;
};

function defaultTourDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(15, 0, 0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function TourRequestPanel({
  listingId,
  title,
}: {
  listingId: string;
  title: string;
}) {
  const [tourDate, setTourDate] = useState(defaultTourDate);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<MyBooking | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}/bookings`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (alive) setLoaded(true);
          return;
        }
        const data = (await res.json()) as { mine: MyBooking | null };
        if (alive) {
          setMine(data.mine ?? null);
          setLoaded(true);
        }
      } catch {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const iso = new Date(tourDate).toISOString();
      const res = await fetch(`/api/listings/${listingId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourDate: iso }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not request tour");
        return;
      }
      setMine({
        id: body.bookingId,
        status: "PENDING",
        paymentStatus: "UNPAID",
        tourDate: iso,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function pay() {
    if (!mine) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${mine.id}/pay`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Payment failed");
        return;
      }
      // Server unlocks the map on next page load — refresh.
      window.location.reload();
    } finally {
      setPaying(false);
    }
  }

  if (!loaded) return null;

  if (mine) {
    return (
      <section className="card p-5">
        <div className="mono mb-2">Your tour request</div>
        <div className="font-display text-lg font-semibold mb-1">{title}</div>
        <div className="text-sm text-[color:var(--color-muted)]">
          Requested for {new Date(mine.tourDate).toLocaleString()}
        </div>

        {mine.status === "PENDING" && (
          <p className="mt-3 text-sm text-[color:var(--color-ink)]/80">
            Tour requested — the owner will confirm or decline soon. You&apos;ll
            only pay {npr(BOOKING_FEE_NPR)} if they confirm your slot.
          </p>
        )}

        {mine.status === "CONFIRMED" && mine.paymentStatus !== "PAID" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              <span className="font-semibold text-[color:var(--color-primary-600)]">
                Confirmed by the owner.
              </span>{" "}
              Pay the {npr(BOOKING_FEE_NPR)} booking fee to lock your tour and
              unlock the exact map location.
            </p>
            <button
              onClick={pay}
              disabled={paying}
              className="inline-flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {paying && <Spinner size="xs" />}
              Pay {npr(BOOKING_FEE_NPR)} & unlock location
            </button>
            {error && (
              <div className="text-sm text-rose-600">{error}</div>
            )}
          </div>
        )}

        {mine.status === "CONFIRMED" && mine.paymentStatus === "PAID" && (
          <p className="mt-3 text-sm text-emerald-700 font-semibold">
            Paid — exact location is unlocked on the map above.
          </p>
        )}

        {mine.status === "DECLINED" && (
          <p className="mt-3 text-sm text-rose-600">
            The owner declined this request. No charge was made.
          </p>
        )}

        {mine.status === "COMPLETED" && (
          <p className="mt-3 text-sm text-[color:var(--color-muted)]">
            Tour completed.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="mono mb-2">Book a tour</div>
      <div className="font-display text-lg font-semibold">
        Request to visit {title}
      </div>
      <p className="text-sm text-[color:var(--color-muted)] mt-1">
        Free to request. If the owner confirms your slot, you pay{" "}
        {npr(BOOKING_FEE_NPR)} to lock the tour and unlock the exact address.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-[color:var(--color-muted)]">
            Preferred date & time
          </span>
          <input
            type="datetime-local"
            required
            value={tourDate}
            onChange={(e) => setTourDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
          />
        </label>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-[color:var(--color-ink)] text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {submitting && <Spinner size="xs" />}
          Request a tour
        </button>
      </form>
    </section>
  );
}
