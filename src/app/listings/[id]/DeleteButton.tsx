"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function DeleteButton({
  id,
  isAdmin,
}: {
  id: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm("Delete this listing?")) return;
    setLoading(true);
    const url = isAdmin ? `/api/admin/listings/${id}` : `/api/listings/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      router.push("/listings");
      router.refresh();
      // keep spinner visible until navigation finishes
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
      className="flex-1"
    >
      Delete
    </Button>
  );
}
