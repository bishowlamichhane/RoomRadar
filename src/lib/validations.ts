import { z } from "zod";
import { CITIES, ROOM_TYPES } from "@/lib/constants";

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["SEEKER", "OWNER"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const listingSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  city: z.enum(CITIES),
  area: z.string().min(2),
  roomType: z.enum(ROOM_TYPES),
  sizeSqft: z.coerce.number().min(60).max(5000),
  floor: z.coerce.number().int().min(0).max(30),
  bedrooms: z.coerce.number().int().min(0).max(10),
  bathrooms: z.coerce.number().int().min(0).max(10),
  furnished: z.coerce.boolean(),
  waterSupply: z.coerce.boolean(),
  parking: z.coerce.boolean(),
  attachedBathroom: z.coerce.boolean(),
  wifiReady: z.coerce.boolean(),
  kitchen: z.coerce.boolean(),
  balcony: z.coerce.boolean(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  rent: z.coerce.number().int().min(1000).max(500000),
  photoUrl: z.string().url().optional().or(z.literal("")),
  mediaUrls: z
    .string()
    .refine((s) => {
      try {
        const j = JSON.parse(s);
        return (
          Array.isArray(j) &&
          j.every(
            (m) =>
              m &&
              typeof m.url === "string" &&
              (m.type === "image" || m.type === "video"),
          )
        );
      } catch {
        return false;
      }
    }, "mediaUrls must be a JSON array of {url,type}")
    .optional()
    .default("[]"),
  biddable: z.coerce.boolean().optional().default(false),
  bidStartPrice: z.coerce.number().int().min(1000).max(500000).optional().nullable(),
  bidMinIncrement: z.coerce.number().int().min(100).max(50000).optional().default(500),
  bidsCloseAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .or(z.literal("")),
});

// A seeker places a bid on a listing.
export const placeBidSchema = z.object({
  amount: z.coerce.number().int().min(1000).max(1_000_000),
  message: z.string().max(500).optional().or(z.literal("")),
  moveInDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .or(z.literal("")),
});

// Owner or bidder updates a bid's status.
export const updateBidSchema = z.object({
  action: z.enum(["accept", "reject", "withdraw"]),
});

// Seeker requests a tour on a listing. No payment at this point — the fee is
// only collected after the owner confirms this specific request.
export const bookingSchema = z.object({
  tourDate: z
    .string()
    .datetime()
    .refine((s) => new Date(s).getTime() > Date.now(), "tour must be in the future"),
});

// Owner (or admin) transitions a booking. Confirm triggers the pay prompt;
// complete auto-declines any other pending bookings on the same listing.
export const updateBookingSchema = z.object({
  action: z.enum(["confirm", "decline", "complete"]),
});

export const predictSchema = listingSchema.pick({
  city: true,
  area: true,
  roomType: true,
  sizeSqft: true,
  floor: true,
  bedrooms: true,
  bathrooms: true,
  furnished: true,
  waterSupply: true,
  parking: true,
  attachedBathroom: true,
  wifiReady: true,
  kitchen: true,
  balcony: true,
});

export const searchSchema = z
  .object({
    city: z.enum(CITIES).optional(),
    area: z.string().optional(),
    roomType: z.enum(ROOM_TYPES).optional(),
    minRent: z.coerce.number().optional(),
    maxRent: z.coerce.number().optional(),
    amenities: z.array(z.string()).optional(),
  })
  .partial();
