"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { npr } from "@/lib/format";
import Spinner from "@/components/ui/Spinner";

type Listing = {
  id: string;
  title: string;
  area: string;
  city: string;
  roomType: string;
  rent: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date | string;
  _count: { listings: number };
};

export default function AdminTables({
  listings,
  users,
}: {
  listings: Listing[];
  users: UserRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"listings" | "users">("listings");
  const [busy, setBusy] = useState<string | null>(null);

  async function deleteListing(id: string) {
    if (!confirm("Delete listing?")) return;
    setBusy(id);
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete user (and their listings)?")) return;
    setBusy(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function setRole(id: string, role: string) {
    setBusy(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["listings", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-4 py-2 rounded-full ${
              tab === t
                ? "bg-[color:var(--color-primary)] text-white"
                : "bg-white border border-black/10"
            }`}
          >
            {t === "listings"
              ? `Listings · ${listings.length}`
              : `Users · ${users.length}`}
          </button>
        ))}
      </div>

      {tab === "listings" ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-canvas)] text-left">
              <tr>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Rent</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-t border-black/5">
                  <td className="p-4">
                    <Link
                      href={`/listings/${l.id}`}
                      className="text-[color:var(--color-primary)] font-medium"
                    >
                      {l.title}
                    </Link>
                  </td>
                  <td className="p-4">
                    {l.area}, {l.city} · {l.roomType}
                  </td>
                  <td className="p-4 font-medium">{npr(l.rent)}</td>
                  <td className="p-4">
                    <button
                      disabled={busy === l.id}
                      onClick={() => deleteListing(l.id)}
                      className="inline-flex items-center gap-1.5 text-red-700 text-xs font-medium hover:text-red-900 disabled:opacity-50"
                    >
                      {busy === l.id && <Spinner size="xs" />}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-canvas)] text-left">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Listings</Th>
                <Th>Role</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-black/5">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{u._count.listings}</td>
                  <td className="p-4">
                    <select
                      defaultValue={u.role}
                      disabled={busy === u.id}
                      onChange={(e) => setRole(u.id, e.target.value)}
                      className="border border-black/10 rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="SEEKER">SEEKER</option>
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      disabled={busy === u.id}
                      onClick={() => deleteUser(u.id)}
                      className="inline-flex items-center gap-1.5 text-red-700 text-xs font-medium hover:text-red-900 disabled:opacity-50"
                    >
                      {busy === u.id && <Spinner size="xs" />}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-4 text-[11px] uppercase tracking-wider text-[color:var(--color-muted)] font-medium">
      {children}
    </th>
  );
}
