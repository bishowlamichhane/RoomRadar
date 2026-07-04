"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function DashboardRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm("Delete this listing?")) return;
    setLoading(true);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      // keep spinner visible while server re-renders
      setTimeout(() => setLoading(false), 500);
    } else {
      setLoading(false);
      alert("Delete failed");
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
