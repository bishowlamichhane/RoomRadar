"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SEEKER" | "OWNER">("SEEKER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(
        j.error === "email_taken"
          ? "That email is already registered."
          : "Registration failed — check your inputs.",
      );
      setLoading(false);
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (sign?.error) {
      setLoading(false);
      router.push("/login");
      return;
    }
    router.push(role === "OWNER" ? "/dashboard" : "/listings");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <div className="mono !text-[11px] mb-2 font-semibold text-[color:var(--color-muted)]">
          I am a…
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <RoleCard
            icon="◎"
            title="Client"
            desc="Find a fair room"
            active={role === "SEEKER"}
            onClick={() => setRole("SEEKER")}
          />
          <RoleCard
            icon="▤"
            title="Owner"
            desc="List a property"
            active={role === "OWNER"}
            onClick={() => setRole("OWNER")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="Your name"
            className="input"
          />
        </FieldLabel>
        <FieldLabel label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+977 98…"
            className="input"
          />
        </FieldLabel>
      </div>

      <FieldLabel label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@email.com"
          className="input"
        />
      </FieldLabel>

      <FieldLabel label="Password">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="••••••••••"
          className="input"
        />
      </FieldLabel>

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
        Create account →
      </Button>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #dce0da;
          border-radius: 12px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(14, 110, 110, 0.15);
        }
      `}</style>
    </form>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mono !text-[11px] mb-1.5 block font-semibold text-[color:var(--color-muted)]">
        {label}
      </span>
      {children}
    </label>
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
      className={`text-left rounded-xl px-4 py-3.5 border-[1.5px] transition-colors relative ${
        active
          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary-tint)]"
          : "border-[#E7EAE5] bg-white hover:border-black/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl leading-none">{icon}</span>
        <span
          className={`w-4 h-4 rounded-full border-[1.5px] ${
            active
              ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]"
              : "border-[#DCE0DA]"
          }`}
        />
      </div>
      <div
        className={`font-semibold text-sm mt-2 ${
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
