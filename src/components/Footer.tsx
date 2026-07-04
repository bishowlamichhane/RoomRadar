import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-[color:var(--color-ink)] text-white">
      <div className="max-w-7xl mx-auto px-5 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] flex items-center justify-center relative">
              <span className="absolute inset-1 rounded-full border border-white/50" />
              <span className="absolute w-1.5 h-1.5 bg-white rounded-full" />
            </span>
            <span className="font-display text-xl font-semibold">
              RoomRadar
            </span>
          </div>
          <p className="text-white/70 text-sm max-w-md leading-relaxed">
            A Nepal-first room and flat marketplace with an ML-powered fair-price
            check on every listing. Built to bring transparency to the
            Kathmandu Valley rental market.
          </p>
        </div>

        <div>
          <div className="mono text-white/50 mb-3">Explore</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/listings">All listings</Link>
            </li>
            <li>
              <Link href="/listings?city=Kathmandu">Kathmandu</Link>
            </li>
            <li>
              <Link href="/listings?city=Lalitpur">Lalitpur</Link>
            </li>
            <li>
              <Link href="/listings?city=Bhaktapur">Bhaktapur</Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="mono text-white/50 mb-3">Project</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/results">Model results</Link>
            </li>
            <li>
              <Link href="/listings/new">Post a room</Link>
            </li>
            <li>
              <Link href="/register">Create account</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} RoomRadar — B.Sc. CSIT project by Bishow
        Lamichhane & Anjan Sharma.
      </div>
    </footer>
  );
}
