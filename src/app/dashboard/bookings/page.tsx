import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listBookingsForOwner } from "@/controllers/bookingController";
import { npr } from "@/lib/format";
import { BOOKING_FEE_NPR, COMMISSION_RATE } from "@/lib/constants";
import BookingRowActions from "./BookingRowActions";

export const dynamic = "force-dynamic";

export default async function OwnerBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN")
    redirect("/bookings");

  const bookings = await listBookingsForOwner(session.user.id);
  const pending = bookings.filter((b) => b.status === "PENDING");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const other = bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "DECLINED",
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-6">
        <div className="mono">Tour requests</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          Who wants to see your rooms?
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          Confirmations trigger a {npr(BOOKING_FEE_NPR)} booking fee for the
          chosen seeker. A {Math.round(COMMISSION_RATE * 100)}% platform
          commission is recorded on the listing rent — collected honestly, not
          force-billed.
        </p>
      </div>

      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty text="No open requests." />
        ) : (
          pending.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              actions={<BookingRowActions id={b.id} showComplete={false} />}
            />
          ))
        )}
      </Section>

      <Section title={`Confirmed / awaiting payment (${confirmed.length})`}>
        {confirmed.length === 0 ? (
          <Empty text="No confirmed tours right now." />
        ) : (
          confirmed.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              actions={<BookingRowActions id={b.id} showComplete={true} />}
            />
          ))
        )}
      </Section>

      <Section title="History">
        {other.length === 0 ? (
          <Empty text="Nothing in the archive yet." />
        ) : (
          other.map((b) => <BookingRow key={b.id} booking={b} actions={null} />)
        )}
      </Section>

      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard"
          className="text-sm border border-black/10 hover:border-black/30 rounded-xl px-4 py-2.5"
        >
          ← Back to dashboard
        </Link>
        <Link
          href="/dashboard/earnings"
          className="text-sm bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-xl px-4 py-2.5 font-semibold"
        >
          View earnings & commission
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl font-semibold mb-3">{title}</h2>
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

type BookingWithRels = Awaited<
  ReturnType<typeof listBookingsForOwner>
>[number];

function BookingRow({
  booking,
  actions,
}: {
  booking: BookingWithRels;
  actions: React.ReactNode;
}) {
  const statusClass =
    booking.status === "PENDING"
      ? "bg-amber-100 text-amber-700"
      : booking.status === "CONFIRMED"
        ? booking.paymentStatus === "PAID"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-blue-100 text-blue-700"
        : booking.status === "COMPLETED"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700";
  const paymentBadge =
    booking.paymentStatus === "PAID"
      ? "Paid"
      : booking.paymentStatus === "AWAITING_PAYMENT"
        ? "Awaiting payment"
        : "Unpaid";

  return (
    <div className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-block text-[10px] font-mono uppercase tracking-widest rounded-full px-2 py-0.5 ${statusClass}`}
          >
            {booking.status}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--color-muted)]">
            · {paymentBadge}
          </span>
        </div>
        <div className="font-display text-lg font-semibold truncate">
          {booking.listing.title}
        </div>
        <div className="text-xs text-[color:var(--color-muted)]">
          {booking.listing.area}, {booking.listing.city} · Rent{" "}
          {npr(booking.listing.rent)}
        </div>
        <div className="text-sm mt-2">
          <span className="text-[color:var(--color-muted)]">Requested by</span>{" "}
          <span className="font-semibold">{booking.seeker.name}</span>{" "}
          <span className="text-[color:var(--color-muted)]">
            ({booking.seeker.email})
          </span>
        </div>
        <div className="text-sm">
          <span className="text-[color:var(--color-muted)]">Tour date:</span>{" "}
          {new Date(booking.tourDate).toLocaleString()}
        </div>
        {booking.commission && (
          <div className="text-xs text-[color:var(--color-primary-600)] mt-1">
            Commission {npr(booking.commission.amount)} ·{" "}
            {booking.commission.status}
          </div>
        )}
      </div>
      {actions && <div className="flex-none">{actions}</div>}
    </div>
  );
}
