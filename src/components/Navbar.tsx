"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

export default function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user;

  function handleSignOut() {
    setSigningOut(true);
    signOut({ callbackUrl: "/" });
  }

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] flex items-center justify-center relative">
            <span className="absolute inset-1 rounded-full border border-white/50" />
            <span className="absolute w-1.5 h-1.5 bg-white rounded-full" />
          </span>
          <span className="font-display text-xl font-semibold text-[color:var(--color-ink)]">
            RoomRadar
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-[color:var(--color-ink)]/80">
          <Link href="/listings" className="hover:text-[color:var(--color-primary)]">
            Explore
          </Link>
          <Link href="/results" className="hover:text-[color:var(--color-primary)]">
            How it works
          </Link>
          <Link href="/listings/new" className="hover:text-[color:var(--color-primary)]">
            Post a room
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-[color:var(--color-primary)] font-medium"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-sm text-[color:var(--color-ink)]/80 hover:text-[color:var(--color-primary)]"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 text-sm font-medium bg-[color:var(--color-ink)] text-white rounded-full px-4 py-2 hover:opacity-90 disabled:opacity-60"
              >
                {signingOut && <Spinner size="xs" />}
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-[color:var(--color-ink)]/80 hover:text-[color:var(--color-primary)]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-[color:var(--color-ink)] text-white rounded-full px-4 py-2 hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-black/5 bg-white px-5 py-4 flex flex-col gap-3 text-sm">
          <Link href="/listings" onClick={() => setOpen(false)}>
            Explore
          </Link>
          <Link href="/results" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/listings/new" onClick={() => setOpen(false)}>
            Post a room
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" onClick={() => setOpen(false)}>
                  Admin
                </Link>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                disabled={signingOut}
                className="inline-flex items-center gap-2 text-left disabled:opacity-60"
              >
                {signingOut && <Spinner size="xs" />}
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
