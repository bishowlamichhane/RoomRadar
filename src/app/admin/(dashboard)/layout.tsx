import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "./AdminNav";

async function adminSignOut() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="bg-[color:var(--color-canvas)] min-h-[calc(100vh-4rem)]">
      <div className="bg-[color:var(--color-ink)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="mono !text-[10px] tracking-widest text-white/60">
                RoomRadar · Admin console
              </div>
              <div className="font-display text-lg font-semibold truncate">
                {session.user.name ?? "Administrator"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white"
            >
              ← Back to site
            </Link>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
