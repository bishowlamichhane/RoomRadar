"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { VALLEY_CENTER } from "@/lib/constants";
import { npr } from "@/lib/format";
import { useEffect } from "react";

type MapListing = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  rent: number;
  area: string;
  city: string;
};

export type MapProps = {
  listings: MapListing[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  // When set, render a shaded circle instead of a marker for the listing's
  // approximate area. Used on listing-detail pages while the exact location
  // is still gated behind a paid booking.
  approxCircle?: { lat: number; lng: number; radiusM: number };
};

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

export default function Map({
  listings,
  center,
  zoom,
  height = "100%",
  approxCircle,
}: MapProps) {
  const c = center ?? { lat: VALLEY_CENTER.lat, lng: VALLEY_CENTER.lng };
  const z = zoom ?? VALLEY_CENTER.zoom;
  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={[c.lat, c.lng]}
        zoom={z}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 16 }}
      >
        <IconFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {approxCircle ? (
          <Circle
            center={[approxCircle.lat, approxCircle.lng]}
            radius={approxCircle.radiusM}
            pathOptions={{
              color: "#0e6e6e",
              fillColor: "#0e6e6e",
              fillOpacity: 0.18,
              weight: 2,
              dashArray: "6 6",
            }}
          />
        ) : (
          listings.map((l) => (
            <Marker key={l.id} position={[l.latitude, l.longitude]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-xs opacity-70">
                    {l.area}, {l.city}
                  </div>
                  <div className="mt-1 font-semibold">{npr(l.rent)}/mo</div>
                  <a
                    className="text-[color:var(--color-primary)] underline text-xs"
                    href={`/listings/${l.id}`}
                  >
                    View listing →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
