import model from "./model.json";

export type PredictInput = {
  city: "Kathmandu" | "Lalitpur" | "Bhaktapur";
  area: string;
  roomType: "Single Room" | "1BHK" | "2BHK" | "Flat" | "Hostel";
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

export function predictRent(inp: PredictInput): number {
  const b = (v: boolean) => (v ? 1 : 0);
  const areaIndex =
    (model.areaIndex as Record<string, number>)[inp.area] ??
    model.defaultAreaIndex;

  const featureValues: Record<string, number> = {
    sizeSqft: inp.sizeSqft,
    floor: inp.floor,
    bedrooms: inp.bedrooms,
    bathrooms: inp.bathrooms,
    furnished: b(inp.furnished),
    waterSupply: b(inp.waterSupply),
    parking: b(inp.parking),
    attachedBathroom: b(inp.attachedBathroom),
    wifiReady: b(inp.wifiReady),
    kitchen: b(inp.kitchen),
    balcony: b(inp.balcony),
    city_Lalitpur: inp.city === "Lalitpur" ? 1 : 0,
    city_Bhaktapur: inp.city === "Bhaktapur" ? 1 : 0,
    roomType_1BHK: inp.roomType === "1BHK" ? 1 : 0,
    roomType_2BHK: inp.roomType === "2BHK" ? 1 : 0,
    roomType_Flat: inp.roomType === "Flat" ? 1 : 0,
    roomType_Hostel: inp.roomType === "Hostel" ? 1 : 0,
    area_price_index: areaIndex,
  };

  let pred = model.intercept;
  const coeffs = model.coefficients as Record<string, number>;
  for (const f of model.features as string[]) {
    pred += (coeffs[f] ?? 0) * (featureValues[f] ?? 0);
  }
  return Math.max(4000, Math.round(pred / 100) * 100);
}
