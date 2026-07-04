"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CITIES,
  AREAS,
  ROOM_TYPES,
  AMENITIES,
  AREA_COORDS,
  type City,
} from "@/lib/constants";
import { npr } from "@/lib/format";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import MediaUploader from "@/components/MediaUploader";
import FairPriceBadge from "@/components/FairPriceBadge";
import { fairness, VERDICT_META } from "@/lib/fairPrice";
import {
  serializeMedia,
  firstImage,
  firstVideo,
  type MediaItem,
} from "@/lib/media";

type FormState = {
  title: string;
  description: string;
  city: City;
  area: string;
  roomType: (typeof ROOM_TYPES)[number];
  sizeSqft: number;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  media: MediaItem[];
  furnished: boolean;
  waterSupply: boolean;
  parking: boolean;
  attachedBathroom: boolean;
  wifiReady: boolean;
  kitchen: boolean;
  balcony: boolean;
  latitude: number;
  longitude: number;
};

const defaultState: FormState = {
  title: "",
  description: "",
  city: "Kathmandu",
  area: "Baneshwor",
  roomType: "1BHK",
  sizeSqft: 450,
  floor: 2,
  bedrooms: 1,
  bathrooms: 1,
  rent: 15000,
  media: [],
  furnished: false,
  waterSupply: true,
  parking: false,
  attachedBathroom: true,
  wifiReady: true,
  kitchen: true,
  balcony: false,
  latitude: AREA_COORDS.Baneshwor.lat,
  longitude: AREA_COORDS.Baneshwor.lng,
};

export default function ListingForm({
  mode,
  initial,
  listingId,
}: {
  mode: "create" | "edit";
  initial?: Partial<FormState>;
  listingId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    ...defaultState,
    ...initial,
  });
  const [predicted, setPredicted] = useState<number | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const areas = AREAS[state.city];

  // sync coords when area changes
  useEffect(() => {
    const c = AREA_COORDS[state.area];
    if (c) setState((s) => ({ ...s, latitude: c.lat, longitude: c.lng }));
  }, [state.area]);

  // Live prediction (debounced)
  const featureKey = useMemo(
    () =>
      JSON.stringify({
        city: state.city,
        area: state.area,
        roomType: state.roomType,
        sizeSqft: state.sizeSqft,
        floor: state.floor,
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
        furnished: state.furnished,
        waterSupply: state.waterSupply,
        parking: state.parking,
        attachedBathroom: state.attachedBathroom,
        wifiReady: state.wifiReady,
        kitchen: state.kitchen,
        balcony: state.balcony,
      }),
    [state],
  );

  useEffect(() => {
    const t = setTimeout(async () => {
      setPredicting(true);
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: featureKey,
        });
        if (res.ok) {
          const j = await res.json();
          setPredicted(j.predictedRent);
        }
      } finally {
        setPredicting(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [featureKey]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { media, ...rest } = state;
      const payload = {
        ...rest,
        photoUrl: media.find((m) => m.type === "image")?.url ?? "",
        mediaUrls: serializeMedia(media),
      };
      const res = await fetch(
        mode === "create"
          ? "/api/listings"
          : `/api/listings/${listingId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      const j = await res.json();
      router.push(
        mode === "create" ? `/listings/${j.id}` : `/listings/${listingId}`,
      );
      router.refresh();
      // Keep submitting=true — the destination's loading.tsx takes over.
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <section className="card p-6 space-y-4">
          <div className="mono">Basics</div>
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              value={state.title}
              onChange={(e) => update("title", e.target.value)}
              required
              minLength={4}
              placeholder="Sunny 1BHK near Baneshwor Chowk"
              className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={state.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="A quick, honest description of the room…"
              className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">
              Photos &amp; video
            </label>
            <MediaUploader
              value={state.media}
              onChange={(next) => update("media", next)}
            />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <div className="mono">Location</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">City</label>
              <select
                value={state.city}
                onChange={(e) => {
                  const c = e.target.value as City;
                  update("city", c);
                  update("area", AREAS[c][0]);
                }}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Area</label>
              <select
                value={state.area}
                onChange={(e) => update("area", e.target.value)}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <div className="mono">Details</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium">Room type</label>
              <select
                value={state.roomType}
                onChange={(e) =>
                  update(
                    "roomType",
                    e.target.value as (typeof ROOM_TYPES)[number],
                  )
                }
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Size (sqft)</label>
              <input
                type="number"
                value={state.sizeSqft}
                onChange={(e) => update("sizeSqft", +e.target.value)}
                min={60}
                max={5000}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Floor</label>
              <input
                type="number"
                value={state.floor}
                onChange={(e) => update("floor", +e.target.value)}
                min={0}
                max={30}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bedrooms</label>
              <input
                type="number"
                value={state.bedrooms}
                onChange={(e) => update("bedrooms", +e.target.value)}
                min={0}
                max={10}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bathrooms</label>
              <input
                type="number"
                value={state.bathrooms}
                onChange={(e) => update("bathrooms", +e.target.value)}
                min={0}
                max={10}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Listed rent (NPR)</label>
              <input
                type="number"
                value={state.rent}
                onChange={(e) => update("rent", +e.target.value)}
                min={1000}
                max={500000}
                className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
              />
              {predicted !== null && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[color:var(--color-muted)]">
                  {predicting ? (
                    <>
                      <Spinner
                        size="xs"
                        className="text-[color:var(--color-primary)]"
                      />
                      Refreshing suggestion…
                    </>
                  ) : (
                    <>
                      Model suggests{" "}
                      <strong className="text-[color:var(--color-primary-600)]">
                        {npr(predicted)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => update("rent", predicted)}
                        className="text-[color:var(--color-primary)] hover:text-[color:var(--color-primary-600)] underline underline-offset-2 font-medium"
                      >
                        use it
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Amenities</div>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const key = a.key as keyof FormState;
                const active = !!state[key];
                return (
                  <button
                    type="button"
                    key={a.key}
                    onClick={() => update(key, !active as never)}
                    className={`text-xs rounded-full px-3 py-1.5 border ${
                      active
                        ? "bg-[color:var(--color-primary-tint)] border-[color:var(--color-primary)]/40 text-[color:var(--color-primary-600)]"
                        : "border-black/10 text-[color:var(--color-ink)]/70"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {a.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => update("furnished", !state.furnished)}
                className={`text-xs rounded-full px-3 py-1.5 border ${
                  state.furnished
                    ? "bg-[color:var(--color-primary-tint)] border-[color:var(--color-primary)]/40 text-[color:var(--color-primary-600)]"
                    : "border-black/10 text-[color:var(--color-ink)]/70"
                }`}
              >
                {state.furnished ? "✓ Furnished" : "+ Furnished"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="sticky top-24 space-y-4">
          <ListingPreview state={state} predicted={predicted} />

          {error && (
            <div className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            {mode === "create" ? "Publish listing" : "Save changes"}
          </Button>

          <p className="text-[11px] text-[color:var(--color-muted)] text-center leading-relaxed">
            Live preview of how your listing will appear to seekers.
            Edit anything on the left to update it.
          </p>
        </div>
      </aside>
    </form>
  );
}

function ListingPreview({
  state,
  predicted,
}: {
  state: FormState;
  predicted: number | null;
}) {
  const cover = firstImage(state.media);
  const hasVideo = !!firstVideo(state.media);
  const perks: string[] = [];
  perks.push(state.roomType);
  if (state.wifiReady) perks.push("Wi-Fi");
  if (state.parking) perks.push("Parking");
  if (state.attachedBathroom) perks.push("Attached bath");
  const line = perks.slice(0, 3).join(" · ");

  const showBadge = predicted !== null && state.rent > 0;
  const { verdict } = showBadge
    ? fairness(state.rent, predicted)
    : { verdict: "fair" as const };
  const verdictMeta = VERDICT_META[verdict];

  return (
    <div>
      <div className="mono mb-2 flex items-center justify-between">
        <span>◈ Preview</span>
        {showBadge && (
          <span className="normal-case tracking-normal text-[10px] text-[color:var(--color-muted)]">
            {verdictMeta.label.toLowerCase()} vs model
          </span>
        )}
      </div>
      <div className="card overflow-hidden">
        <div className="relative aspect-[4/3] bg-[color:var(--color-primary-tint)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[color:var(--color-primary-600)]/70 text-xs">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="mb-1.5 opacity-70"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.09-3.09a2 2 0 0 0-2.83 0L4 22" />
              </svg>
              Upload a photo to preview
            </div>
          )}
          <span className="absolute top-3 left-3 bg-white/95 text-[10px] font-medium rounded-full px-2.5 py-1 text-[color:var(--color-ink)]">
            ✓ Verified owner
          </span>
          {hasVideo && (
            <span className="absolute top-3 right-3 bg-black/70 text-white text-[9px] font-semibold rounded-full px-2 py-1 flex items-center gap-1">
              ▶ Video
            </span>
          )}
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          <div className="text-[12px] text-[color:var(--color-muted)] flex items-center gap-1">
            <span>◎</span>
            <span>
              {state.area}, {state.city}
            </span>
          </div>
          <div className="font-display text-[16px] leading-tight font-semibold text-[color:var(--color-ink)] line-clamp-2 min-h-[38px]">
            {state.title || (
              <span className="text-[color:var(--color-muted)] font-normal italic">
                Add a title…
              </span>
            )}
          </div>
          <div className="text-[11px] text-[color:var(--color-muted)]">
            {line}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div>
              <span className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                {npr(state.rent || 0)}
              </span>
              <span className="text-[11px] text-[color:var(--color-muted)] ml-1">
                /mo
              </span>
            </div>
            {showBadge && (
              <FairPriceBadge
                listed={state.rent}
                predicted={predicted}
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
