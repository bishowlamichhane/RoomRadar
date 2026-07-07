import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") redirect("/admin");

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-10 bg-[color:var(--color-canvas)]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_50px_-24px_rgba(23,26,28,0.35)] overflow-hidden">
          <div className="bg-[color:var(--color-ink)] text-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="mono !text-[10px] tracking-widest text-white/60">RoomRadar · Admin</div>
                <div className="font-display text-xl font-semibold">Admin console</div>
              </div>
            </div>
            <p className="text-white/70 text-sm mt-3">
              Restricted access. Only accounts with the ADMIN role can sign in here.
            </p>
          </div>
          <div className="p-6">
            <AdminLoginForm />
            <div className="mt-6 border-t border-black/5 pt-4 text-[11px] text-[color:var(--color-muted)]">
              Demo · admin@roomradar.np / admin123
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-[11px] text-[color:var(--color-muted)]">
          Not an admin?{" "}
          <Link href="/" className="text-[color:var(--color-primary)] font-medium">
            Return to RoomRadar
          </Link>
        </div>
      </div>
    </div>
  );
}
