"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./Map";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[color:var(--color-primary-tint)] rounded-2xl text-sm text-[color:var(--color-muted)]">
      Loading map…
    </div>
  ),
});

export default function MapLoader(props: MapProps) {
  return <Map {...props} />;
}
