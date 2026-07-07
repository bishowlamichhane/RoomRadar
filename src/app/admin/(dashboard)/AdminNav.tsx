"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/health", label: "Health & analytics" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <nav className="flex gap-1 overflow-x-auto -mx-1 pb-0" aria-label="Admin sections">
        {TABS.map((t) => {
          const active =
            t.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`text-sm px-4 py-2.5 rounded-t-xl whitespace-nowrap transition-colors ${
                active
                  ? "bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
