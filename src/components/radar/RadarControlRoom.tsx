"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RadarMapLoader from "./RadarMapLoader";
import MLTelemetry from "./MLTelemetry";
import type { RadarModel, RadarPayload, RadarPoint } from "./types";

const REVEAL_MS = 3400;
const MAX_ON_MAP = 18;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type RadarControlRoomProps = {
  /**
   * Which slice of the radar to render.
   *  - "map"       → just the LiveRadarMap (used on the landing page)
   *  - "telemetry" → just the ML telemetry side card (used on /admin)
   *  - "both"      → the original two-column control room
   */
  panel?: "map" | "telemetry" | "both";
  /**
   * When true, the map fills its parent (no fixed height) and drops the
   * floating "just detected" cards so hero content can sit on top cleanly.
   */
  heroMode?: boolean;
};

export default function RadarControlRoom({
  panel = "both",
  heroMode = false,
}: RadarControlRoomProps) {
  const [payload, setPayload] = useState<RadarPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RadarPoint[]>([]);
  const [current, setCurrent] = useState<RadarPoint | null>(null);
  const [scanned, setScanned] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const indexRef = useRef(0);
  const deckRef = useRef<RadarPoint[]>([]);

  // Detect reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Fetch listings + model meta
  useEffect(() => {
    let alive = true;
    fetch("/api/radar", { cache: "no-store" })
      .then((r) => r.json() as Promise<RadarPayload>)
      .then((json) => {
        if (!alive) return;
        setPayload(json);
        deckRef.current = shuffle(json.points);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "radar unavailable");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Reveal loop
  useEffect(() => {
    if (!payload || deckRef.current.length === 0) return;
    const tick = () => {
      const deck = deckRef.current;
      if (indexRef.current >= deck.length) {
        // reshuffle and start over (feels continuously live)
        deckRef.current = shuffle(payload.points);
        indexRef.current = 0;
        setRevealed([]);
      }
      const next = deckRef.current[indexRef.current];
      indexRef.current++;
      if (!next) return;
      setCurrent(next);
      setScanned((n) => n + 1);
      setRevealed((prev) => {
        const nx = [...prev, next];
        return nx.length > MAX_ON_MAP ? nx.slice(nx.length - MAX_ON_MAP) : nx;
      });
    };
    tick();
    const id = window.setInterval(tick, REVEAL_MS);
    return () => window.clearInterval(id);
  }, [payload]);

  const meta: RadarModel | null = useMemo(() => payload?.model ?? null, [payload]);

  const mapEl = (
    <RadarMapLoader
      revealed={revealed}
      current={current}
      reducedMotion={reducedMotion}
      className={heroMode ? "w-full h-full" : undefined}
      hideCards={heroMode}
    />
  );

  const telemetryEl = error ? (
    <div className="radar-panel p-4 text-[12px] mono text-red-300">
      Radar offline: {error}
    </div>
  ) : meta ? (
    <MLTelemetry
      revealed={revealed}
      current={current}
      meta={meta}
      scanned={scanned}
      reducedMotion={reducedMotion}
    />
  ) : (
    <div className="radar-panel p-4 text-[12px] mono text-white/50">
      Initializing model telemetry…
    </div>
  );

  if (panel === "map") return mapEl;
  if (panel === "telemetry") return telemetryEl;

  return (
    <div className="grid gap-4 md:gap-5 md:grid-cols-5">
      <div className="md:col-span-3">{mapEl}</div>
      <div className="md:col-span-2">{telemetryEl}</div>
    </div>
  );
}
