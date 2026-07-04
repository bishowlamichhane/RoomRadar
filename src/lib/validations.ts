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
