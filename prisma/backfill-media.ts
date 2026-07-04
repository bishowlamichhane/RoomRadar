import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.listing.findMany({
    where: { mediaUrls: "[]" },
    select: { id: true, photoUrl: true },
  });
  let updated = 0;
  for (const l of listings) {
    if (!l.photoUrl) continue;
    const media = JSON.stringify([{ url: l.photoUrl, type: "image" }]);
    await prisma.listing.update({
      where: { id: l.id },
      data: { mediaUrls: media },
    });
    updated++;
  }
  console.log(`Backfilled mediaUrls on ${updated} listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
