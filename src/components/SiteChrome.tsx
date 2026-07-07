"use client";

import { usePathname } from "next/navigation";

/**
 * Hides its children on any /admin/* route so the admin console can render
 * its own header/footer. Wraps server components fine.
 */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
