"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

type Role = "SEEKER" | "OWNER";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  // ?callbackUrl=/some/path[#anchor] — used when a user clicks "Place bid"
  // (or another gated CTA) while logged out. Same-origin paths only.
  const rawCallback = search.get("callbackUrl");
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") ? rawCallback : null;
  const [role, setRole] = useState<Role>("SEEKER");
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
    const dest = callbackUrl ?? (role === "OWNER" ? "/dashboard" : "/listings");
    router.push(dest);
    router.refresh();
    // Keep loading true — the destination's loading.tsx picks up the spinner.
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <div className="mono !text-[11px] mb-2 font-semibold text-[color:var(--color-muted)]">
          Sign in as
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <RoleCard
            icon="◎"
            title="Client"
            desc="Find & book a room"
            active={role === "SEEKER"}
            onClick={() => setRole("SEEKER")}
          />
          <RoleCard
            icon="▤"
            title="Owner"
            desc="Manage listings"
            active={role === "OWNER"}
            onClick={() => setRole("OWNER")}
          />
        </div>
      </div>

      <div>
        <label className="mono !text-[11px] mb-1.5 block font-semibold text-[color:var(--color-muted)]">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@email.com"
          className="w-full border border-[#DCE0DA] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
        />
      </div>

      <div>
        <label className="mono !text-[11px] mb-1.5 block font-semibold text-[color:var(--color-muted)]">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••••"
          className="w-full border border-[#DCE0DA] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
        />
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
      >
        Log in →
      </Button>
    </form>
  );
}

function RoleCard({
  icon,
  title,
  desc,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl px-4 py-3.5 border-[1.5px] transition-colors ${
        active
          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary-tint)]"
          : "border-[#E7EAE5] bg-white hover:border-black/20"
      }`}
    >
      <div className="text-xl leading-none">{icon}</div>
      <div
        className={`font-semibold text-sm mt-1.5 ${
          active ? "text-[color:var(--color-primary-600)]" : ""
        }`}
      >
        {title}
      </div>
      <div className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
        {desc}
      </div>
    </button>
  );
}
