# CLAUDE_NEW.md — Live Radar Hero + ML Telemetry Dashboard

## Mission
Add a **live "control-room" section** to the RoomRadar landing page (`src/app/page.tsx`) that makes the product feel alive and technical — inspired by a stock-market / trading analytics dashboard. Two linked panels:

1. **Live Radar Map** — a slowly drifting map of the Kathmandu Valley where room "pips" appear one-by-one with a spin + zoom-in/out animation, each showing the room's photo, price, and location, like live trades printing on a ticker.
2. **ML Telemetry Panel** — a live readout that visibly shows the fair-price model "working": each room that pops in is run through the model, and the panel streams the prediction, the verdict (below/fair/above), a rolling accuracy gauge, a feature-contribution bar, and a scrolling event log.

The whole thing runs on **your real seeded listings and your real exported model** — it is a *visualization* of the ML that already runs, not a fake. See "What is real vs. theatrical" below and keep that honesty; it's defensible at a viva.

---

## CRITICAL GROUND RULES (read before coding)
- **Do not break the existing build.** The current app works. This is additive. After finishing, `npm run build` must pass and every existing page must still render.
- **Do not change** the ML model, `predict.ts`, the DB schema, controllers' existing behavior, auth, or any other page. Only ADD.
- **Reuse what exists.** The prediction logic is `predictRent()` in `src/lib/ml/predict.ts`. Fair-price verdict is `fairness()` + `VERDICT_META` in `src/lib/fairPrice.ts`. Money formatting is `npr()` in `src/lib/format.ts`. Design tokens are CSS vars in `src/app/globals.css` (`--color-primary #0e6e6e`, `--color-ink`, `--color-warm #ea8b47`, `--color-canvas`, `--font-display` Fraunces, mono font). Match this palette exactly — teal primary, warm-orange accent, editorial serif headings, mono for numbers/labels.
- **The landing hero currently only renders for logged-out / seeker users** (owners→/dashboard, admins→/admin). Add the new section to the same public landing page, directly under the existing hero `<section>` and above "Featured rooms this week".
- **Respect `prefers-reduced-motion`**: if the user has it set, disable the drift and spin animations and just show the pips statically. This is an accessibility must and a good detail to mention at defence.
- Keep everything **client-side and self-contained** in new components. No new DB tables, no websockets, no new server infra.

---

## Data source (this is the important part — it's REAL)
The animation is fed by your actual listings so predictions are genuine.

### 1. New API route: `src/app/api/radar/route.ts`
A `GET` handler that returns a compact JSON array of real listings for the radar, each already scored by the real model.

```ts
import { NextResponse } from "next/server";
import { listListings } from "@/controllers/listingController";
import { predictRent } from "@/lib/ml/predict";
import { fairness } from "@/lib/fairPrice";

export const dynamic = "force-dynamic";

export async function GET() {
  const listings = await listListings({});
  const points = listings.map((l) => {
    // real model prediction (recomputed live so we can show the model "acting")
    const predicted = predictRent({
      city: l.city as any,
      area: l.area,
      roomType: l.roomType as any,
      sizeSqft: l.sizeSqft,
      floor: l.floor,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      furnished: l.furnished,
      waterSupply: l.waterSupply,
      parking: l.parking,
      attachedBathroom: l.attachedBathroom,
      wifiReady: l.wifiReady,
      kitchen: l.kitchen,
      balcony: l.balcony,
    });
    const { diff, verdict } = fairness(l.rent, predicted);
    return {
      id: l.id,
      title: l.title,
      area: l.area,
      city: l.city,
      roomType: l.roomType,
      rent: l.rent,
      predicted,
      diff,            // (listed - predicted)/predicted
      verdict,         // below | fair | slightlyHigh | high
      lat: l.latitude,
      lng: l.longitude,
      photo: l.photoUrl ?? null,
      sizeSqft: l.sizeSqft,
    };
  });
  return NextResponse.json({
    points,
    // model metadata for the telemetry header (pulled from the real metrics file)
    model: await getModelMeta(),
  });
}

async function getModelMeta() {
  const metrics = (await import("@/lib/ml/metrics.json")).default as any;
  // served model is linear; comparison table lists all three
  const best = metrics.comparison?.reduce((a: any, b: any) => (b.r2 > a.r2 ? b : a));
  return {
    served: "Linear Regression",
    best: best?.model ?? "Gradient Boosting",
    r2: best?.r2 ?? 0.969,
    mae: best?.mae ?? 1807,
    nTrain: metrics.n_train ?? 640,
    nTest: metrics.n_test ?? 160,
    featureImportance: metrics.featureImportance ?? [],
  };
}
```

> Note: if `l.photoUrl` is null for seeded rows, the pip falls back to a colored gradient tile (same as the cards). Also handle the Cloudinary media JSON if your listing stores images there — reuse whatever `ListingCard` uses (`firstImage(media) ?? listing.photoUrl`). Check `ListingCard.tsx` and mirror its image resolution so pips show the same cover photo.

---

## Component 1 — `src/components/radar/LiveRadarMap.tsx` (`"use client"`)

A Leaflet map that **auto-drifts** and prints room pips over time.

### Behavior
- Full-width, ~420px tall on desktop, ~320px on mobile. Rounded-3xl, subtle inner border, dark "control-room" styling (see styling note).
- On mount, fetch `/api/radar`. Shuffle the points. Then reveal them **one every ~1.6s** on a loop (when it reaches the end, it clears and starts again, so the section always feels live). Keep a "live" pulsing dot + "LIVE" label in a corner.
- **Slow drift**: gently pan the map in a slow closed loop around the Valley center (`27.7050, 85.3300`, zoom ~12.3) using `map.panTo` on an interval with eased offsets, OR a slow `flyTo` between 3–4 Valley waypoints (Kathmandu core → Lalitpur → Bhaktapur → back). Speed: a full loop ~40–60s. Disable if `prefers-reduced-motion`.
- **Pip animation on appear**: each new listing drops a custom `L.divIcon` marker that plays a CSS keyframe: start `scale(0) rotate(-180deg)` opacity 0 → overshoot `scale(1.15) rotate(10deg)` → settle `scale(1) rotate(0)`. ~700ms, ease-out-back. After settling, the pip shows a small dot colored by verdict (teal=fair, orange=slightly high, red=above, blue=below — reuse `VERDICT_META` tones).
- **Pip popup card**: when a pip appears, also surface a floating "just detected" card near it (or in a fixed corner stack) showing: the room photo (or gradient), title, area+city, `npr(rent)`, and a verdict chip. The card itself animates in with the same zoom/spin flourish, then fades after ~4s. Think "trade just printed."
- Use the existing Leaflet setup pattern from `src/components/Map.tsx` (same `L.Icon.Default` CDN fix, same `TileLayer` OpenStreetMap URL). For a control-room look, you may switch the tile URL to a dark/muted theme: use CARTO's no-key dark tiles `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` (attribution: '&copy; OpenStreetMap &copy; CARTO'). Keep OSM as fallback. No API key needed.
- Must be dynamically imported with `{ ssr: false }` (Leaflet touches `window`). Create a tiny wrapper `RadarMapLoader.tsx` like the existing `MapLoader.tsx`.

### Styling note
Dark panel: background near `#0d1414` (a very dark teal-black), map slightly desaturated, pip dots and lines glowing in `--color-primary` / `--color-warm`. Concentric radar rings (reuse the SVG rings already in the hero) can be overlaid faintly and rotate slowly for the "sweep" feel. Add an optional rotating radar-sweep gradient cone if easy, but keep it subtle.

---

## Component 2 — `src/components/radar/MLTelemetry.tsx` (`"use client"`)

The "the model is thinking" panel — sits beside or below the map. This is what makes it feel technical. **Stock-dashboard aesthetic**: mono numbers, thin dividers, tiny animated sparklines, status LEDs.

Share state with the map so the SAME listing that just popped is the one being "scored" here (lift the reveal loop into the parent landing section, or use a small shared context / props callback: `onReveal(point) => ...`).

### Sub-parts
1. **Model status header**
   - "MODEL: fair-rent v1 · LINEAR (served)" + a green pulsing "ONLINE" LED.
   - Small stat row from `model` meta: `R² {r2}`, `MAE Rs {mae}`, `trained on {nTrain} listings`, `tested on {nTest}`. Present these as mono "gauges".
   - A subtle line: "Ensemble benchmark: {best} R² {r2}" so the 3-model comparison is visible.

2. **Live inference feed** (the centerpiece)
   - Each time a room is revealed on the map, print a row here with a typewriter/stream-in effect:
     - `▸ {area}, {city} · {roomType}` 
     - a one-line "computing…" state for ~500ms (progress shimmer) — this is the visible "ML acting" beat
     - then resolve to: `predicted Rs {predicted} · listed Rs {rent} · {verdict chip} ({+/-diff%})`
   - Keep the last ~6 rows, newest on top, older ones fade down and out. Monospace, tabular numbers.

3. **Feature contribution bar** (shows the model "using its features")
   - For the currently-scored room, show a small horizontal breakdown of which features pushed the predicted rent up/down. You can approximate this honestly by multiplying the room's feature values by the **real coefficients** from `model.json` (import it) — e.g. `sizeSqft * coef.sizeSqft`, `parking * coef.parking`, city one-hot * its coef, plus `area_price_index * coef`. Show the top 4–5 contributors as labeled bars (teal for +, orange for −). This is genuinely the model's math, animated — great viva material.
   - Header: "WHY THIS PRICE — top feature contributions".

4. **Rolling accuracy gauge**
   - A circular or arc gauge showing the model's R² (from metrics), animating a needle/arc fill on mount to e.g. 0.96. Label "MODEL FIT (R²)".
   - Optional: a tiny running scatter of the last N (listed vs predicted) points reusing the same idea as `ActualVsPredicted` but mini.

5. **Throughput ticker**
   - A mono counter "LISTINGS SCORED: {n}" that increments as pips appear, plus "predictions/sec" faux-metric derived from the reveal rate (label it "live scan rate"). Keep honest: it's the scan animation rate, not a benchmark.

### Animation library
Use **pure CSS keyframes + React state/`setInterval`/`requestAnimationFrame`**. Do NOT add new heavy deps. `recharts` is already installed if you want the mini scatter/gauge; otherwise hand-roll small SVGs. Framer-motion is NOT installed — don't add it; use CSS transitions.

---

## Component 3 — wire it into the landing page

In `src/app/page.tsx`, add a new `<section>` between the existing hero section and "Featured rooms this week":

```tsx
{/* Live control room */}
<section className="max-w-7xl mx-auto px-5 mt-14">
  <div className="flex items-end justify-between mb-5">
    <div>
      <div className="mono">Live · Valley rent radar</div>
      <h2 className="font-display text-3xl md:text-4xl font-semibold text-[color:var(--color-ink)]">
        The market, scored in real time
      </h2>
    </div>
    <span className="hidden md:inline-flex items-center gap-2 text-xs mono">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> MODEL ONLINE
    </span>
  </div>

  <RadarControlRoom />   {/* parent client component holding shared reveal state, map left + telemetry right */}
</section>
```

Create `src/components/radar/RadarControlRoom.tsx` (`"use client"`) as the parent that:
- fetches `/api/radar` once,
- owns the reveal loop (one point every ~1.6s, looping),
- renders a responsive grid: `LiveRadarMap` (left, ~60%) and `MLTelemetry` (right, ~40%); stacks vertically on mobile with the map on top,
- passes the "currently revealed point" + running list to both children so they stay in sync.

---

## CSS keyframes to add to `globals.css`
Add these (namespaced `radar-`) — do not touch existing rules:

```css
@keyframes radar-pip-in {
  0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes radar-card-in {
  0%   { transform: scale(.7) rotate(-8deg); opacity: 0; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes radar-sweep { to { transform: rotate(360deg); } }
@keyframes radar-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.radar-pip { animation: radar-pip-in .7s cubic-bezier(.34,1.56,.64,1) both; }
.radar-card { animation: radar-card-in .5s cubic-bezier(.34,1.56,.64,1) both; }
.radar-sweep { animation: radar-sweep 6s linear infinite; }
.radar-shimmer {
  background: linear-gradient(90deg, transparent, rgba(14,110,110,.25), transparent);
  background-size: 200% 100%; animation: radar-shimmer 1s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .radar-pip, .radar-card, .radar-sweep, .radar-shimmer { animation: none !important; }
}
```

---

## What is REAL vs. THEATRICAL (keep this honest — for the viva)
State this clearly in your README and be ready to say it:
- **REAL:** the listings (from your DB), each prediction (your exported linear model via `predictRent`), the verdict/fair-price math, the feature-contribution bars (actual coefficient × feature value), the R²/MAE/model-comparison numbers (from your real training run).
- **THEATRICAL (presentation only):** the *timing* of reveals (we stagger them ~1.6s apart for a live feel — the data isn't literally arriving live), the map drift/sweep, the "computing…" shimmer beat (the real prediction is instant; the pause is a UI flourish), and the "scan rate" counter (it's the animation cadence, not a throughput benchmark).
- If asked "is this real-time streaming data?": *"The predictions and scores are real and computed by our model; the live cadence is a visualization of the model scoring our listing set. We didn't build multi-user live data streaming — that's future work."*

This framing means nothing on screen is a lie — it's a dashboard visualizing a real model, exactly like a analytics terminal replays real trades.

---

## Build order for Claude Code
1. Add the CSS keyframes to `globals.css`.
2. Create `src/app/api/radar/route.ts` and test it returns JSON (`curl localhost:3000/api/radar`).
3. Build `LiveRadarMap.tsx` + `RadarMapLoader.tsx` (get pips appearing with animation on the drifting map first).
4. Build `MLTelemetry.tsx` (inference feed + feature bars + gauge).
5. Build `RadarControlRoom.tsx` parent to sync them.
6. Wire into `page.tsx`.
7. `npm run build` — fix any type/lint errors. Verify existing pages still work.
8. Test with `prefers-reduced-motion` on (DevTools → Rendering → emulate) to confirm animations disable.

## Acceptance checklist
- [ ] Landing page shows a dark live-radar section under the hero.
- [ ] Map slowly drifts across the Valley; room pips pop in with spin+zoom, colored by verdict.
- [ ] A "just detected" card flourishes in with photo + price + area per pip.
- [ ] Telemetry panel streams real predictions with a visible "computing" beat, verdict chips, and %diff.
- [ ] Feature-contribution bars reflect real model coefficients.
- [ ] R²/MAE gauge + model-comparison line show real metrics.
- [ ] `prefers-reduced-motion` disables motion.
- [ ] `npm run build` passes; all existing pages unaffected.
- [ ] README updated with the "real vs theatrical" honesty note.
```