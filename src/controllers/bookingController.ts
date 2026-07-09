import { prisma } from "@/lib/prisma";
import { notify } from "@/controllers/notificationController";
import {
  BOOKING_FEE_NPR,
  BOOKING_STATUS,
  COMMISSION_RATE,
  COMMISSION_STATUS,
  CONFIRM_HOLD_HOURS,
  NOTIFICATION_TYPE,
  PAYMENT_STATUS,
} from "@/lib/constants";
import { initiatePayment } from "@/lib/payments/esewa";
import type { z } from "zod";
import { bookingSchema } from "@/lib/validations";

type BookingInput = z.infer<typeof bookingSchema>;

export type BookingActionError =
  | "listing_not_found"
  | "booking_not_found"
  | "forbidden"
  | "self_booking"
  | "already_terminal"
  | "not_awaiting_payment"
  | "payment_failed";

// ---- Lazy expiry ------------------------------------------------------------
// If a CONFIRMED booking sits in AWAITING_PAYMENT past CONFIRM_HOLD_HOURS,
// we quietly flip it back to PENDING/UNPAID and null out confirmedAt so the
// owner can pick someone else. Called on any read that might surface stale
// state. No cron — a booking never sees this if nobody looks at it.
async function reapExpired(listingId?: string) {
  const cutoff = new Date(
    Date.now() - CONFIRM_HOLD_HOURS * 60 * 60 * 1000,
  );
  const where = {
    status: BOOKING_STATUS.CONFIRMED,
    paymentStatus: PAYMENT_STATUS.AWAITING_PAYMENT,
    confirmedAt: { lt: cutoff },
    ...(listingId ? { listingId } : {}),
  };
  const stale = await prisma.booking.findMany({
    where,
    select: { id: true, listingId: true },
  });
  if (stale.length === 0) return;
  await prisma.booking.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: {
      status: BOOKING_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      confirmedAt: null,
    },
  });
  // Kill the commission rows recorded on the lapsed confirm.
  await prisma.commission.deleteMany({
    where: { bookingId: { in: stale.map((s) => s.id) } },
  });
}

// ---- Create -----------------------------------------------------------------
export async function requestTour(
  listingId: string,
  seekerId: string,
  input: BookingInput,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, title: true, area: true, city: true },
  });
  if (!listing) return { ok: false as const, error: "listing_not_found" as const };
  if (listing.ownerId === seekerId)
    return { ok: false as const, error: "self_booking" as const };

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        listingId,
        seekerId,
        tourDate: new Date(input.tourDate),
        status: BOOKING_STATUS.PENDING,
        bookingFee: BOOKING_FEE_NPR,
        paymentStatus: PAYMENT_STATUS.UNPAID,
      },
    });
    await notify(tx, {
      userId: listing.ownerId,
      type: NOTIFICATION_TYPE.TOUR_REQUEST,
      message: `New tour request for "${listing.title}" on ${new Date(b.tourDate).toLocaleString()}.`,
      bookingId: b.id,
    });
    return b;
  });
  return { ok: true as const, bookingId: booking.id };
}

// ---- Transitions ------------------------------------------------------------
export async function confirmBooking(bookingId: string, requesterId: string) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { ownerId: true, rent: true, title: true } },
      },
    });
    if (!b)
      return { ok: false as const, error: "booking_not_found" as const };
    if (b.listing.ownerId !== requesterId)
      return { ok: false as const, error: "forbidden" as const };
    if (b.status !== BOOKING_STATUS.PENDING)
      return { ok: false as const, error: "already_terminal" as const };

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.AWAITING_PAYMENT,
        confirmedAt: new Date(),
      },
    });
    // Record the platform commission as DUE (not force-collected). Rounded
    // to a whole rupee. Deleted if the confirmation later lapses.
    const commissionAmount = Math.round(b.listing.rent * COMMISSION_RATE);
    await tx.commission.create({
      data: {
        bookingId: b.id,
        listingId: b.listingId,
        amount: commissionAmount,
        status: COMMISSION_STATUS.DUE,
      },
    });
    await notify(tx, {
      userId: b.seekerId,
      type: NOTIFICATION_TYPE.TOUR_CONFIRMED_PAY,
      message: `The owner confirmed your tour for "${b.listing.title}". Pay Rs ${BOOKING_FEE_NPR} to lock your slot and unlock the exact location.`,
      bookingId: b.id,
    });
    return { ok: true as const };
  });
}

export async function declineBooking(bookingId: string, requesterId: string) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { ownerId: true, title: true } } },
    });
    if (!b)
      return { ok: false as const, error: "booking_not_found" as const };
    if (b.listing.ownerId !== requesterId)
      return { ok: false as const, error: "forbidden" as const };
    if (
      b.status !== BOOKING_STATUS.PENDING &&
      b.status !== BOOKING_STATUS.CONFIRMED
    )
      return { ok: false as const, error: "already_terminal" as const };

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BOOKING_STATUS.DECLINED },
    });
    // Wipe any commission row that got recorded on an earlier confirm.
    await tx.commission.deleteMany({ where: { bookingId: b.id } });
    await notify(tx, {
      userId: b.seekerId,
      type: NOTIFICATION_TYPE.TOUR_DECLINED,
      message: `Your tour request for "${b.listing.title}" was declined. No charge was made.`,
      bookingId: b.id,
    });
    return { ok: true as const };
  });
}

/**
 * Owner marks a tour COMPLETED after the visit. Commission flips DUE→PAYABLE;
 * any other still-pending requests on the same listing auto-DECLINE (owner
 * has moved on to this booking).
 */
export async function completeBooking(bookingId: string, requesterId: string) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { ownerId: true, title: true } } },
    });
    if (!b)
      return { ok: false as const, error: "booking_not_found" as const };
    if (b.listing.ownerId !== requesterId)
      return { ok: false as const, error: "forbidden" as const };
    if (b.status !== BOOKING_STATUS.CONFIRMED)
      return { ok: false as const, error: "already_terminal" as const };

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BOOKING_STATUS.COMPLETED },
    });
    await tx.commission.updateMany({
      where: { bookingId: b.id, status: COMMISSION_STATUS.DUE },
      data: { status: COMMISSION_STATUS.PAYABLE },
    });
    await tx.booking.updateMany({
      where: {
        listingId: b.listingId,
        id: { not: b.id },
        status: BOOKING_STATUS.PENDING,
      },
      data: { status: BOOKING_STATUS.DECLINED },
    });
    return { ok: true as const };
  });
}

// ---- Payment ----------------------------------------------------------------
export async function payForBooking(bookingId: string, seekerId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { title: true, ownerId: true } } },
  });
  if (!b) return { ok: false as const, error: "booking_not_found" as const };
  if (b.seekerId !== seekerId)
    return { ok: false as const, error: "forbidden" as const };
  if (
    b.status !== BOOKING_STATUS.CONFIRMED ||
    b.paymentStatus !== PAYMENT_STATUS.AWAITING_PAYMENT
  )
    return { ok: false as const, error: "not_awaiting_payment" as const };

  const init = await initiatePayment({
    amount: b.bookingFee,
    bookingId: b.id,
  });
  if (!init.ok)
    return { ok: false as const, error: "payment_failed" as const };

  // Mock mode → instant success, mark PAID + notify owner in one tx.
  if (init.mode === "mock") {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: b.id },
        data: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paymentRef: init.paymentRef,
        },
      });
      await notify(tx, {
        userId: b.listing.ownerId,
        type: NOTIFICATION_TYPE.TOUR_PAID,
        message: `A seeker paid Rs ${b.bookingFee} for their confirmed tour on "${b.listing.title}".`,
        bookingId: b.id,
      });
    });
    return { ok: true as const, mode: "mock" as const };
  }

  // Sandbox mode → hand off to eSewa; the callback route completes the tx.
  await prisma.booking.update({
    where: { id: b.id },
    data: { paymentRef: init.paymentRef },
  });
  return {
    ok: true as const,
    mode: "sandbox" as const,
    redirectUrl: init.redirectUrl,
    form: init.form,
  };
}

// ---- Queries ----------------------------------------------------------------
export async function listBookingsForSeeker(seekerId: string) {
  await reapExpired();
  return prisma.booking.findMany({
    where: { seekerId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          area: true,
          city: true,
          photoUrl: true,
          mediaUrls: true,
        },
      },
    },
  });
}

/**
 * Owner view — all bookings across every listing they own, plus a rollup
 * used by the dashboard KPIs.
 */
export async function listBookingsForOwner(ownerId: string) {
  await reapExpired();
  const bookings = await prisma.booking.findMany({
    where: { listing: { ownerId } },
    orderBy: { createdAt: "desc" },
    include: {
      seeker: { select: { id: true, name: true, email: true } },
      listing: {
        select: {
          id: true,
          title: true,
          area: true,
          city: true,
          rent: true,
        },
      },
      commission: true,
    },
  });
  return bookings;
}

/** The viewer's own booking on a specific listing, if any. */
export async function myBookingForListing(
  listingId: string,
  seekerId: string,
) {
  await reapExpired(listingId);
  return prisma.booking.findFirst({
    where: { listingId, seekerId },
    orderBy: { createdAt: "desc" },
  });
}

/** All pending/confirmed requests on a listing — for the owner's inbox. */
export async function listBookingsForListing(listingId: string) {
  await reapExpired(listingId);
  return prisma.booking.findMany({
    where: { listingId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      seeker: { select: { id: true, name: true, email: true } },
      commission: true,
    },
  });
}

/**
 * Earnings summary for a specific owner (or across the whole platform when
 * ownerId is null — used by admin). Returns DUE + PAYABLE totals.
 */
export async function earningsSummary(ownerId: string | null) {
  const rows = await prisma.commission.findMany({
    where: ownerId ? { listing: { ownerId } } : {},
    include: {
      booking: { select: { bookingFee: true, paymentStatus: true } },
      listing: { select: { title: true, rent: true, ownerId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const due = rows
    .filter((r) => r.status === COMMISSION_STATUS.DUE)
    .reduce((s, r) => s + r.amount, 0);
  const payable = rows
    .filter((r) => r.status === COMMISSION_STATUS.PAYABLE)
    .reduce((s, r) => s + r.amount, 0);
  const paidBookingFees = rows
    .filter((r) => r.booking.paymentStatus === PAYMENT_STATUS.PAID)
    .reduce((s, r) => s + r.booking.bookingFee, 0);
  return { rows, due, payable, paidBookingFees };
}
