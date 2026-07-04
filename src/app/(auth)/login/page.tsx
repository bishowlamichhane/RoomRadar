import LoginForm from "./LoginForm";
import Link from "next/link";
import AuthRadarPanel from "@/components/AuthRadarPanel";

export default function LoginPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <div className="rounded-3xl bg-white border border-black/5 shadow-[0_16px_40px_rgba(23,26,28,0.1)] overflow-hidden grid md:grid-cols-[240px_1fr] min-h-[540px]">
        <AuthRadarPanel
          eyebrow="RoomRadar"
          title="Welcome back"
          subtitle="to the radar"
        />

        <div className="p-8 md:p-10">
          <h1 className="font-display text-2xl font-semibold">Log in</h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-6">
            New here?{" "}
            <Link
              href="/register"
              className="text-[color:var(--color-primary)] font-semibold"
            >
              Create an account
            </Link>
          </p>

          <LoginForm />

          <div className="mt-6 border-t border-black/5 pt-5 text-xs text-[color:var(--color-muted)]">
            <div className="mono !text-[10px] mb-2">Demo accounts</div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <DemoLine role="Admin" email="admin@roomradar.np" pass="admin123" />
              <DemoLine role="Owner" email="owner@roomradar.np" pass="owner123" />
              <DemoLine role="Seeker" email="seeker@roomradar.np" pass="seeker123" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoLine({
  role,
  email,
  pass,
}: {
  role: string;
  email: string;
  pass: string;
}) {
  return (
    <div className="rounded-lg bg-[color:var(--color-canvas)] px-2.5 py-2">
      <div className="text-[color:var(--color-ink)] font-semibold">{role}</div>
      <div className="truncate">{email}</div>
      <div className="text-[color:var(--color-muted)]">/ {pass}</div>
    </div>
  );
}
