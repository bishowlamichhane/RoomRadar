"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function DeleteButton({
  id,
  isAdmin,
}: {
  id: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function del() {
    const ok = await confirm({
      title: "Delete this listing?",
      description:
        "This will permanently remove the listing and its photos from RoomRadar. This action can't be undone.",
      confirmLabel: "Delete listing",
      tone: "danger",
    });
    if (!ok) return;
    setLoading(true);
    const url = isAdmin ? `/api/admin/listings/${id}` : `/api/listings/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      router.push("/listings");
      router.refresh();
      // keep spinner visible until navigation finishes
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
      className="flex-1"
    >
      Delete
    </Button>
  );
}
