"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CITIES, AREAS, ROOM_TYPES, AMENITIES, type City } from "@/lib/constants";
import Button from "@/components/ui/Button";

export default function SearchFilters({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [city, setCity] = useState<City | "">((sp.get("city") as City) || "");
  const [area, setArea] = useState(sp.get("area") ?? "");
  const [roomType, setRoomType] = useState(sp.get("roomType") ?? "");
  const [minRent, setMinRent] = useState(sp.get("minRent") ?? "");
  const [maxRent, setMaxRent] = useState(sp.get("maxRent") ?? "");
  const [amenities, setAmenities] = useState<string[]>(sp.getAll("amenities"));

  const areas = city ? AREAS[city] : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (area) p.set("area", area);
    if (roomType) p.set("roomType", roomType);
    if (minRent) p.set("minRent", minRent);
    if (maxRent) p.set("maxRent", maxRent);
    for (const a of amenities) p.append("amenities", a);
    startTransition(() => {
      router.push(`/listings?${p.toString()}`);
    });
  }

  const toggleAmenity = (k: string) =>
    setAmenities((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );

  return (
    <form onSubmit={submit} className="card p-4 md:p-5">
      <div
        className={`grid gap-3 ${compact ? "md:grid-cols-4" : "md:grid-cols-6"}`}
      >
        <div className="flex flex-col">
          <label className="mono mb-1">City</label>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value as City);
              setArea("");
            }}
            className="bg-transparent text-sm focus:outline-none border-b border-black/10 pb-1"
          >
            <option value="">Any city</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mono mb-1">Area</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            disabled={!city}
            className="bg-transparent text-sm focus:outline-none border-b border-black/10 pb-1 disabled:opacity-40"
          >
            <option value="">Any area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mono mb-1">Room type</label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="bg-transparent text-sm focus:outline-none border-b border-black/10 pb-1"
          >
            <option value="">Any</option>
            {ROOM_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mono mb-1">Min rent</label>
          <input
            type="number"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            placeholder="Rs 5,000"
            className="bg-transparent text-sm focus:outline-none border-b border-black/10 pb-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="mono mb-1">Max rent</label>
          <input
            type="number"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            placeholder="Rs 25,000"
            className="bg-transparent text-sm focus:outline-none border-b border-black/10 pb-1"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isPending}
        >
          Search
        </Button>
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const active = amenities.includes(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAmenity(a.key)}
                className={`text-xs rounded-full px-3 py-1.5 border ${
                  active
                    ? "bg-[color:var(--color-primary-tint)] border-[color:var(--color-primary)]/40 text-[color:var(--color-primary-600)]"
                    : "border-black/10 text-[color:var(--color-ink)]/70 hover:border-black/25"
                }`}
              >
                {active ? "✓ " : "+ "}
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}
