"use client";

import { useState } from "react";
import { MEDIA_CATEGORY_LABEL, type MediaItem } from "@/lib/media";

export default function ListingGallery({
  items,
  title,
}: {
  items: MediaItem[];
  title: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = items[activeIdx];
  if (!active) return null;

  return (
    <div className="space-y-4">
      {/* Main image — swaps when a thumbnail is clicked */}
      <div className="relative rounded-3xl overflow-hidden aspect-[16/9] bg-[color:var(--color-primary-tint)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.url}
          src={active.url}
          alt={title}
          className="w-full h-full object-cover asst-msg"
        />
        {active.category && (
          <span className="absolute top-3 left-3 bg-white/95 text-[11px] font-medium rounded-full px-2.5 py-1 text-[color:var(--color-ink)] shadow-sm">
            ◈ {MEDIA_CATEGORY_LABEL[active.category]}
          </span>
        )}
        {items.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-[11px] font-medium rounded-full px-3 py-1.5">
            {activeIdx + 1} / {items.length}
          </span>
        )}
      </div>

      {/* Thumbnails — click swaps the main image above */}
      {items.length > 1 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-semibold">Gallery</h2>
            <span className="text-xs text-[color:var(--color-muted)]">
              {items.length} photos
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((m, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  type="button"
                  key={m.url}
                  onClick={() => setActiveIdx(i)}
                  aria-pressed={isActive}
                  aria-label={
                    m.category
                      ? `Show ${MEDIA_CATEGORY_LABEL[m.category]} photo`
                      : `Show photo ${i + 1}`
                  }
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-[color:var(--color-primary-tint)] transition-all outline-none ${
                    isActive
                      ? "ring-2 ring-[color:var(--color-primary)] ring-offset-2 ring-offset-[color:var(--color-canvas)]"
                      : "border border-black/5 hover:border-black/25"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.category ?? "Listing photo"}
                    className={`w-full h-full object-cover transition-opacity ${
                      isActive ? "" : "opacity-90 hover:opacity-100"
                    }`}
                  />
                  {m.category && (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur text-white text-[10px] font-medium rounded-full px-2 py-0.5">
                      {MEDIA_CATEGORY_LABEL[m.category]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
