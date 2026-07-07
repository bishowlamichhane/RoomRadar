import { getModelHealth, getSystemHealth, formatUptime } from "@/lib/systemHealth";
import { getAdminOverview } from "@/lib/adminStats";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const [ov, model, sys] = await Promise.all([
    getAdminOverview(),
    getModelHealth(),
    getSystemHealth(),
  ]);

  const trainedText = model.lastTrainedAt
    ? new Date(model.lastTrainedAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "unknown";

  return (
    <div className="space-y-8">
      <header>
        <div className="mono">Health & analytics</div>
        <h1 className="font-display text-3xl font-semibold text-[color:var(--color-ink)]">
          System, model & platform analytics
        </h1>
        <p className="text-[color:var(--color-muted)] text-sm mt-1">
          Deep-dive into the fair-rent model, runtime health, and platform-wide
          numbers.
        </p>
      </header>

      {/* Model health */}
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="mono">◈ Fair-rent model</div>
            <h2 className="font-display text-xl font-semibold text-[color:var(--color-ink)] mt-1">
              {model.served} · benchmark best is {model.best}
            </h2>
            <p className="text-[color:var(--color-muted)] text-sm mt-1">
              Last trained: {trainedText}
              {model.daysSinceTrained !== null && (
                <> · {model.daysSinceTrained} day{model.daysSinceTrained === 1 ? "" : "s"} ago</>
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <BigStat label="R²" value={model.r2.toFixed(3)} />
            <BigStat label="MAE" value={`Rs ${model.mae.toLocaleString("en-IN")}`} />
            <BigStat label="RMSE" value={`Rs ${model.rmse.toLocaleString("en-IN")}`} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="mono mb-2">Model comparison</div>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                  <th className="pb-2">Model</th>
                  <th className="pb-2 text-right">MAE</th>
                  <th className="pb-2 text-right">RMSE</th>
                  <th className="pb-2 text-right">R²</th>
                </tr>
              </thead>
              <tbody>
                {model.comparison.map((row) => {
                  const isBest = row.model === model.best;
                  return (
                    <tr key={row.model} className={isBest ? "bg-[color:var(--color-primary-tint)]" : ""}>
                      <td className="py-2 px-2 rounded-l-lg">
                        {row.model}
                        {isBest && (
                          <span className="ml-2 text-[10px] font-semibold text-[color:var(--color-primary-600)]">
                            BEST
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        Rs {row.mae.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        Rs {row.rmse.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums rounded-r-lg">
                        {row.r2.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <div className="mono mb-2">Top feature importance</div>
            <div className="space-y-1.5">
              {model.featureImportance.map((f) => (
                <FeatureRow key={f.feature} label={f.feature} value={f.importance} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* System health */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="mono">◈ Runtime</div>
            <h2 className="font-display text-xl font-semibold text-[color:var(--color-ink)] mt-1">
              Application & database
            </h2>
          </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BigStat label="DB latency" value={`${sys.db.latencyMs} ms`} />
          <BigStat label="Uptime" value={formatUptime(sys.process.uptimeSeconds)} />
          <BigStat label="Heap used" value={`${sys.process.heapUsedMB} MB`} />
          <BigStat label="RSS" value={`${sys.process.rssMB} MB`} />
          <BigStat label="Node" value={sys.process.nodeVersion} />
          <BigStat label="Platform" value={sys.process.platform} />
          <BigStat
            label="Heap total"
            value={`${sys.process.heapTotalMB} MB`}
          />
          <BigStat label="Snapshot" value={new Date(sys.timestamps.now).toLocaleTimeString()} />
        </div>
        {sys.db.error && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
            DB error: {sys.db.error}
          </div>
        )}
      </section>

      {/* Analytics */}
      <section className="grid gap-4 md:grid-cols-3">
        <DistBlock title="Listings by city" rows={ov.distribution.byCity} />
        <DistBlock title="Listings by room type" rows={ov.distribution.byRoomType} />
        <DistBlock
          title="Fair-price verdicts"
          rows={ov.distribution.byVerdict.map((v) => ({
            label: v.label,
            value: v.value,
          }))}
          tone="mixed"
        />
      </section>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--color-canvas)] border border-black/5 px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-semibold">
        {label}
      </div>
      <div className="text-[15px] font-semibold text-[color:var(--color-ink)] mt-1 truncate">
        {value}
      </div>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-[color:var(--color-ink)]/80 truncate">
        {label}
      </div>
      <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[color:var(--color-primary)]"
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
      <div className="w-14 text-right text-xs tabular-nums font-mono text-[color:var(--color-muted)]">
        {(value * 100).toFixed(1)}%
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
