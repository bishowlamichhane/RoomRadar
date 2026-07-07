import { prisma } from "@/lib/prisma";
import { fairness, type FairVerdict } from "@/lib/fairPrice";

/**
 * Commission we treat as attributable revenue for RoomRadar. When a listing is
 * marked unavailable (rented via the platform), we book one-time commission
 * equal to `COMMISSION_PCT` of the listed monthly rent.
 */
export const COMMISSION_PCT = 0.05;

export type AdminOverview = {
  users: {
    total: number;
    owners: number;
    seekers: number;
    admins: number;
    newLast7d: number;
  };
  listings: {
    total: number;
    active: number;
    sold: number; // available === false
    conversionPct: number; // sold / total
    newLast7d: number;
  };
  revenue: {
    attributedNPR: number; // sum(rent * COMMISSION_PCT) over sold listings
    perListingAvgNPR: number;
    lastMonthNPR: number;
  };
  medians: {
    listedRent: number;
    predictedRent: number;
  };
  distribution: {
    byCity: { label: string; value: number }[];
    byRoomType: { label: string; value: number }[];
    byVerdict: { label: string; value: number; verdict: FairVerdict }[];
  };
  timeseries: {
    // last 8 weeks of counts
    weeks: { weekLabel: string; newListings: number; newSignups: number }[];
  };
};

const VERDICT_ORDER: FairVerdict[] = [
  "below",
  "fair",
  "slightlyHigh",
  "high",
];

const VERDICT_LABEL: Record<FairVerdict, string> = {
  below: "Below market",
  fair: "Fair price",
  slightlyHigh: "Slightly high",
  high: "Above fair",
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0..6, 0 = Sunday
  const shift = (day + 6) % 7; // Monday = start
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - shift);
  return out;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  const [users, listings, newUsers7, newListings7] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, role: true, createdAt: true },
    }),
    prisma.listing.findMany({
      select: {
        id: true,
        city: true,
        roomType: true,
        rent: true,
        predictedRent: true,
        available: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.listing.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const owners = users.filter((u) => u.role === "OWNER").length;
  const seekers = users.filter((u) => u.role === "SEEKER").length;
  const admins = users.filter((u) => u.role === "ADMIN").length;

  const active = listings.filter((l) => l.available).length;
  const sold = listings.length - active;

  const attributedNPR = listings
    .filter((l) => !l.available)
    .reduce((sum, l) => sum + l.rent * COMMISSION_PCT, 0);

  const lastMonthNPR = listings
    .filter(
      (l) => !l.available && l.updatedAt.getTime() >= thirtyDaysAgo.getTime(),
    )
    .reduce((sum, l) => sum + l.rent * COMMISSION_PCT, 0);

  const perListingAvgNPR = sold > 0 ? Math.round(attributedNPR / sold) : 0;

  const listedRentMedian = median(listings.map((l) => l.rent));
  const predictedMedian = median(
    listings
      .map((l) => l.predictedRent ?? 0)
      .filter((n) => n > 0),
  );

  // Distributions
  const byCityMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();
  const byVerdictMap = new Map<FairVerdict, number>();
  for (const v of VERDICT_ORDER) byVerdictMap.set(v, 0);

  for (const l of listings) {
    byCityMap.set(l.city, (byCityMap.get(l.city) ?? 0) + 1);
    byTypeMap.set(l.roomType, (byTypeMap.get(l.roomType) ?? 0) + 1);
    if (l.predictedRent) {
      const { verdict } = fairness(l.rent, l.predictedRent);
      byVerdictMap.set(verdict, (byVerdictMap.get(verdict) ?? 0) + 1);
    }
  }

  const byCity = [...byCityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const byRoomType = [...byTypeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const byVerdict = VERDICT_ORDER.map((v) => ({
    verdict: v,
    label: VERDICT_LABEL[v],
    value: byVerdictMap.get(v) ?? 0,
  }));

  // Timeseries: 8-week buckets
  const weekStart = startOfWeek(eightWeeksAgo);
  const buckets: {
    start: Date;
    label: string;
    newListings: number;
    newSignups: number;
  }[] = [];
  for (let i = 0; i < 8; i++) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + i * 7);
    buckets.push({
      start,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      newListings: 0,
      newSignups: 0,
    });
  }
  const bucketFor = (d: Date): number => {
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (d.getTime() >= buckets[i].start.getTime()) return i;
    }
    return -1;
  };
  for (const l of listings) {
    const idx = bucketFor(l.createdAt);
    if (idx >= 0) buckets[idx].newListings++;
  }
  for (const u of users) {
    const idx = bucketFor(u.createdAt);
    if (idx >= 0) buckets[idx].newSignups++;
  }

  return {
    users: {
      total: users.length,
      owners,
      seekers,
      admins,
      newLast7d: newUsers7,
    },
    listings: {
      total: listings.length,
      active,
      sold,
      conversionPct: listings.length ? sold / listings.length : 0,
      newLast7d: newListings7,
    },
    revenue: {
      attributedNPR: Math.round(attributedNPR),
      perListingAvgNPR,
      lastMonthNPR: Math.round(lastMonthNPR),
    },
    medians: {
      listedRent: listedRentMedian,
      predictedRent: predictedMedian,
    },
    distribution: { byCity, byRoomType, byVerdict },
    timeseries: {
      weeks: buckets.map((b) => ({
        weekLabel: b.label,
        newListings: b.newListings,
        newSignups: b.newSignups,
      })),
    },
  };
}
