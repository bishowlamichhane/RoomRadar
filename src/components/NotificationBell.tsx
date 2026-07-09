"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Notification = {
  id: string;
  type: string;
  message: string;
  bookingId: string | null;
  read: boolean;
  createdAt: string;
};

// Where each notification type points when clicked. Seekers land on /bookings,
// owners land on /dashboard/bookings; we resolve at click time by peeking at
// the session role. Fallback is /bookings.
function targetFor(role: string | undefined, type: string): string {
  if (role === "OWNER" || role === "ADMIN") {
    if (type === "TOUR_REQUEST" || type === "TOUR_PAID")
      return "/dashboard/bookings";
  }
  return "/bookings";
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const role = session?.user?.role;

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!session?.user) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [session?.user]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  if (!session?.user) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-black/5"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[color:var(--color-primary)] text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <div className="font-display font-semibold text-sm">
              Notifications
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-[11px] font-mono text-[color:var(--color-primary-600)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="p-6 text-sm text-[color:var(--color-muted)] text-center">
              No notifications yet.
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={targetFor(role, n.type)}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 text-sm border-b border-black/5 last:border-b-0 hover:bg-[color:var(--color-canvas)] ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] flex-none" />
                      )}
                      <div className="flex-1">
                        <div>{n.message}</div>
                        <div className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
