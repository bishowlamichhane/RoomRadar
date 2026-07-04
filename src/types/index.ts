import type { Listing, User } from "@prisma/client";

export type ListingDTO = Listing;

export type SafeUser = Pick<User, "id" | "name" | "email" | "role">;

export type { PredictInput } from "@/lib/ml/predict";
