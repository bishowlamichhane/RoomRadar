import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listBookingsForSeeker } from "@/controllers/bookingController";
import { npr } from "@/lib/format";
import { BOOKING_FEE_NPR } from "@/lib/constants";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

export default async function SeekerBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "OWNER") redirect("/dashboard/bookings");

  const bookings = await listBookingsForSeeker(session.user.id);
  const awaitingPay = bookings.filter(
    (b) => b.status === "CONFIRMED" && b.paymentStatus === "AWAITING_PAYMENT",
  );
  const active = bookings.filter(
    (b) => b.status === "CONFIRMED" && b.paymentStatus === "PAID",
  );
  const pending = bookings.filter((b) => b.status === "PENDING");
  const closed = bookings.filter(
    (b) => b.status === "DECLINED" || b.status === "COMPLETED",
  );

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <div className="mono">My tours</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          Your tour bookings
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          You&apos;re only charged when an owner confirms your slot — the
          booking fee is {npr(BOOKING_FEE_NPR)}. Once paid, the exact map
          location unlocks on the listing.
        </p>
      </div>

      {awaitingPay.length > 0 && (
        <Section
          tone="primary"
          title={`Pay to lock (${awaitingPay.length})`}
          subtitle="These slots were confirmed by the owner."
        >
          {awaitingPay.map((b) => (
            <BookingRow
              key={b.id}
              b={b}
              tail={<PayButton bookingId={b.id} />}
            />
          ))}
        </Section>
      )}

      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty text="No open requests." />
        ) : (
          pending.map((b) => <BookingRow key={b.id} b={b} />)
        )}
      </Section>

      <Section title={`Locked in (${active.length})`}>
        {active.length === 0 ? (
          <Empty text="Nothing paid & locked yet." />
        ) : (
          active.map((b) => (
            <BookingRow
              key={b.id}
              b={b}
              tail={
                <Link
                  href={`/listings/${b.listing.id}`}
                  className="text-sm border border-[color:var(--color-primary)]/30 text-[color:var(--color-primary-600)] hover:bg-[color:var(--color-primary-tint)] rounded-xl px-4 py-2"
                >
                  See exact location →
                </Link>
              }
            />
          ))
        )}
      </Section>

      <Section title="History">
        {closed.length === 0 ? (
          <Empty text="Nothing in your history yet." />
        ) : (
          closed.map((b) => <BookingRow key={b.id} b={b} />)
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "default" | "primary";
}) {
  return (
    <section className="mb-8">
      <h2
        className={`font-display text-xl font-semibold mb-1 ${
          tone === "primary" ? "text-[color:var(--color-primary-600)]" : ""
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-[color:var(--color-muted)] mb-3">
          {subtitle}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="card p-6 text-center text-sm text-[color:var(--color-muted)]">
      {text}
    </div>
  );
}

type BookingRow = Awaited<ReturnType<typeof listBookingsForSeeker>>[number];

function BookingRow({
  b,
  tail,
}: {
  b: BookingRow;
  tail?: React.ReactNode;
}) {
  const statusClass =
    b.status === "PENDING"
      ? "bg-amber-100 text-amber-700"
      : b.status === "CONFIRMED"
        ? b.paymentStatus === "PAID"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-blue-100 text-blue-700"
        : b.status === "COMPLETED"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700";
  return (
    <div className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-block text-[10px] font-mono uppercase tracking-widest rounded-full px-2 py-0.5 ${statusClass}`}
          >
            {b.status}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--color-muted)]">
            · {b.paymentStatus.replace("_", " ")}
          </span>
        </div>
        <Link
          href={`/listings/${b.listing.id}`}
          className="font-display text-lg font-semibold hover:text-[color:var(--color-primary-600)]"
        >
          {b.listing.title}
        </Link>
        <div className="text-xs text-[color:var(--color-muted)]">
          {b.listing.area}, {b.listing.city}
        </div>
        <div className="text-sm mt-1">
          Tour date: {new Date(b.tourDate).toLocaleString()}
        </div>
      </div>
      {tail && <div className="flex-none">{tail}</div>}
    </div>
  );
}
