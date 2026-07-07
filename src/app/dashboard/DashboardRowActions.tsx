"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function DashboardRowActions({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function del() {
    const ok = await confirm({
      title: "Delete this listing?",
      description:
        "This will permanently remove the listing from your dashboard and from search results. This can't be undone.",
      confirmLabel: "Delete listing",
      tone: "danger",
    });
    if (!ok) return;
    setLoading(true);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      // keep spinner visible while server re-renders
      setTimeout(() => setLoading(false), 500);
    } else {
      setLoading(false);
      await confirm({
        title: "Couldn't delete",
        description:
          "Something went wrong on the server. Please try again in a moment.",
        confirmLabel: "OK",
        cancelLabel: "Close",
        tone: "danger",
      });
    }
  }

  return (
    <Button
      onClick={del}
      loading={loading}
      variant="danger"
      size="sm"
      aria-label="Delete listing"
    >
      Delete
    </Button>
  );
}
