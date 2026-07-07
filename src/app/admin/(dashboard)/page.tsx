import Link from "next/link";
import { npr } from "@/lib/format";
import { getAdminOverview, COMMISSION_PCT } from "@/lib/adminStats";
import { getModelHealth, getSystemHealth, formatUptime } from "@/lib/systemHealth";
import RadarControlRoom from "@/components/radar/RadarControlRoom";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [ov, model, sys] = await Promise.all([
    getAdminOverview(),
    getModelHealth(),
    getSystemHealth(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <div className="mono">Overview</div>
        <h1 className="font-display text-3xl font-semibold text-[color:var(--color-ink)]">
          Platform at a glance
        </h1>
        <p className="text-[color:var(--color-muted)] text-sm mt-1">
          Live KPIs, attributable revenue, and health snapshot for RoomRadar.
        </p>
      </header>

      {/* KPI tiles */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Total listings"
          value={ov.listings.total.toLocaleString("en-IN")}
          sub={`${ov.listings.newLast7d} new this week`}
        />
        <Kpi
          label="Rooms rented"
          value={ov.listings.sold.toLocaleString("en-IN")}
          sub={`${(ov.listings.conversionPct * 100).toFixed(1)}% conversion`}
          tone="primary"
        />
        <Kpi
          label="Owners"
          value={ov.users.owners.toLocaleString("en-IN")}
          sub={`${ov.users.newLast7d} new signups this week`}
        />
        <Kpi
          label="Seekers"
          value={ov.users.seekers.toLocaleString("en-IN")}
          sub={`${ov.users.admins} admin${ov.users.admins === 1 ? "" : "s"}`}
        />
        <Kpi
          label="Revenue attributed"
          value={npr(ov.revenue.attributedNPR)}
          sub={`${(COMMISSION_PCT * 100).toFixed(0)}% commission model`}
          tone="warm"
        />
        <Kpi
          label="Last 30 days"
          value={npr(ov.revenue.lastMonthNPR)}
          sub={`Avg ${npr(ov.revenue.perListingAvgNPR)} per rented room`}
          tone="warm"
        />
      </section>

      {/* Revenue explainer + median rents */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <div className="mono flex items-center justify-between">
            <span>◈ Revenue model</span>
            <span className="text-[10px] normal-case tracking-normal text-[color:var(--color-muted)]">
              Attribution assumption
            </span>
          </div>
          <p className="text-sm text-[color:var(--color-ink)]/80 mt-3 leading-relaxed">
            RoomRadar records a one-time{" "}
            <strong className="text-[color:var(--color-primary-600)]">
              {(COMMISSION_PCT * 100).toFixed(0)}% commission
            </strong>{" "}
            of the monthly rent for every listing marked as rented via the
            platform. This gives {ov.listings.sold} rented room
            {ov.listings.sold === 1 ? "" : "s"} totalling{" "}
            <strong>{npr(ov.revenue.attributedNPR)}</strong> in attributable
            revenue, with an average of{" "}
            <strong>{npr(ov.revenue.perListingAvgNPR)}</strong> per closed
            rental.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat
              label="Median listed rent"
              value={npr(ov.medians.listedRent)}
            />
            <MiniStat
              label="Median predicted rent"
              value={npr(ov.medians.predictedRent)}
            />
            <MiniStat
              label="Fair-price R²"
              value={model.r2.toFixed(3)}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="mono">◈ Quick actions</div>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/admin/moderation"
              className="rounded-xl bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white text-sm font-medium px-4 py-2.5 text-center"
            >
              Moderate listings & users →
            </Link>
            <Link
              href="/admin/health"
              className="rounded-xl border border-black/10 hover:border-black/25 text-sm font-medium px-4 py-2.5 text-center text-[color:var(--color-ink)]"
            >
              Full health & analytics →
            </Link>
            <Link
              href="/results"
              className="rounded-xl border border-black/10 hover:border-black/25 text-sm font-medium px-4 py-2.5 text-center text-[color:var(--color-ink)]"
            >
              Model result report →
            </Link>
          </div>
        </div>
      </section>

      {/* Distribution mini-charts */}
      <section className="grid gap-4 md:grid-cols-3">
        <DistBlock title="Listings by city" rows={ov.distribution.byCity} />
        <DistBlock
          title="Listings by room type"
          rows={ov.distribution.byRoomType}
        />
        <DistBlock
          title="Fair-price verdicts"
          rows={ov.distribution.byVerdict.map((v) => ({
            label: v.label,
            value: v.value,
          }))}
          tone="mixed"
        />
      </section>

      {/* Timeseries strip */}
      <section className="card p-5">
        <div className="mono flex items-center justify-between mb-3">
          <span>◈ Last 8 weeks · signups & new listings</span>
          <span className="text-[10px] normal-case tracking-normal text-[color:var(--color-muted)]">
            Rolling weekly buckets
          </span>
        </div>
        <TimeseriesBars weeks={ov.timeseries.weeks} />
      </section>

      {/* Live model inference + system health */}
      <section>
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="mono">Live model inference</div>
            <h2 className="font-display text-xl font-semibold text-[color:var(--color-ink)]">
              Fair-rent model, working in real time
            </h2>
          </div>
          <StatusPill
            status={
              model.daysSinceTrained !== null && model.daysSinceTrained > 30
                ? "warn"
                : "ok"
            }
            text={
              model.daysSinceTrained === null
                ? "trained · unknown"
                : `trained ${model.daysSinceTrained}d ago`
            }
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RadarControlRoom panel="telemetry" />
          </div>
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="mono">◈ System health</div>
              <StatusPill
                status={
                  sys.db.status === "up"
                    ? "ok"
                    : sys.db.status === "degraded"
                      ? "warn"
                      : "down"
                }
                text={`DB ${sys.db.status}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="DB latency" value={`${sys.db.latencyMs} ms`} />
              <MiniStat
                label="Uptime"
                value={formatUptime(sys.process.uptimeSeconds)}
              />
              <MiniStat label="Node" value={sys.process.nodeVersion} />
              <MiniStat label="Platform" value={sys.process.platform} />
              <MiniStat
                label="Heap"
                value={`${sys.process.heapUsedMB} / ${sys.process.heapTotalMB} MB`}
              />
              <MiniStat label="RSS" value={`${sys.process.rssMB} MB`} />
              <MiniStat
                label="Served model"
                value={model.served}
              />
              <MiniStat
                label="Last trained"
                value={
                  model.lastTrainedAt
                    ? new Date(model.lastTrainedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "warm";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[color:var(--color-primary-tint)] border-[color:var(--color-primary)]/20"
      : tone === "warm"
        ? "bg-[color:var(--color-warm-tint)] border-[#e6b586]/30"
        : "bg-white border-black/5";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mono">{label}</div>
      <div className="font-display text-2xl font-semibold text-[color:var(--color-ink)] mt-1 leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[color:var(--color-muted)] mt-1.5 leading-snug">
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--color-canvas)] border border-black/5 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold text-[color:var(--color-ink)] mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}

function DistBlock({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { label: string; value: number }[];
  tone?: "mixed";
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const palette = ["#0e6e6e", "#ea8b47", "#3aa0ff", "#e05555"];
  return (
    <div className="card p-5">
      <div className="mono mb-3">◈ {title}</div>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const color =
            tone === "mixed"
              ? palette[i % palette.length]
              : "var(--color-primary)";
          return (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-24 text-xs text-[color:var(--color-ink)]/80 truncate">
                {r.label}
              </div>
              <div className="flex-1 h-2.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.value / max) * 100}%`, background: color }}
                />
              </div>
              <div className="w-10 text-right text-xs tabular-nums font-mono">
                {r.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeseriesBars({
  weeks,
}: {
  weeks: { weekLabel: string; newListings: number; newSignups: number }[];
}) {
  const max = Math.max(
    1,
    ...weeks.map((w) => Math.max(w.newListings, w.newSignups)),
  );
  return (
    <div>
      <div className="flex items-end gap-2 h-32">
        {weeks.map((w) => (
          <div key={w.weekLabel} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 justify-center h-full">
              <div
                title={`${w.newListings} listings`}
                className="w-2 sm:w-2.5 rounded-t bg-[color:var(--color-primary)]"
                style={{ height: `${(w.newListings / max) * 100}%` }}
              />
              <div
                title={`${w.newSignups} signups`}
                className="w-2 sm:w-2.5 rounded-t bg-[color:var(--color-warm)]"
                style={{ height: `${(w.newSignups / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {weeks.map((w) => (
          <div
            key={w.weekLabel}
            className="flex-1 text-center text-[10px] mono !normal-case text-[color:var(--color-muted)]"
          >
            {w.weekLabel}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-[color:var(--color-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[color:var(--color-primary)]" />
          New listings
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[color:var(--color-warm)]" />
          New signups
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  text,
}: {
  status: "ok" | "warn" | "down";
  text: string;
}) {
  const tone =
    status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : status === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest rounded-full px-2.5 py-1 ${tone}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "ok" ? "bg-emerald-500" : status === "warn" ? "bg-amber-500" : "bg-red-500"}`}
      />
      {text}
    </span>
  );
}
