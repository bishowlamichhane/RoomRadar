"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { npr } from "@/lib/format";
import { VERDICT_TONE, VERDICT_LABEL, type RadarPoint } from "./types";

const CENTER: [number, number] = [27.705, 85.33];
const WAYPOINTS: { lat: number; lng: number; zoom: number }[] = [
  { lat: 27.705, lng: 85.33, zoom: 12.3 },
  { lat: 27.7175, lng: 85.311, zoom: 12.6 }, // Kathmandu core
  { lat: 27.679, lng: 85.317, zoom: 12.7 }, // Lalitpur
  { lat: 27.672, lng: 85.435, zoom: 12.6 }, // Bhaktapur
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

function Drift({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const step = () => {
      const wp = WAYPOINTS[i % WAYPOINTS.length];
      map.flyTo([wp.lat, wp.lng], wp.zoom, {
        duration: 12,
        easeLinearity: 0.35,
      });
      i++;
    };
    step();
    const id = window.setInterval(step, 12500);
    return () => window.clearInterval(id);
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
};

export default function LiveRadarMap({
  revealed,
  current,
  reducedMotion,
}: LiveRadarMapProps) {
  // Rolling stack of the last ~3 "just detected" cards
  const cards = useMemo(() => revealed.slice(-3).reverse(), [revealed]);

  return (
    <div className="radar-panel relative w-full h-[420px] md:h-[460px]">
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
        zoom={12.3}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
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
        <Drift enabled={!reducedMotion} />
        {revealed.map((p) => (
          <PipMarker
            key={p.id}
            point={p}
            reducedMotion={reducedMotion}
            isCurrent={current?.id === p.id}
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

      {/* Just-detected floating card stack */}
      <div
        aria-hidden={false}
        className="absolute right-3 top-11 md:top-12 z-[500] flex flex-col gap-2 w-[240px] md:w-[260px] pointer-events-none"
      >
        {cards.map((p, i) => (
          <JustDetectedCard
            key={`${p.id}-${i}`}
            point={p}
            fade={i > 0}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

function PipMarker({
  point,
  reducedMotion,
  isCurrent,
}: {
  point: RadarPoint;
  reducedMotion: boolean;
  isCurrent: boolean;
}) {
  const tone = VERDICT_TONE[point.verdict];
  // Regenerate icon so animation replays for the "current" pip; other pips keep a stable icon.
  const iconKey = isCurrent ? `${point.id}-current` : point.id;
  const icon = useMemo(
    () => makePipIcon(tone, reducedMotion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iconKey, tone, reducedMotion],
  );
  return <Marker position={[point.lat, point.lng]} icon={icon} />;
}

function JustDetectedCard({
  point,
  fade,
  reducedMotion,
}: {
  point: RadarPoint;
  fade: boolean;
  reducedMotion: boolean;
}) {
  const tone = VERDICT_TONE[point.verdict];
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`${reducedMotion ? "" : "radar-card"} rounded-2xl overflow-hidden border shadow-lg transition-opacity duration-700 ${fade ? "opacity-60" : "opacity-100"}`}
      style={{
        background: "rgba(13, 20, 20, 0.92)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
      }}
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
    </div>
  );
}
