import { NextResponse } from "next/server";
import { listListings } from "@/controllers/listingController";
import { predictRent } from "@/lib/ml/predict";
import { fairness } from "@/lib/fairPrice";
import { parseMedia, firstImage } from "@/lib/media";
import metrics from "@/lib/ml/metrics.json";
import { auth } from "@/lib/auth";
import { serializeListings } from "@/lib/location";

export const dynamic = "force-dynamic";

type ComparisonRow = { model: string; mae: number; rmse: number; r2: number };

export async function GET() {
  const rawListings = await listListings({});
  const session = await auth();
  const viewer = session?.user
    ? { id: session.user.id, role: session.user.role ?? "SEEKER" }
    : null;
  const listings = await serializeListings(rawListings, viewer);

  const points = listings.map((l) => {
    const predicted = predictRent({
      city: l.city as "Kathmandu" | "Lalitpur" | "Bhaktapur",
      area: l.area,
      roomType: l.roomType as
        | "Single Room"
        | "1BHK"
        | "2BHK"
        | "Flat"
        | "Hostel",
      sizeSqft: l.sizeSqft,
      floor: l.floor,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      furnished: l.furnished,
      waterSupply: l.waterSupply,
      parking: l.parking,
      attachedBathroom: l.attachedBathroom,
      wifiReady: l.wifiReady,
      kitchen: l.kitchen,
      balcony: l.balcony,
    });
    const { diff, verdict } = fairness(l.rent, predicted);
    const cover = firstImage(parseMedia(l.mediaUrls)) ?? l.photoUrl ?? null;

    return {
      id: l.id,
      title: l.title,
      area: l.area,
      city: l.city,
      roomType: l.roomType,
      rent: l.rent,
      predicted,
      diff,
      verdict,
      lat: l.latitude,
      lng: l.longitude,
      photo: cover,
      sizeSqft: l.sizeSqft,
      floor: l.floor,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      furnished: l.furnished,
      waterSupply: l.waterSupply,
      parking: l.parking,
      attachedBathroom: l.attachedBathroom,
      wifiReady: l.wifiReady,
      kitchen: l.kitchen,
      balcony: l.balcony,
    };
  });

  const comparison = (metrics.comparison ?? []) as ComparisonRow[];
  const best = comparison.reduce<ComparisonRow | null>(
    (a, b) => (!a || b.r2 > a.r2 ? b : a),
    null,
  );

  return NextResponse.json({
    points,
    model: {
      served: "Linear Regression",
      best: best?.model ?? "Gradient Boosting",
      r2: best?.r2 ?? 0.969,
      mae: best?.mae ?? 1807,
      nTrain: metrics.n_train ?? 640,
      nTest: metrics.n_test ?? 160,
      featureImportance: metrics.featureImportance ?? [],
      comparison,
    },
  });
}
