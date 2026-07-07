import { listListings } from "@/controllers/listingController";
import { listUsers } from "@/controllers/userController";
import AdminTables from "../../AdminTables";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const [listings, users] = await Promise.all([listListings({}), listUsers()]);
  return (
    <div className="space-y-6">
      <header>
        <div className="mono">Moderation</div>
        <h1 className="font-display text-3xl font-semibold text-[color:var(--color-ink)]">
          Listings & users
        </h1>
        <p className="text-[color:var(--color-muted)] text-sm mt-1">
          Delete listings or user accounts. Confirmations use the global delete
          modal — no browser alerts.
        </p>
      </header>
      <AdminTables listings={listings} users={users} />
    </div>
  );
}
