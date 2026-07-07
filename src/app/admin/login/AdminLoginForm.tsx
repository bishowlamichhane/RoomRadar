"use client";

import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Session is created — but this account may not be an admin. Verify role,
    // and if it's not ADMIN, sign the user right back out.
    const sess = await getSession();
    if (sess?.user?.role !== "ADMIN") {
      await signOut({ redirect: false });
      setLoading(false);
      setError("This account isn't authorised for the admin console.");
      return;
    }

    router.push("/admin");
    router.refresh();
    // Keep loading; destination's loading state takes over.
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mono !text-[10px] mb-1.5 block font-semibold text-[color:var(--color-muted)]">
          Admin email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="email"
          placeholder="admin@roomradar.np"
          className="w-full border border-[#DCE0DA] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--color-ink)] focus:ring-2 focus:ring-[color:var(--color-ink)]/15"
        />
      </div>

      <div>
        <label className="mono !text-[10px] mb-1.5 block font-semibold text-[color:var(--color-muted)]">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full border border-[#DCE0DA] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--color-ink)] focus:ring-2 focus:ring-[color:var(--color-ink)]/15"
        />
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="dark"
        size="lg"
        fullWidth
        loading={loading}
      >
        Enter admin console →
      </Button>
    </form>
  );
}
