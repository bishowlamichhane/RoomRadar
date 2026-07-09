"use client";

import { useState } from "react";
import { npr } from "@/lib/format";
import { BOOKING_FEE_NPR } from "@/lib/constants";
import Spinner from "@/components/ui/Spinner";

type SandboxResponse = {
  ok: true;
  mode: "sandbox";
  redirectUrl: string;
  form: Record<string, string>;
};

type MockResponse = { ok: true; mode: "mock" };
type ErrorResponse = { error?: string };

export default function PayButton({ bookingId }: { bookingId: string }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as
        | SandboxResponse
        | MockResponse
        | ErrorResponse;
      if (!res.ok || !("ok" in body)) {
        setError(
          ("error" in body && body.error) || "Payment failed. Try again.",
        );
        return;
      }
      if (body.mode === "sandbox") {
        // Auto-submit an off-DOM form to the eSewa redirect URL.
        const form = document.createElement("form");
        form.method = "POST";
        form.action = body.redirectUrl;
        for (const [k, v] of Object.entries(body.form)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={pay}
        disabled={paying}
        className="inline-flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {paying && <Spinner size="xs" />}
        Pay {npr(BOOKING_FEE_NPR)} & lock
      </button>
      {error && <div className="text-xs text-rose-600">{error}</div>}
    </div>
  );
}
