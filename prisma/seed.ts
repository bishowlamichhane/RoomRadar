import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { predictRent } from "../src/lib/ml/predict";
import { AREA_COORDS, AMENITY_KEYS } from "../src/lib/constants";

const prisma = new PrismaClient();

type RoomType = "Single Room" | "1BHK" | "2BHK" | "Flat" | "Hostel";
type City = "Kathmandu" | "Lalitpur" | "Bhaktapur";

const ROOM_META: Record<
  RoomType,
  { size: [number, number]; bedrooms: number | [number, number]; bathrooms: number | [number, number] }
> = {
  "Single Room": { size: [120, 260], bedrooms: 1, bathrooms: 1 },
  Hostel: { size: [100, 200], bedrooms: 1, bathrooms: 1 },
  "1BHK": { size: [300, 550], bedrooms: 1, bathrooms: 1 },
  "2BHK": { size: [550, 900], bedrooms: 2, bathrooms: [1, 2] },
  Flat: { size: [700, 1400], bedrooms: [2, 3], bathrooms: [2, 3] },
};

const PHOTO_URLS = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522444195799-478538b28823?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560448076-6d4e39a89164?w=800&auto=format&fit=crop",
];

// Deterministic PRNG so seed reruns look the same-ish.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = makeRng(20260704);
const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + rand() * (b - a);
const intBetween = (a: number, b: number) => Math.floor(between(a, b + 1));

async function main() {
  console.log("Seeding…");

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const ownerHash = await bcrypt.hash("owner123", 10);
  const seekerHash = await bcrypt.hash("seeker123", 10);
  const secondOwnerHash = await bcrypt.hash("owner123", 10);

  await prisma.user.upsert({
    where: { email: "admin@roomradar.np" },
    update: {},
    create: {
      name: "RoomRadar Admin",
      email: "admin@roomradar.np",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@roomradar.np" },
    update: {},
    create: {
      name: "Bishow Lamichhane",
      email: "owner@roomradar.np",
      passwordHash: ownerHash,
      role: "OWNER",
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "owner2@roomradar.np" },
    update: {},
    create: {
      name: "Anjan Sharma",
      email: "owner2@roomradar.np",
      passwordHash: secondOwnerHash,
      role: "OWNER",
    },
  });

  await prisma.user.upsert({
    where: { email: "seeker@roomradar.np" },
    update: {},
    create: {
      name: "Test Seeker",
      email: "seeker@roomradar.np",
      passwordHash: seekerHash,
      role: "SEEKER",
    },
  });

  await prisma.listing.deleteMany({});

  const areas = Object.keys(AREA_COORDS);
  const kathAreas = areas.filter((a) => AREA_COORDS[a].city === "Kathmandu");
  const lalAreas = areas.filter((a) => AREA_COORDS[a].city === "Lalitpur");
  const bhkAreas = areas.filter((a) => AREA_COORDS[a].city === "Bhaktapur");

  const distribution: { count: number; areas: string[] }[] = [
    { count: 22, areas: kathAreas }, // ~44%
    { count: 17, areas: lalAreas }, // ~34%
    { count: 11, areas: bhkAreas }, // ~22%
  ];

  const roomTypes: RoomType[] = [
    "Single Room",
    "1BHK",
    "2BHK",
    "Flat",
    "Hostel",
  ];

  const titleTemplates = (rt: RoomType, area: string) => {
    const adjectives = ["Sunny", "Bright", "Cozy", "Spacious", "Modern", "Quiet", "Airy"];
    const suffixes = [
      `near ${area} Chowk`,
      `in ${area}`,
      `${area} — walk to market`,
      `close to ${area} bus stop`,
      `${area}, top floor`,
    ];
    return `${pick(adjectives)} ${rt} ${pick(suffixes)}`;
  };

  let created = 0;
  for (const bucket of distribution) {
    for (let i = 0; i < bucket.count; i++) {
      const area = pick(bucket.areas);
      const { city, lat, lng } = AREA_COORDS[area];
      const rt = pick(roomTypes);
      const meta = ROOM_META[rt];
      const [smin, smax] = meta.size;
      const sizeSqft = Math.round(between(smin, smax));
      const bedrooms =
        typeof meta.bedrooms === "number"
          ? meta.bedrooms
          : intBetween(meta.bedrooms[0], meta.bedrooms[1]);
      const bathrooms =
        typeof meta.bathrooms === "number"
          ? meta.bathrooms
          : intBetween(meta.bathrooms[0], meta.bathrooms[1]);
      const floor = intBetween(0, 4);
      const amenities = {
        waterSupply: rand() < 0.9,
        parking: rand() < 0.5,
        attachedBathroom: rand() < 0.65,
        wifiReady: rand() < 0.7,
        kitchen: rand() < 0.6,
        balcony: rand() < 0.45,
      };
      const furnished = rand() < 0.45;

      const features = {
        city: city as City,
        area,
        roomType: rt,
        sizeSqft,
        floor,
        bedrooms,
        bathrooms,
        furnished,
        ...amenities,
      };
      const predicted = predictRent(features);

      // Introduce ±25% noise so badges spread across states
      const noise = between(-0.25, 0.25);
      const rent = Math.max(4000, Math.round((predicted * (1 + noise)) / 100) * 100);

      const title = titleTemplates(rt, area);
      const description = `A ${rt.toLowerCase()} in ${area}, ${city}. ${
        furnished ? "Fully furnished." : "Unfurnished."
      } ${amenities.parking ? "Parking available." : ""} ${
        amenities.attachedBathroom ? "Attached bathroom." : ""
      }`.trim();

      const photo = pick(PHOTO_URLS);
      await prisma.listing.create({
        data: {
          title,
          description,
          city,
          area,
          roomType: rt,
          sizeSqft,
          floor,
          bedrooms,
          bathrooms,
          ...amenities,
          furnished,
          latitude: lat + (rand() - 0.5) * 0.008,
          longitude: lng + (rand() - 0.5) * 0.008,
          rent,
          predictedRent: predicted,
          photoUrl: photo,
          mediaUrls: JSON.stringify([{ url: photo, type: "image" }]),
          ownerId: rand() < 0.7 ? owner.id : owner2.id,
        },
      });
      created++;
    }
  }

  console.log(`Seeded ${created} listings.`);
  console.log("Users: admin@roomradar.np / owner@roomradar.np / seeker@roomradar.np");
  // Silence unused-var lint
  void AMENITY_KEYS;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
