"use client";

import dynamic from "next/dynamic";
import type { LiveRadarMapProps } from "./LiveRadarMap";

const LiveRadarMap = dynamic(() => import("./LiveRadarMap"), {
  ssr: false,
  loading: () => (
    <div className="radar-panel w-full h-[420px] md:h-[460px] flex items-center justify-center">
      <div className="text-xs mono text-white/50">Booting radar…</div>
    </div>
  ),
});

export default function RadarMapLoader(props: LiveRadarMapProps) {
  return <LiveRadarMap {...props} />;
}
