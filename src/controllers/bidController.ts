import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import { placeBidSchema } from "@/lib/validations";

export const BID_STATUS = {
  WINNING: "WINNING",
  OUTBID: "OUTBID",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  EXPIRED: "EXPIRED",
} as const;

export type BidStatus = (typeof BID_STATUS)[keyof typeof BID_STATUS];

const TERMINAL: BidStatus[] = ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"];

type PlaceBidInput = z.infer<typeof placeBidSchema>;

export type PlaceBidError =
  | "listing_not_found"
  | "not_biddable"
  | "closed"
  | "self_bid"
  | "below_start"
  | "below_increment";

export type PlaceBidResult =
  | { ok: true; bidId: string }
  | { ok: false; error: PlaceBidError; minNext: number };

/**
 * Compute the minimum acceptable next bid.
 *  - At least `bidStartPrice ?? listing.rent`
 *  - At least currentHighest + bidMinIncrement (if any winning bid exists)
 */
export function computeMinNextBid(args: {
  rent: number;
  bidStartPrice: number | null;
  bidMinIncrement: number;
  currentHighest: number | null;
}): number {
  const floor = args.bidStartPrice ?? args.rent;
  if (args.currentHighest == null) return floor;
  return Math.max(floor, args.currentHighest + args.bidMinIncrement);
}

/**
 * Place a bid. Transactional: reads the listing + current highest, validates,
 * inserts the new bid as WINNING, flips the previous WINNING to OUTBID.
 *
 * We rely on the DB serializing writes for a single listing — SQLite/Postgres
 * with a short transaction is enough for demo-scale traffic. For heavier load
 * we would add SELECT ... FOR UPDATE on the listing row.
 */
export async function placeBid(
  listingId: string,
  bidderId: string,
  input: PlaceBidInput,
): Promise<PlaceBidResult> {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        rent: true,
        biddable: true,
        bidStartPrice: true,
        bidMinIncrement: true,
        bidsCloseAt: true,
        available: true,
      },
    });
    if (!listing) return { ok: false, error: "listing_not_found", minNext: 0 };
    if (!listing.biddable || !listing.available)
      return { ok: false, error: "not_biddable", minNext: 0 };
    if (listing.ownerId === bidderId)
      return { ok: false, error: "self_bid", minNext: 0 };
    if (listing.bidsCloseAt && listing.bidsCloseAt.getTime() < Date.now())
      return { ok: false, error: "closed", minNext: 0 };

    const current = await tx.bid.findFirst({
      where: { listingId, status: BID_STATUS.WINNING },
      orderBy: { amount: "desc" },
      select: { id: true, amount: true },
    });

    const minNext = computeMinNextBid({
      rent: listing.rent,
      bidStartPrice: listing.bidStartPrice,
      bidMinIncrement: listing.bidMinIncrement,
      currentHighest: current?.amount ?? null,
    });

    if (input.amount < minNext) {
      return {
        ok: false,
        error: current ? "below_increment" : "below_start",
        minNext,
      };
    }

    // Flip previous winner (if any) to OUTBID, then insert the new WINNING.
    if (current) {
      await tx.bid.update({
        where: { id: current.id },
        data: { status: BID_STATUS.OUTBID },
      });
    }
    const created = await tx.bid.create({
      data: {
        listingId,
        bidderId,
        amount: input.amount,
        message: input.message ? input.message : null,
        moveInDate:
          input.moveInDate && input.moveInDate !== ""
            ? new Date(input.moveInDate)
            : null,
        status: BID_STATUS.WINNING,
      },
      select: { id: true },
    });

    return { ok: true, bidId: created.id };
  });
}

export type BidActionError =
  | "bid_not_found"
  | "forbidden"
  | "already_terminal"
  | "not_winning";

export async function withdrawBid(bidId: string, bidderId: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    select: { id: true, bidderId: true, status: true, listingId: true },
  });
  if (!bid) return { ok: false as const, error: "bid_not_found" as const };
  if (bid.bidderId !== bidderId)
    return { ok: false as const, error: "forbidden" as const };
  if (TERMINAL.includes(bid.status as BidStatus))
    return { ok: false as const, error: "already_terminal" as const };

  await prisma.bid.update({
    where: { id: bidId },
    data: { status: BID_STATUS.WITHDRAWN },
  });

  // If we withdrew the winning bid, promote the next-highest OUTBID (if any).
  if (bid.status === BID_STATUS.WINNING) {
    const nextHighest = await prisma.bid.findFirst({
      where: { listingId: bid.listingId, status: BID_STATUS.OUTBID },
      orderBy: { amount: "desc" },
      select: { id: true },
    });
    if (nextHighest) {
      await prisma.bid.update({
        where: { id: nextHighest.id },
        data: { status: BID_STATUS.WINNING },
      });
    }
  }
  return { ok: true as const };
}

/**
 * Owner accepts a bid. Transactional: mark this bid ACCEPTED, reject the rest,
 * mark the listing unavailable + no longer biddable.
 */
export async function acceptBid(bidId: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({
      where: { id: bidId },
      select: {
        id: true,
        status: true,
        listingId: true,
        listing: { select: { ownerId: true } },
      },
    });
    if (!bid) return { ok: false as const, error: "bid_not_found" as const };
    if (bid.listing.ownerId !== ownerId)
      return { ok: false as const, error: "forbidden" as const };
    if (TERMINAL.includes(bid.status as BidStatus))
      return { ok: false as const, error: "already_terminal" as const };

    await tx.bid.update({
      where: { id: bidId },
      data: { status: BID_STATUS.ACCEPTED },
    });
    await tx.bid.updateMany({
      where: {
        listingId: bid.listingId,
        id: { not: bidId },
        status: { in: [BID_STATUS.WINNING, BID_STATUS.OUTBID] },
      },
      data: { status: BID_STATUS.REJECTED },
    });
    await tx.listing.update({
      where: { id: bid.listingId },
      data: { available: false, biddable: false },
    });
    return { ok: true as const };
  });
}

export async function rejectBid(bidId: string, ownerId: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      status: true,
      listingId: true,
      listing: { select: { ownerId: true } },
    },
  });
  if (!bid) return { ok: false as const, error: "bid_not_found" as const };
  if (bid.listing.ownerId !== ownerId)
    return { ok: false as const, error: "forbidden" as const };
  if (TERMINAL.includes(bid.status as BidStatus))
    return { ok: false as const, error: "already_terminal" as const };

  await prisma.bid.update({
    where: { id: bidId },
    data: { status: BID_STATUS.REJECTED },
  });

  // If we rejected the WINNING bid, promote the next-highest OUTBID.
  if (bid.status === BID_STATUS.WINNING) {
    const nextHighest = await prisma.bid.findFirst({
      where: { listingId: bid.listingId, status: BID_STATUS.OUTBID },
      orderBy: { amount: "desc" },
      select: { id: true },
    });
    if (nextHighest) {
      await prisma.bid.update({
        where: { id: nextHighest.id },
        data: { status: BID_STATUS.WINNING },
      });
    }
  }
  return { ok: true as const };
}

/** Owner view — every bid on a listing, newest first. */
export async function listBidsForListing(listingId: string) {
  return prisma.bid.findMany({
    where: { listingId },
    orderBy: [{ status: "asc" }, { amount: "desc" }, { createdAt: "desc" }],
    include: {
      bidder: { select: { id: true, name: true, email: true } },
    },
  });
}

/** Owner dashboard — every bid across every listing this owner owns. */
export async function listBidsForOwner(ownerId: string) {
  return prisma.bid.findMany({
    where: { listing: { ownerId } },
    orderBy: [{ createdAt: "desc" }],
    include: {
      bidder: { select: { id: true, name: true, email: true } },
      listing: {
        select: {
          id: true,
          title: true,
          area: true,
          city: true,
          rent: true,
          bidMinIncrement: true,
        },
      },
    },
  });
}

/**
 * Home-page spotlight — biddable, still-available listings with the current
 * highest bid (if any) attached. Limited count, ordered by whichever has the
 * most activity so the strip on the landing page feels alive.
 */
export async function listBiddableSpotlight(limit = 6) {
  const listings = await prisma.listing.findMany({
    where: { biddable: true, available: true },
    orderBy: { updatedAt: "desc" },
    take: limit * 2,
    select: {
      id: true,
      title: true,
      area: true,
      city: true,
      rent: true,
      photoUrl: true,
      mediaUrls: true,
      bidStartPrice: true,
      bidMinIncrement: true,
      bidsCloseAt: true,
      predictedRent: true,
    },
  });
  const withHighest = await Promise.all(
    listings.map(async (l) => {
      const [current, count] = await Promise.all([
        prisma.bid.findFirst({
          where: { listingId: l.id, status: BID_STATUS.WINNING },
          orderBy: { amount: "desc" },
          select: { amount: true },
        }),
        prisma.bid.count({
          where: {
            listingId: l.id,
            status: { in: [BID_STATUS.WINNING, BID_STATUS.OUTBID] },
          },
        }),
      ]);
      const minNext = computeMinNextBid({
        rent: l.rent,
        bidStartPrice: l.bidStartPrice,
        bidMinIncrement: l.bidMinIncrement,
        currentHighest: current?.amount ?? null,
      });
      return {
        ...l,
        currentHighest: current?.amount ?? null,
        totalActiveBids: count,
        minNext,
      };
    }),
  );
  // Rank by activity — hottest bids first.
  withHighest.sort((a, b) => b.totalActiveBids - a.totalActiveBids);
  return withHighest.slice(0, limit);
}

/** Seeker view — their bids across all listings. */
export async function listBidsForBidder(bidderId: string) {
  return prisma.bid.findMany({
    where: { bidderId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          area: true,
          city: true,
          rent: true,
          photoUrl: true,
          bidsCloseAt: true,
          biddable: true,
          available: true,
        },
      },
    },
  });
}

/**
 * Summary shape used by the listing detail's BidPanel: current highest,
 * total bids, whether the viewer is currently winning, min next bid.
 */
export async function getBidSummary(listingId: string, viewerId: string | null) {
  const [listing, current, count, myBid] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        rent: true,
        biddable: true,
        bidStartPrice: true,
        bidMinIncrement: true,
        bidsCloseAt: true,
        available: true,
      },
    }),
    prisma.bid.findFirst({
      where: { listingId, status: BID_STATUS.WINNING },
      orderBy: { amount: "desc" },
      select: {
        id: true,
        amount: true,
        bidderId: true,
        createdAt: true,
      },
    }),
    prisma.bid.count({
      where: {
        listingId,
        status: { in: [BID_STATUS.WINNING, BID_STATUS.OUTBID] },
      },
    }),
    viewerId
      ? prisma.bid.findFirst({
          where: { listingId, bidderId: viewerId },
          orderBy: { createdAt: "desc" },
          select: { id: true, amount: true, status: true, createdAt: true },
        })
      : Promise.resolve(null),
  ]);

  if (!listing) return null;

  const minNext = computeMinNextBid({
    rent: listing.rent,
    bidStartPrice: listing.bidStartPrice,
    bidMinIncrement: listing.bidMinIncrement,
    currentHighest: current?.amount ?? null,
  });

  return {
    biddable: listing.biddable && listing.available,
    closesAt: listing.bidsCloseAt ? listing.bidsCloseAt.toISOString() : null,
    startPrice: listing.bidStartPrice ?? listing.rent,
    minIncrement: listing.bidMinIncrement,
    currentHighest: current?.amount ?? null,
    currentHighestBidderId: current?.bidderId ?? null,
    totalActiveBids: count,
    minNext,
    myBid: myBid
      ? {
          id: myBid.id,
          amount: myBid.amount,
          status: myBid.status,
          createdAt: myBid.createdAt.toISOString(),
        }
      : null,
  };
}
