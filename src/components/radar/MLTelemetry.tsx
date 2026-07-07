"use client";

import { useEffect, useMemo, useState } from "react";
import model from "@/lib/ml/model.json";
import { npr } from "@/lib/format";
import { VERDICT_TONE, VERDICT_LABEL, type RadarModel, type RadarPoint } from "./types";

type FeedRow = {
  point: RadarPoint;
  phase: "computing" | "done";
  startedAt: number;
};

export type MLTelemetryProps = {
  revealed: RadarPoint[];
  current: RadarPoint | null;
  meta: RadarModel;
  reducedMotion: boolean;
  scanned: number;
};

export default function MLTelemetry({
  revealed,
  current,
  meta,
  reducedMotion,
  scanned,
}: MLTelemetryProps) {
  const feed = useInferenceFeed(revealed, reducedMotion);
  const contributions = useMemo(
    () => (current ? topContributions(current) : []),
    [current],
  );

  return (
    <div className="radar-panel p-4 md:p-5 flex flex-col gap-4 h-full">
      <Header meta={meta} reducedMotion={reducedMotion} />

      <div className="grid gap-4">
        <InferenceFeed feed={feed} />
        <ContribBars contributions={contributions} current={current} />
        <div className="grid grid-cols-2 gap-3">
          <R2Gauge r2={meta.r2} reducedMotion={reducedMotion} />
          <Throughput scanned={scanned} reducedMotion={reducedMotion} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------- header ------------------------- */

function Header({ meta, reducedMotion }: { meta: RadarModel; reducedMotion: boolean }) {
  return (
    <div className="border-b border-white/10 pb-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] mono text-white/60 tracking-wider">
          MODEL · fair-rent v1 · LINEAR (served)
        </div>
        <div className="flex items-center gap-1.5 text-[10px] mono">
          <span
            className={`w-2 h-2 rounded-full bg-emerald-400 ${reducedMotion ? "" : "radar-pulse-dot"}`}
          />
          <span className="text-emerald-300 tracking-wider">ONLINE</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-white">
        <Stat label="R²" value={meta.r2.toFixed(3)} />
        <Stat label="MAE" value={`Rs ${meta.mae.toLocaleString("en-IN")}`} />
        <Stat label="TRAIN" value={`${meta.nTrain}`} />
        <Stat label="TEST" value={`${meta.nTest}`} />
      </div>
      <div className="mt-2 text-[10px] mono text-white/45 tracking-wider">
        ENSEMBLE BENCH: {meta.best} · R² {meta.r2.toFixed(3)} · MAE Rs{" "}
        {meta.mae.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] mono text-white/40 tracking-widest">{label}</div>
      <div className="font-mono text-sm md:text-[15px] tabular-nums text-white/95">
        {value}
      </div>
    </div>
  );
}

/* ------------------------- inference feed ------------------------- */

function useInferenceFeed(revealed: RadarPoint[], reducedMotion: boolean): FeedRow[] {
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const seenIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    if (revealed.length === 0) {
      setFeed([]);
      seenIds.clear();
      return;
    }
    const latest = revealed[revealed.length - 1];
    if (seenIds.has(latest.id + revealed.length)) return;
    seenIds.add(latest.id + revealed.length);

    const row: FeedRow = {
      point: latest,
      phase: "computing",
      startedAt: Date.now(),
    };
    setFeed((prev) => [row, ...prev].slice(0, 6));

    const delay = reducedMotion ? 0 : 500;
    const t = window.setTimeout(() => {
      setFeed((prev) =>
        prev.map((r) =>
          r.point.id === row.point.id && r.startedAt === row.startedAt
            ? { ...r, phase: "done" }
            : r,
        ),
      );
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed.length, reducedMotion]);

  return feed;
}

function InferenceFeed({ feed }: { feed: FeedRow[] }) {
  return (
    <div>
      <div className="text-[10px] mono text-white/45 tracking-widest mb-2">
        LIVE INFERENCE STREAM
      </div>
      <div className="flex flex-col gap-1.5 min-h-[168px]">
        {feed.length === 0 && (
          <div className="text-[11px] mono text-white/30">awaiting first scan…</div>
        )}
        {feed.map((r, i) => (
          <FeedLine key={`${r.point.id}-${r.startedAt}`} row={r} rank={i} />
        ))}
      </div>
    </div>
  );
}

function FeedLine({ row, rank }: { row: FeedRow; rank: number }) {
  const p = row.point;
  const tone = VERDICT_TONE[p.verdict];
  const opacity = Math.max(0.35, 1 - rank * 0.13);
  const diffPct = (p.diff * 100).toFixed(1);
  const diffSign = p.diff >= 0 ? "+" : "";
  return (
    <div
      className="font-mono text-[11.5px] leading-tight text-white/85 tabular-nums flex items-center gap-2 transition-opacity duration-500"
      style={{ opacity }}
    >
      <span className="text-emerald-300/70">▸</span>
      <span className="w-[150px] truncate text-white/70">
        {p.area}, {p.city} · {p.roomType}
      </span>
      {row.phase === "computing" ? (
        <span className="flex-1 h-3 rounded radar-shimmer" aria-label="computing" />
      ) : (
        <>
          <span className="text-white/50">pred</span>
          <span>{npr(p.predicted)}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/50">listed</span>
          <span>{npr(p.rent)}</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={{
              background: `${tone}22`,
              color: tone,
              border: `1px solid ${tone}44`,
            }}
          >
            {VERDICT_LABEL[p.verdict]} · {diffSign}
            {diffPct}%
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------- contribution bars ------------------------- */

const FEATURE_LABEL: Record<string, string> = {
  sizeSqft: "Size (sqft)",
  floor: "Floor",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  furnished: "Furnished",
  waterSupply: "Water supply",
  parking: "Parking",
  attachedBathroom: "Attached bath",
  wifiReady: "Wi-Fi",
  kitchen: "Kitchen",
  balcony: "Balcony",
  city_Lalitpur: "City: Lalitpur",
  city_Bhaktapur: "City: Bhaktapur",
  roomType_1BHK: "Type: 1BHK",
  roomType_2BHK: "Type: 2BHK",
  roomType_Flat: "Type: Flat",
  roomType_Hostel: "Type: Hostel",
  area_price_index: "Area premium",
};

function topContributions(p: RadarPoint) {
  const b = (v: boolean) => (v ? 1 : 0);
  const areaIdx =
    (model.areaIndex as Record<string, number>)[p.area] ??
    model.defaultAreaIndex;
  const values: Record<string, number> = {
    sizeSqft: p.sizeSqft,
    floor: p.floor,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    furnished: b(p.furnished),
    waterSupply: b(p.waterSupply),
    parking: b(p.parking),
    attachedBathroom: b(p.attachedBathroom),
    wifiReady: b(p.wifiReady),
    kitchen: b(p.kitchen),
    balcony: b(p.balcony),
    city_Lalitpur: p.city === "Lalitpur" ? 1 : 0,
    city_Bhaktapur: p.city === "Bhaktapur" ? 1 : 0,
    roomType_1BHK: p.roomType === "1BHK" ? 1 : 0,
    roomType_2BHK: p.roomType === "2BHK" ? 1 : 0,
    roomType_Flat: p.roomType === "Flat" ? 1 : 0,
    roomType_Hostel: p.roomType === "Hostel" ? 1 : 0,
    area_price_index: areaIdx,
  };
  const coef = model.coefficients as Record<string, number>;
  const contributions = Object.entries(coef).map(([f, c]) => ({
    feature: f,
    label: FEATURE_LABEL[f] ?? f,
    value: c * (values[f] ?? 0),
  }));
  return contributions
    .filter((c) => Math.abs(c.value) > 1)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);
}

function ContribBars({
  contributions,
  current,
}: {
  contributions: ReturnType<typeof topContributions>;
  current: RadarPoint | null;
}) {
  const max = Math.max(1, ...contributions.map((c) => Math.abs(c.value)));
  return (
    <div>
      <div className="text-[10px] mono text-white/45 tracking-widest mb-2 flex items-center justify-between">
        <span>WHY THIS PRICE — TOP CONTRIBUTIONS</span>
        {current && (
          <span className="text-white/40 truncate max-w-[55%]">
            {current.area}, {current.city}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 min-h-[124px]">
        {contributions.length === 0 && (
          <div className="text-[11px] mono text-white/30">
            waiting for a listing to score…
          </div>
        )}
        {contributions.map((c) => {
          const pos = c.value >= 0;
          const width = (Math.abs(c.value) / max) * 50;
          const tone = pos ? "#0e6e6e" : "#ea8b47";
          return (
            <div
              key={c.feature}
              className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-white/85"
            >
              <div className="w-[100px] truncate text-white/60">{c.label}</div>
              <div className="flex-1 flex items-center h-3 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
                {pos ? (
                  <div
                    className="absolute left-1/2 h-full rounded-r"
                    style={{
                      width: `${width}%`,
                      background: tone,
                      boxShadow: `0 0 6px ${tone}88`,
                    }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 h-full rounded-l"
                    style={{
                      width: `${width}%`,
                      background: tone,
                      boxShadow: `0 0 6px ${tone}88`,
                    }}
                  />
                )}
              </div>
              <div
                className="w-[70px] text-right"
                style={{ color: pos ? "#7dd6c8" : "#f2b788" }}
              >
                {pos ? "+" : "−"}Rs {Math.round(Math.abs(c.value)).toLocaleString("en-IN")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------- R² gauge ------------------------- */

function R2Gauge({ r2, reducedMotion }: { r2: number; reducedMotion: boolean }) {
  const [fill, setFill] = useState(reducedMotion ? r2 : 0);
  useEffect(() => {
    if (reducedMotion) {
      setFill(r2);
      return;
    }
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setFill(r2 * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [r2, reducedMotion]);

  // Semicircle: 180° arc, path length ≈ π·r
  const r = 42;
  const c = Math.PI * r;
  const dash = c * fill;

  return (
    <div className="rounded-xl border border-white/10 p-3 flex flex-col items-center">
      <div className="text-[10px] mono text-white/45 tracking-widest mb-2">
        MODEL FIT (R²)
      </div>
      <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
        <path
          d={`M 18 60 A ${r} ${r} 0 0 1 102 60`}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 18 60 A ${r} ${r} 0 0 1 102 60`}
          fill="none"
          stroke="#0e6e6e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: "drop-shadow(0 0 6px rgba(14,110,110,0.6))" }}
        />
        <text
          x="60"
          y="52"
          textAnchor="middle"
          fontFamily="ui-monospace, SF Mono, Menlo, monospace"
          fontSize="18"
          fill="#ffffff"
        >
          {fill.toFixed(3)}
        </text>
      </svg>
    </div>
  );
}

/* ------------------------- throughput ------------------------- */

function Throughput({
  scanned,
  reducedMotion,
}: {
  scanned: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-3 flex flex-col justify-between">
      <div className="text-[10px] mono text-white/45 tracking-widest">
        LISTINGS SCORED
      </div>
      <div className="font-mono text-2xl tabular-nums text-white mt-1">
        {scanned}
      </div>
      <div className="text-[10px] mono text-white/40 mt-1">
        LIVE SCAN RATE · ~{reducedMotion ? "0" : "0.6"}/s
      </div>
    </div>
  );
}
