"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { memo, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { npr } from "@/lib/format";
import { VERDICT_TONE, VERDICT_LABEL, type RadarPoint } from "./types";

const CENTER: [number, number] = [27.705, 85.33];
const HERO_ZOOM = 12;
// Panning only (zoom stays fixed) — tile reloads during zoom changes were the
// biggest source of visual jitter. A single zoom + panTo is butter smooth.
const WAYPOINTS: { lat: number; lng: number }[] = [
  { lat: 27.705, lng: 85.33 }, // valley center
  { lat: 27.7175, lng: 85.311 }, // Kathmandu core
  { lat: 27.700, lng: 85.320 }, // midpoint
  { lat: 27.679, lng: 85.317 }, // Lalitpur
  { lat: 27.680, lng: 85.380 }, // midpoint
  { lat: 27.672, lng: 85.435 }, // Bhaktapur
];

function IconFix() {
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
  return null;
}

const LEG_SECONDS = 10; // constant-speed drift across each waypoint

function Drift({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    // Leaflet's PosAnimation handles the actual motion (GPU CSS transform
    // + rAF internally). We give it easeLinearity: 1 so speed is constant
    // (no ease-out crawl) and chain the NEXT leg on the map's own
    // `moveend` event so the seam between legs is truly zero — no
    // setInterval drift, no dead time, no overlap.
    //
    // The first waypoint is the map's initial center → that first panTo
    // resolves instantly (Leaflet fires moveend immediately when offset
    // is zero), which then triggers our chain into the second waypoint.
    // Net effect: motion starts on the first frame after mount.
    let cancelled = false;
    let i = 0;
    const goToNext = () => {
      if (cancelled) return;
      const wp = WAYPOINTS[i % WAYPOINTS.length];
      i++;
      map.panTo([wp.lat, wp.lng], {
        animate: true,
        duration: LEG_SECONDS,
        easeLinearity: 1,
      });
    };
    map.on("moveend", goToNext);
    goToNext();
    return () => {
      cancelled = true;
      map.off("moveend", goToNext);
    };
  }, [map, enabled]);
  return null;
}

function makePipIcon(tone: string, reduced: boolean): L.DivIcon {
  return L.divIcon({
    className: "radar-pip-wrap",
    html: `<div class="${reduced ? "" : "radar-pip"}" style="--pip-tone:${tone};">
      <div class="radar-pip-ring"></div>
      <div class="radar-pip-dot"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export type LiveRadarMapProps = {
  revealed: RadarPoint[];
  current: RadarPoint | null;
  reducedMotion: boolean;
  /** Wrapper class controls sizing/border. Default gives it a fixed height. */
  className?: string;
  /** Suppress the floating "just detected" card stack (used in hero mode). */
  hideCards?: boolean;
  /**
   * When true, the map holds still (no flyTo drift). Pips still animate.
   * Prevents the "hero background jittering" effect on the landing page.
   */
  staticView?: boolean;
};

const DEFAULT_WRAPPER = "w-full h-[420px] md:h-[460px]";

export default function LiveRadarMap({
  revealed,
  current,
  reducedMotion,
  className,
  hideCards,
  staticView,
}: LiveRadarMapProps) {
  const router = useRouter();
  // Stable across renders — react-leaflet's <Marker> gets the same
  // handler ref every time, so with React.memo on PipMarker below it
  // skips the re-render entirely.
  const go = useCallback(
    (id: string) => router.push(`/listings/${id}`),
    [router],
  );
  // Rolling stack of the last ~3 "just detected" cards
  const cards = useMemo(() => revealed.slice(-3).reverse(), [revealed]);

  return (
    <div className={`radar-panel relative isolate ${className ?? DEFAULT_WRAPPER}`}>
      {/* faint concentric radar rings overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] pointer-events-none z-[400]"
      >
        <svg viewBox="0 0 800 460" className="w-full h-full">
          <g stroke="#7dd6c8" strokeWidth="1" fill="none">
            <circle cx="400" cy="230" r="70" />
            <circle cx="400" cy="230" r="140" />
            <circle cx="400" cy="230" r="210" />
            <circle cx="400" cy="230" r="280" />
            <line x1="400" y1="20" x2="400" y2="440" />
            <line x1="20" y1="230" x2="780" y2="230" />
          </g>
        </svg>
      </div>

      {/* rotating radar cone (subtle) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[401] flex items-center justify-center"
      >
        <div
          className="radar-cone-sweep w-[70%] aspect-square rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(14,110,110,0.28) 0deg, rgba(14,110,110,0.04) 40deg, transparent 90deg, transparent 360deg)",
            mixBlendMode: "screen",
          }}
        />
      </div>

      <MapContainer
        center={CENTER}
        zoom={HERO_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        zoomSnap={1}
        zoomAnimation={false}
        fadeAnimation={false}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: 24,
          background: "#0d1414",
        }}
      >
        <IconFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Drift enabled={!reducedMotion && !staticView} />
        {revealed.map((p) => (
          <PipMarker
            key={p.id}
            point={p}
            reducedMotion={reducedMotion}
            isCurrent={current?.id === p.id}
            onGo={go}
          />
        ))}
      </MapContainer>

      {/* LIVE label */}
      <div className="absolute top-3 left-4 z-[500] flex items-center gap-2 text-[11px] mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400 radar-pulse-dot" />
        <span className="text-emerald-300/90 tracking-wider">LIVE</span>
        <span className="text-white/40">·</span>
        <span className="text-white/60">
          Kathmandu Valley · scanning {revealed.length} listings
        </span>
      </div>

      {/* Just-detected floating card stack — only rendered from lg+ so it
          never fights hero-mode copy for horizontal space on phones/tablets. */}
      {!hideCards && (
        <div
          aria-hidden={false}
          className="absolute right-3 top-11 md:top-12 z-[500] hidden lg:flex flex-col gap-2 w-[260px]"
        >
          {cards.map((p, i) => (
            <JustDetectedCard
              key={`${p.id}-${i}`}
              point={p}
              fade={i > 0}
              reducedMotion={reducedMotion}
              onClick={() => go(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// React.memo'd so parent re-renders (every ~3.4s from the reveal loop) don't
// cascade DOM work into every pip while a pan animation is running.
const PipMarker = memo(function PipMarker({
  point,
  reducedMotion,
  isCurrent,
  onGo,
}: {
  point: RadarPoint;
  reducedMotion: boolean;
  isCurrent: boolean;
  onGo: (id: string) => void;
}) {
  const tone = VERDICT_TONE[point.verdict];
  // Regenerate icon so animation replays for the "current" pip; other pips keep a stable icon.
  const iconKey = isCurrent ? `${point.id}-current` : point.id;
  const icon = useMemo(
    () => makePipIcon(tone, reducedMotion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iconKey, tone, reducedMotion],
  );
  // Memoise the position tuple so react-leaflet sees a stable prop ref and
  // doesn't re-sync the underlying L.Marker on every parent render.
  const position = useMemo(
    () => [point.lat, point.lng] as [number, number],
    [point.lat, point.lng],
  );
  const handlers = useMemo(
    () => ({ click: () => onGo(point.id) }),
    [onGo, point.id],
  );
  return <Marker position={position} icon={icon} eventHandlers={handlers} />;
});

function JustDetectedCard({
  point,
  fade,
  reducedMotion,
  onClick,
}: {
  point: RadarPoint;
  fade: boolean;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  const tone = VERDICT_TONE[point.verdict];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${reducedMotion ? "" : "radar-card"} text-left rounded-2xl overflow-hidden border shadow-lg transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 cursor-pointer w-full ${fade ? "opacity-60" : "opacity-100"}`}
      style={{
        background: "rgba(13, 20, 20, 0.92)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
      }}
      aria-label={`Open ${point.title}`}
    >
      <div className="flex gap-3 p-2.5">
        <div
          className="w-14 h-14 rounded-lg overflow-hidden flex-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(14,110,110,0.6), rgba(234,139,71,0.5))",
          }}
        >
          {point.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={point.photo}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] mono text-emerald-300/80 tracking-wider">
            ▸ NEW · {point.roomType}
          </div>
          <div className="text-[13px] text-white font-medium truncate">
            {point.area}, {point.city}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <div className="text-[13px] font-semibold text-white">
              {npr(point.rent)}
            </div>
            <span
              className="text-[10px] mono px-1.5 py-0.5 rounded-full"
              style={{
                background: `${tone}22`,
                color: tone,
                border: `1px solid ${tone}44`,
              }}
            >
              {VERDICT_LABEL[point.verdict]}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
