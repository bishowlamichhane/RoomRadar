import ListingForm from "@/components/ListingForm";
import { getListing } from "@/controllers/listingController";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import type { City, RoomType } from "@/lib/constants";
import { parseMedia } from "@/lib/media";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const listing = await getListing(id);
  if (!listing) notFound();
  if (
    listing.ownerId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    redirect("/");
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="mb-6">
        <div className="mono">Edit</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          {listing.title}
        </h1>
      </div>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        initial={{
          title: listing.title,
          description: listing.description ?? "",
          city: listing.city as City,
          area: listing.area,
          roomType: listing.roomType as RoomType,
          sizeSqft: listing.sizeSqft,
          floor: listing.floor,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          rent: listing.rent,
          media: parseMedia(listing.mediaUrls),
          furnished: listing.furnished,
          waterSupply: listing.waterSupply,
          parking: listing.parking,
          attachedBathroom: listing.attachedBathroom,
          wifiReady: listing.wifiReady,
          kitchen: listing.kitchen,
          balcony: listing.balcony,
          latitude: listing.latitude,
          longitude: listing.longitude,
        }}
      />
    </div>
  );
}
