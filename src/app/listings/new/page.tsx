import ListingForm from "@/components/ListingForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="mb-6">
        <div className="mono">Post a room</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          List your room
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 max-w-2xl">
          Fill in the details — we&apos;ll suggest a fair rent from the model as
          you type.
        </p>
      </div>
      <ListingForm mode="create" />
    </div>
  );
}
