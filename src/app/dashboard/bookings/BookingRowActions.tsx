"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";

export default function BookingRowActions({
  id,
  showComplete,
}: {
  id: string;
  showComplete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "confirm" | "decline" | "complete">(
    null,
  );

  async function act(action: "confirm" | "decline" | "complete") {
    setBusy(action);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error ?? "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!showComplete && (
        <>
          <button
            onClick={() => act("confirm")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy === "confirm" && <Spinner size="xs" />}
            Confirm
          </button>
          <button
            onClick={() => act("decline")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 border border-black/10 hover:border-black/30 rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy === "decline" && <Spinner size="xs" />}
            Decline
          </button>
        </>
      )}
      {showComplete && (
        <>
          <button
            onClick={() => act("complete")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 bg-[color:var(--color-ink)] text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy === "complete" && <Spinner size="xs" />}
            Mark completed
          </button>
          <button
            onClick={() => act("decline")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 border border-black/10 hover:border-black/30 rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy === "decline" && <Spinner size="xs" />}
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
