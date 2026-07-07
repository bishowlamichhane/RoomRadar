import type { FairVerdict } from "@/lib/fairPrice";

export type RadarPoint = {
  id: string;
  title: string;
  area: string;
  city: string;
  roomType: string;
  rent: number;
  predicted: number;
  diff: number;
  verdict: FairVerdict;
  lat: number;
  lng: number;
  photo: string | null;
  sizeSqft: number;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  waterSupply: boolean;
  parking: boolean;
  attachedBathroom: boolean;
  wifiReady: boolean;
  kitchen: boolean;
  balcony: boolean;
};

export type RadarModel = {
  served: string;
  best: string;
  r2: number;
  mae: number;
  nTrain: number;
  nTest: number;
  featureImportance: { feature: string; importance: number }[];
  comparison: { model: string; mae: number; rmse: number; r2: number }[];
};

export type RadarPayload = {
  points: RadarPoint[];
  model: RadarModel;
};

export const VERDICT_TONE: Record<FairVerdict, string> = {
  below: "#3aa0ff",
  fair: "#0e6e6e",
  slightlyHigh: "#ea8b47",
  high: "#e05555",
};

export const VERDICT_LABEL: Record<FairVerdict, string> = {
  below: "Below market",
  fair: "Fair price",
  slightlyHigh: "Slightly high",
  high: "Above fair",
};
