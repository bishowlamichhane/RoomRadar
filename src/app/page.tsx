import Link from "next/link";
import { redirect } from "next/navigation";
import { listListings } from "@/controllers/listingController";
import ListingCard from "@/components/ListingCard";
import HeroSearch from "@/components/HeroSearch";
import RadarControlRoom from "@/components/radar/RadarControlRoom";
import { npr } from "@/lib/format";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.role === "OWNER") redirect("/dashboard");
  if (session?.user?.role === "ADMIN") redirect("/admin");

  const listings = await listListings({});
  const featured = listings.slice(0, 6);

  return (
    <div className="bg-[color:var(--color-canvas)]">
      {/* Hero — full-width live map as background, copy overlaid on the left */}
      <section className="relative isolate overflow-hidden min-h-[600px] md:min-h-[720px] flex flex-col">
        {/* Live map fills the background */}
        <div className="absolute inset-0 z-0">
          <RadarControlRoom panel="map" heroMode />
        </div>

        {/* Horizontal scrim — kept light so the map, sweep cone and animated
            pips stay clearly visible. Text contrast is handled by stronger
            drop-shadows on the copy itself. */}
        <div
          aria-hidden
          className="absolute inset-0 z-[10] pointer-events-none bg-gradient-to-r from-[#0d1414]/55 via-[#0d1414]/15 to-transparent"
        />
        {/* Subtle bottom shadow that grounds the stats strip only. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 z-[10] pointer-events-none bg-gradient-to-t from-[#0d1414]/45 to-transparent"
        />

        {/* Hero copy + search — constrained to max-w-7xl inner column, left-aligned */}
        <div className="relative z-[20] flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-14 py-10 pt-16 sm:pt-20 pointer-events-none text-white">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs bg-white/15 backdrop-blur border border-white/20 rounded-full px-3 py-1.5 mb-6 pointer-events-auto">
                ✦ ML fair-price on every listing
              </span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-6xl leading-[1.05] font-semibold [text-shadow:0_2px_12px_rgba(0,0,0,0.55),0_6px_28px_rgba(0,0,0,0.4)]">
                Rent a room in the Valley,
                <br />
                at a price you can trust.
              </h1>
              <p className="mt-4 text-white/95 text-sm sm:text-base md:text-lg [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                Thousands of verified rooms across Kathmandu, Lalitpur &
                Bhaktapur — scored in real time by our fair-rent model.
              </p>

              <div className="mt-8 sm:mt-10 pointer-events-auto">
                <HeroSearch />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 pointer-events-auto">
                {["Baneshwor", "Jhamsikhel", "Kupondole", "Suryabinayak", "Thamel"].map(
                  (q) => (
                    <Link
                      key={q}
                      href={`/listings?area=${encodeURIComponent(q)}`}
                      className="text-xs text-white bg-white/10 border border-white/30 hover:bg-white/25 backdrop-blur rounded-full px-3.5 py-1.5"
                    >
                      {q}
                    </Link>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip at the bottom — full-bleed bar, content constrained */}
        <div className="relative z-[20] bg-black/70 backdrop-blur border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-14 py-5 sm:py-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-white">
            <Stat value={`${listings.length}+`} label="Live listings" />
            <Stat value="95%" label="Fair-price accuracy" />
            <Stat value="3" label="Valley cities" />
            <Stat value="ML" label="Powered pricing" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 mt-12 sm:mt-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="mono">Handpicked</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[color:var(--color-ink)]">
              Featured rooms this week
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden md:inline text-sm text-[color:var(--color-primary)] font-medium"
          >
            View all {listings.length} →
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* Fair-price section */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 mt-14 sm:mt-20">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <div className="mono">Signature feature</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[color:var(--color-ink)] mt-1">
              The FairPriceBadge — one glance, real answer.
            </h2>
            <p className="mt-3 text-[color:var(--color-muted)] leading-relaxed">
              Every room is scored against our model of thousands of similar
              listings across the Valley. You&apos;ll instantly see whether the
              price is fair, a great deal, or worth negotiating.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <FakeBadge label="Below market" tone="blue" />
              <FakeBadge label="Fair price" tone="green" />
              <FakeBadge label="Slightly high" tone="amber" />
              <FakeBadge label="Above fair" tone="red" />
            </div>
          </div>

          <div className="card p-6">
            <div className="mono">◈ Fair-price analysis · sample</div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-[color:var(--color-muted)]">Listed rent</div>
                <div className="font-display text-3xl font-semibold">
                  {npr(18000)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[color:var(--color-muted)]">
                  Predicted fair
                </div>
                <div className="font-display text-3xl font-semibold text-[color:var(--color-primary)]">
                  {npr(15200)}
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[color:var(--color-ink)]"
                style={{ left: "78%" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
              <span>Great deal</span>
              <span>Fair</span>
              <span>Overpriced</span>
            </div>
            <p className="mt-4 text-sm text-[color:var(--color-muted)]">
              This 1BHK is priced <strong>18% above</strong> comparable rooms in
              Baneshwor. Verified 1BHKs average {npr(15200)} — worth negotiating.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 mt-14 sm:mt-20 mb-16 sm:mb-24">
        <div className="rounded-2xl md:rounded-3xl bg-[color:var(--color-ink)] text-white p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="mono text-white/60">For owners</div>
            <h3 className="font-display text-3xl md:text-4xl font-semibold mt-1">
              Have a room to rent? List it in minutes.
            </h3>
            <p className="text-white/70 mt-2 max-w-xl">
              Post a listing, and we&apos;ll suggest a fair rent from the model
              while you type. Reach seekers looking for rooms in your area.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white rounded-full px-6 py-3 text-sm font-medium"
          >
            Post a listing →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold">{value}</div>
      <div className="text-xs text-white/70 mt-1">{label}</div>
    </div>
  );
}

function FakeBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const toneMap: Record<string, string> = {
    green:
      "bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary-600)]",
    amber: "bg-[#fcecdb] text-[#a05a1e]",
    red: "bg-[#fde1e0] text-[#a52a2a]",
    blue: "bg-[#e0eefc] text-[#255f9a]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-3 py-1.5 ${toneMap[tone]}`}
    >
      ● {label}
    </span>
  );
}
