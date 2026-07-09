-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "bidMinIncrement" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "bidStartPrice" INTEGER,
ADD COLUMN     "biddable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bidsCloseAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "moveInDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'WINNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bid_listingId_status_idx" ON "Bid"("listingId", "status");

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

-- CreateIndex
CREATE INDEX "Bid_listingId_amount_idx" ON "Bid"("listingId", "amount");

-- CreateIndex
CREATE INDEX "Listing_biddable_idx" ON "Listing"("biddable");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
