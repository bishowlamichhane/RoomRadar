"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Props = {
  bidId: string;
  variant: "owner" | "bidder";
  status: string;
};

const IN_FLIGHT = ["WINNING", "OUTBID"];

const CONFIRM_COPY: Record<
  "accept" | "reject" | "withdraw",
  {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: "danger" | "primary";
  }
> = {
  accept: {
    title: "Accept this bid?",
    description:
      "All other bids on this listing will be rejected and the listing marked as taken. This can't be undone.",
    confirmLabel: "Accept bid",
    cancelLabel: "Cancel",
    tone: "primary",
  },
  reject: {
    title: "Reject this bid?",
    description:
      "The bidder will see their bid as rejected. If this is the current winner, the next-highest bid takes over.",
    confirmLabel: "Reject bid",
    cancelLabel: "Cancel",
    tone: "danger",
  },
  withdraw: {
    title: "Withdraw your bid?",
    description:
      "This removes your active bid from the listing. If you're currently winning, the next-highest bid becomes the winner.",
    confirmLabel: "Withdraw bid",
    cancelLabel: "Keep bid",
    tone: "danger",
  },
};

export default function BidRowActions({ bidId, variant, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  if (!IN_FLIGHT.includes(status)) return null;

  async function act(action: "accept" | "reject" | "withdraw") {
    if (busy) return;
    const ok = await confirm(CONFIRM_COPY[action]);
    if (!ok) return;
    setBusy(action);
    const res = await fetch(`/api/bids/${bidId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else {
      await confirm({
        title: "Action failed",
        description: "We couldn't update this bid. Please try again.",
        confirmLabel: "OK",
        cancelLabel: "",
        tone: "danger",
      });
    }
  }

  if (variant === "bidder") {
    return (
      <button
        type="button"
        onClick={() => act("withdraw")}
        disabled={busy !== null}
        className="text-[11px] mono underline underline-offset-2 hover:opacity-80 disabled:opacity-40"
      >
        {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => act("accept")}
        disabled={busy !== null}
        className="text-[11px] font-semibold bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
      >
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={busy !== null}
        className="text-[11px] font-medium border border-black/10 hover:border-black/30 rounded-lg px-3 py-1.5 text-[color:var(--color-ink)] disabled:opacity-40"
      >
        {busy === "reject" ? "…" : "Reject"}
      </button>
    </div>
  );
}
