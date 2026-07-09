import { prisma } from "@/lib/prisma";
import { predictRent, type PredictInput } from "@/lib/ml/predict";
import type { z } from "zod";
import { listingSchema, searchSchema } from "@/lib/validations";
import { AMENITY_KEYS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type ListingInput = z.infer<typeof listingSchema>;
type SearchInput = z.infer<typeof searchSchema>;

export async function listListings(filters: SearchInput) {
  const where: Prisma.ListingWhereInput = {};
  if (filters.city) where.city = filters.city;
  if (filters.area) where.area = filters.area;
  if (filters.roomType) where.roomType = filters.roomType;
  if (filters.minRent || filters.maxRent) {
    where.rent = {};
    if (filters.minRent) where.rent.gte = filters.minRent;
    if (filters.maxRent) where.rent.lte = filters.maxRent;
  }
  if (filters.amenities?.length) {
    for (const a of filters.amenities) {
      if (AMENITY_KEYS.includes(a)) {
        (where as Record<string, unknown>)[a] = true;
      }
    }
  }
  return prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true } } },
  });
}

function toPredictInput(data: ListingInput): PredictInput {
  return {
    city: data.city,
    area: data.area,
    roomType: data.roomType,
    sizeSqft: data.sizeSqft,
    floor: data.floor,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    furnished: data.furnished,
    waterSupply: data.waterSupply,
    parking: data.parking,
    attachedBathroom: data.attachedBathroom,
    wifiReady: data.wifiReady,
    kitchen: data.kitchen,
    balcony: data.balcony,
  };
}

function bidFieldsFromInput(data: ListingInput) {
  return {
    biddable: data.biddable ?? false,
    bidStartPrice: data.bidStartPrice ?? null,
    bidMinIncrement: data.bidMinIncrement ?? 500,
    bidsCloseAt:
      data.bidsCloseAt && data.bidsCloseAt !== ""
        ? new Date(data.bidsCloseAt)
        : null,
  };
}

export async function createListing(ownerId: string, data: ListingInput) {
  const predicted = predictRent(toPredictInput(data));
  const {
    biddable: _b,
    bidStartPrice: _bs,
    bidMinIncrement: _bm,
    bidsCloseAt: _bc,
    ...rest
  } = data;
  return prisma.listing.create({
    data: {
      ...rest,
      description: data.description || null,
      photoUrl: data.photoUrl || null,
      mediaUrls: data.mediaUrls ?? "[]",
      predictedRent: predicted,
      ownerId,
      ...bidFieldsFromInput(data),
    },
  });
}

export async function updateListing(
  id: string,
  requesterId: string,
  isAdmin: boolean,
  data: ListingInput,
) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return { error: "not_found" as const };
  if (existing.ownerId !== requesterId && !isAdmin)
    return { error: "forbidden" as const };
  const predicted = predictRent(toPredictInput(data));
  const {
    biddable: _b,
    bidStartPrice: _bs,
    bidMinIncrement: _bm,
    bidsCloseAt: _bc,
    ...rest
  } = data;
  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...rest,
      description: data.description || null,
      photoUrl: data.photoUrl || null,
      mediaUrls: data.mediaUrls ?? "[]",
      predictedRent: predicted,
      ...bidFieldsFromInput(data),
    },
  });
  return { listing: updated };
}

export async function deleteListing(
  id: string,
  requesterId: string,
  isAdmin: boolean,
) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return { error: "not_found" as const };
  if (existing.ownerId !== requesterId && !isAdmin)
    return { error: "forbidden" as const };
  await prisma.listing.delete({ where: { id } });
  return { ok: true as const };
}

export async function listingsByOwner(ownerId: string) {
  return prisma.listing.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}
