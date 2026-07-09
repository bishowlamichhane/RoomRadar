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

type PhotoCategory =
  | "bedroom"
  | "living"
  | "kitchen"
  | "bathroom"
  | "balcony"
  | "terrace"
  | "exterior";

/**
 * Photo sourcing strategy — curated Unsplash CDN URLs per category.
 *
 * Loremflickr (previous approach) pulls uncurated Flickr photos and can
 * return unsafe/off-topic shots; source.unsplash.com is deprecated. The
 * only free, reliable, safe option is to hand-curate direct Unsplash CDN
 * URLs (`images.unsplash.com/photo-<id>`), which are stable and served
 * by Unsplash's own moderation pipeline.
 *
 * Each pool below is a rotating deck: `nextPhotoUrl(cat)` walks a
 * per-category cursor so photos vary across listings; when a pool is
 * exhausted it wraps. Bedroom/bathroom pools are the biggest since every
 * listing draws from them.
 */
const CDN = "https://images.unsplash.com";
const PARAMS = "?w=900&auto=format&fit=crop&q=80";
const u = (id: string) => `${CDN}/${id}${PARAMS}`;

const POOLS: Record<PhotoCategory, string[]> = {
  bedroom: [
    u("photo-1663811397007-010e535ffcd7"),
    u("photo-1722942116153-ee3aa0fc2153"),
    u("photo-1663811396760-b6c84fa45ee9"),
    u("photo-1585821569331-f071db2abd8d"),
    u("photo-1620332372374-f108c53d2e03"),
    u("photo-1723640582986-1c969ef540b3"),
    u("photo-1634207521799-5616b235ac74"),
    u("photo-1594296041896-bcb34adeae60"),
    u("photo-1615874959474-d609969a20ed"),
    u("photo-1522771739844-6a9f6d5f14af"),
    u("photo-1595526114035-0d45ed16cfbf"),
    u("photo-1618221118493-9cfa1a1c00da"),
    u("photo-1531835551805-16d864c8d311"),
    u("photo-1577640064668-cf230bee547a"),
    u("photo-1633505650701-6104c4fc72c2"),
    u("photo-1600210491305-7396500b5b31"),
    u("photo-1632566853092-a0faa4665585"),
    u("photo-1618221770758-01929bf5ed39"),
    u("photo-1633944095397-878622ebc01c"),
    u("photo-1517862774645-dd398fbfaffa"),
    u("photo-1635594202056-9ea3b497e5c0"),
    u("photo-1552558636-f6a8f071c2b3"),
  ],
  living: [
    u("photo-1613575831056-0acd5da8f085"),
    u("photo-1630699144867-37acec97df5a"),
    u("photo-1665249934445-1de680641f50"),
    u("photo-1738168246881-40f35f8aba0a"),
    u("photo-1738168279272-c08d6dd22002"),
    u("photo-1713832139677-a03a41b602e3"),
    u("photo-1649429710616-dad56ce9a076"),
    u("photo-1666532937489-331f2f8f4668"),
    u("photo-1629042306558-7d1e15cc02fa"),
    u("photo-1713832139688-79676097edde"),
    u("photo-1663756915304-40b7eda63e41"),
    u("photo-1629042306548-afec37a5e46b"),
    u("photo-1654506012740-09321c969dc2"),
    u("photo-1629042306541-85e77116aed3"),
    u("photo-1745429523617-0d837856ca35"),
  ],
  kitchen: [
    u("photo-1609241506098-80fc37c6325f"),
    u("photo-1586208958839-06c17cacdf08"),
    u("photo-1538944570562-2c9cb7857097"),
    u("photo-1574739782594-db4ead022697"),
    u("photo-1596552183299-000ef779e88d"),
    u("photo-1556185781-a47769abb7ee"),
    u("photo-1593853761096-d0423b545cf9"),
    u("photo-1597418048367-7dd01e4404ee"),
    u("photo-1610527003928-47afd5f470c6"),
    u("photo-1560448075-cbc16bb4af8e"),
    u("photo-1642497590397-7f4384a19966"),
    u("photo-1593195150431-d5463aba0ec7"),
    u("photo-1628745277862-bc0b2d68c50c"),
    u("photo-1556912167-f556f1f39fdf"),
    u("photo-1682888813913-e13f18692019"),
    u("photo-1665507279638-5b48073c637b"),
    u("photo-1592506119503-c0b18879bd5a"),
    u("photo-1631048498692-af6262577031"),
    u("photo-1484154218962-a197022b5858"),
    u("photo-1602028915047-37269d1a73f7"),
    u("photo-1639405069836-f82aa6dcb900"),
    u("photo-1502005097973-6a7082348e28"),
    u("photo-1714860534425-7ce04e013dec"),
    u("photo-1665507279644-67d8ed143a84"),
    u("photo-1628745277866-0c4468030a81"),
    u("photo-1649083048597-d7b4f1e8a386"),
  ],
  bathroom: [
    u("photo-1584622650111-993a426fbf0a"),
    u("photo-1552321554-5fefe8c9ef14"),
    u("photo-1576698483491-8c43f0862543"),
    u("photo-1587527901949-ab0341697c1e"),
    u("photo-1643949700215-e61cdca053f7"),
    u("photo-1635247049885-0910fd28901b"),
    u("photo-1560448075-bb485b067938"),
    u("photo-1531125227120-bac862d2aeb9"),
    u("photo-1630699376443-a79cea41ed80"),
    u("photo-1560185127-bdf08e449371"),
    u("photo-1618236444666-105ec54b5b69"),
    u("photo-1617850687405-a18454436d77"),
    u("photo-1660697261323-e703308416e3"),
    u("photo-1586798271654-0471bb1b0517"),
    u("photo-1628602813485-4e8b09442e98"),
    u("photo-1742134131017-44d377a611b1"),
    u("photo-1645891897764-d7398b7f302b"),
    u("photo-1572742482459-e04d6cfdd6f3"),
    u("photo-1613849925352-96348d26bc51"),
    u("photo-1754574741164-a41418029cfb"),
    u("photo-1756079664354-34944e001f6d"),
    u("photo-1750036015902-c6f5ebca924e"),
    u("photo-1754522711595-84428937b07a"),
    u("photo-1634831084227-b2415a684173"),
    u("photo-1554861146-7d6fa1957c12"),
  ],
  balcony: [
    u("photo-1524549207884-e7d1130ae2f3"),
    u("photo-1469022563428-aa04fef9f5a2"),
    u("photo-1600776216872-b39b2a3dd995"),
    u("photo-1658048806266-f793f1f8c7c6"),
    u("photo-1630699376682-84df40131d22"),
    u("photo-1693585576674-2e1b7166f583"),
    u("photo-1597776862145-cbac3a4085ab"),
    u("photo-1551583996-f0a1d53f5bfd"),
    u("photo-1551776587-3f857ade004d"),
    u("photo-1644786764518-619ac6e74a51"),
    u("photo-1616140862247-bfdfa7a384c2"),
    u("photo-1630703103579-bde27ee45e49"),
    u("photo-1630703103926-5168f111a868"),
  ],
  terrace: [
    u("photo-1560448204-444f743ef6e7"),
    u("photo-1667157485464-382fab4519f5"),
    u("photo-1705095605806-4b2936e90471"),
    u("photo-1630840274967-ece6eaa61dfc"),
    u("photo-1630244260410-44eea8b074f0"),
  ],
  exterior: [
    u("photo-1515263487990-61b07816b324"),
    u("photo-1545324418-cc1a3fa10c00"),
    u("photo-1624204386084-dd8c05e32226"),
    u("photo-1516501312919-d0cb0b7b60b8"),
    u("photo-1579632652768-6cb9dcf85912"),
    u("photo-1619994121345-b61cd610c5a6"),
    u("photo-1638973140785-3b918e290682"),
    u("photo-1432297984334-707d34c4163a"),
    u("photo-1592276040264-e10344a6a10e"),
    u("photo-1643906652169-a750f3f70848"),
    u("photo-1571236673892-13d222da2019"),
    u("photo-1610286986642-057ece0c3656"),
    u("photo-1542309175-9b88d743f89f"),
    u("photo-1605267143746-999bf61d0d08"),
    u("photo-1626273947634-823f04de159e"),
  ],
};

// Rotating cursor per category so photos cycle through the pool rather than
// pinning to the same handful.
const cursor: Record<PhotoCategory, number> = {
  bedroom: 0, living: 0, kitchen: 0, bathroom: 0,
  balcony: 0, terrace: 0, exterior: 0,
};

const nextPhotoUrl = (cat: PhotoCategory): string => {
  const pool = POOLS[cat];
  const url = pool[cursor[cat] % pool.length];
  cursor[cat]++;
  return url;
};

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
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "RoomRadar Admin",
      email: "admin@gmail.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@gmail.com" },
    update: {},
    create: {
      name: "Bishow Lamichhane",
      email: "owner@gmail.com",
      passwordHash: ownerHash,
      role: "OWNER",
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "owner2@gmail.com" },
    update: {},
    create: {
      name: "Anjan Sharma",
      email: "owner2@gmail.com",
      passwordHash: secondOwnerHash,
      role: "OWNER",
    },
  });

  const seeker = await prisma.user.upsert({
    where: { email: "seeker@gmail.com" },
    update: {},
    create: {
      name: "Test Seeker",
      email: "seeker@gmail.com",
      passwordHash: seekerHash,
      role: "SEEKER",
    },
  });

  const seeker2 = await prisma.user.upsert({
    where: { email: "seeker2@gmail.com" },
    update: {},
    create: {
      name: "Rina Karki",
      email: "seeker2@gmail.com",
      passwordHash: seekerHash,
      role: "SEEKER",
    },
  });

  // Wipe existing bids first (FK cascade would drop them with listings, but
  // being explicit lets us re-run the seed cleanly).
  await prisma.bid.deleteMany({});
  await prisma.listing.deleteMany({});
  // Sweep away legacy @roomradar.np demo accounts from earlier seed runs so
  // the login page shows only the canonical @gmail.com credentials.
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@roomradar.np" } },
  });

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

      // Build a categorized media set — always bedroom + bathroom, plus
      // living/kitchen/balcony/terrace/exterior depending on the room's
      // features. Each push() draws a fresh Unsplash sig from the global
      // counter so no listing shares a photo with another. Cover is the
      // first entry.
      const mediaSet: { url: string; type: "image"; category: PhotoCategory }[] = [];
      const push = (cat: PhotoCategory) =>
        mediaSet.push({
          url: nextPhotoUrl(cat),
          type: "image",
          category: cat,
        });

      const hasLiving =
        rt === "1BHK" || rt === "2BHK" || rt === "Flat";

      push("bedroom");
      if (hasLiving) push("living");
      if (amenities.kitchen || rt !== "Hostel") push("kitchen");
      push("bathroom");
      if (amenities.balcony) push("balcony");
      if (rand() < 0.35) push("terrace");
      if (rand() < 0.4) push("exterior");

      // ~30% of listings are considered rented via RoomRadar. Their
      // updatedAt is nudged into the last ~45 days so the admin dashboard
      // can show a plausible "last 30 days" revenue slice.
      const rented = rand() < 0.3;
      // Around 40% of still-available listings accept bids. Owners pick a
      // starting price at 90% of the listed rent so there's headroom for
      // bids to climb up towards or past the listed rent.
      const biddable = !rented && rand() < 0.4;
      const bidStartPrice = biddable
        ? Math.round((rent * 0.9) / 500) * 500
        : null;
      const bidMinIncrement = biddable
        ? rent >= 30000
          ? 1000
          : 500
        : 500;
      const bidsCloseAt =
        biddable && rand() < 0.5
          ? new Date(Date.now() + (2 + Math.floor(rand() * 6)) * 86400 * 1000)
          : null;
      const cover = mediaSet[0].url;
      const listingRow = await prisma.listing.create({
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
          photoUrl: cover,
          mediaUrls: JSON.stringify(mediaSet),
          available: !rented,
          biddable,
          bidStartPrice,
          bidMinIncrement,
          bidsCloseAt,
          ownerId: rand() < 0.7 ? owner.id : owner2.id,
        },
      });
      if (rented) {
        const daysAgo = Math.floor(rand() * 45);
        const when = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        await prisma.listing.update({
          where: { id: listingRow.id },
          data: { updatedAt: when },
        });
      }
      created++;
    }
  }

  console.log(`Seeded ${created} listings.`);

  // Seed a small number of realistic bids across biddable listings so the
  // owner inbox and "My bids" page aren't empty at defence time. Each demo
  // listing gets 1-3 bids; the highest is WINNING, the rest OUTBID.
  const biddableListings = await prisma.listing.findMany({
    where: { biddable: true },
    select: {
      id: true,
      rent: true,
      bidStartPrice: true,
      bidMinIncrement: true,
    },
    take: 24,
  });
  const bidders = [seeker.id, seeker2.id];
  const messages = [
    "Working professional, can move in this month.",
    "Long-term tenant, willing to sign 12-month lease.",
    "Couple with steady salary, references available.",
    "MBA student — quiet, no smoking, no pets.",
    "Family of 3 relocating from Pokhara, flexible on move-in date.",
    "",
  ];
  let bidCount = 0;
  for (const l of biddableListings) {
    const nBids = 1 + Math.floor(rand() * 3);
    let cursor = l.bidStartPrice ?? l.rent;
    const step = l.bidMinIncrement;
    // Build ascending bids from alternating bidders.
    const raises: { bidderId: string; amount: number; message: string }[] = [];
    for (let i = 0; i < nBids; i++) {
      cursor = cursor + step + Math.floor(rand() * step);
      raises.push({
        bidderId: bidders[i % bidders.length],
        amount: cursor,
        message: messages[Math.floor(rand() * messages.length)],
      });
    }
    // Insert oldest first, mark all OUTBID except the last (WINNING).
    const now = Date.now();
    for (let i = 0; i < raises.length; i++) {
      const r = raises[i];
      const winning = i === raises.length - 1;
      await prisma.bid.create({
        data: {
          listingId: l.id,
          bidderId: r.bidderId,
          amount: r.amount,
          message: r.message || null,
          status: winning ? "WINNING" : "OUTBID",
          createdAt: new Date(now - (raises.length - i) * 3600 * 1000),
        },
      });
      bidCount++;
    }
  }
  console.log(`Seeded ${bidCount} bids across ${biddableListings.length} biddable listings.`);
  console.log(
    "Users: admin@gmail.com / owner@gmail.com / owner2@gmail.com / seeker@gmail.com / seeker2@gmail.com",
  );
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
