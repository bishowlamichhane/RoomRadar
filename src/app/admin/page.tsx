import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listListings } from "@/controllers/listingController";
import { listUsers } from "@/controllers/userController";
import AdminTables from "./AdminTables";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const [listings, users] = await Promise.all([listListings({}), listUsers()]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="mb-8">
        <div className="mono">Admin</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          Moderation
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Manage listings and user roles across the platform.
        </p>
      </div>
      <AdminTables listings={listings} users={users} />
    </div>
  );
}
