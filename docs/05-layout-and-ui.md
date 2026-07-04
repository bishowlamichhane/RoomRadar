# 05 — Layout, Pages & UI (and how to use Claude Design)

Mobile-friendly, clean, credible. This is what examiners see first, so make it look intentional — not a default template.

## Design direction
- **Brand**: "RoomRadar". Radar/location motif. Primary color a confident blue-teal; one warm accent for the "fair price" positive state and a red for "above fair".
- **Vibe**: modern Nepali proptech. Rounded cards, soft shadows, generous spacing, a real font pairing (e.g. a geometric sans for headings + readable sans for body). Avoid the stock Next.js look entirely.
- **Responsive**: single column on mobile; split list+map on desktop. Everything usable on a phone.

### Using Claude Design
For the visual layer, generate the component set with Claude Design, then paste/adapt into `src/components`. Specifically use it for: the **Navbar**, **ListingCard**, **SearchFilters**, **FairPriceBadge**, the **home split-view (list + map)**, and the **listing detail** layout. Prompt Claude Design with: the brand direction above, the three cities, the fair-price badge states, and Tailwind as the styling system so the output drops straight into this Next.js + Tailwind app. Keep the generated markup as Server Components unless they need interactivity.

## Root layout — `src/app/layout.tsx`
- Import `globals.css`, set fonts, wrap children in the app shell: `<Navbar/>`, `<main>`, `<Footer/>`.
- Import Leaflet CSS globally: add `import "leaflet/dist/leaflet.css";` in the layout (or globals) so maps render correctly.
- Set metadata: title "RoomRadar — Find fair-priced rooms in Kathmandu Valley".

## Pages

### Home `/` (= search + map)
- Header with tagline + a prominent search bar (city + area + price).
- `SearchFilters` (city, area, room type, price min/max, amenities checkboxes).
- Split view: left = scrollable `ListingCard` list; right = `Map` with markers for the current results.
- Each card shows photo, title, area/city, rent (formatted NPR), and a `FairPriceBadge`.
- Server component fetches listings (with optional searchParams filters) via the controller; the Map + Filters are client components receiving data as props.

### Listings browse `/listings`
- Can reuse the same search UI as home (or redirect home). Keep it simple — one good search screen.

### Listing detail `/listings/[id]`
- Full details, all amenities, a small `Map` centered on the listing.
- `FairPriceBadge` with the predicted rent and the delta ("Listed Rs 18,000 · Fair estimate Rs 15,200 · 18% above").
- If the viewer is the owner (or admin), show Edit/Delete buttons.

### Post listing `/listings/new` (OWNER)
- `ListingForm` with all feature fields (docs/01 feature set).
- **Live rent suggestion**: as the user fills size/city/area/roomType/amenities, debounce-call `POST /api/predict` and show "Suggested fair rent: Rs X". This is a headline demo moment — make it visible.
- On submit → `POST /api/listings`.

### Edit listing `/listings/[id]/edit` (OWNER, own listing only)
- Same `ListingForm` pre-filled → `PATCH /api/listings/[id]`.

### Owner dashboard `/dashboard`
- List the current owner's listings with edit/delete and each listing's fair-price status.

### Admin `/admin` (ADMIN)
- Two tables: all listings (with delete) and all users (with role + delete). Calls `/api/admin/*`.

### Results `/results` (defence page — link it in the footer)
- Model comparison table from `ml/metrics.json` (or `src/lib/ml`-imported metrics).
- `ActualVsPredicted` scatter (Recharts ScatterChart with a y=x reference line).
- `FeatureImportance` horizontal bar chart (Recharts).
- A short paragraph interpreting the results (location & size dominate, etc.).

## Key components
- **`FairPriceBadge.tsx`**: props `{ listed: number; predicted: number }`. Compute % diff via `lib/fairPrice.ts`. Render: green "Fair price" if within ±10%, amber "Slightly high/low" within ±10–20%, red "Above fair" / blue "Below market" beyond. Show the predicted number.
- **`Map.tsx`**: `"use client"`, dynamically imported with `ssr:false` from pages. Props: `listings` (id, lat, lng, title, rent). Use react-leaflet `MapContainer`, `TileLayer` (OpenStreetMap URL `https://{s}.tile.openstudio... ` → use the standard `https://tile.openstreetmap.org/{z}/{x}/{y}.png`), `Marker`, `Popup`. Fix the default marker icon issue (Leaflet's icons break under bundlers — set `L.Icon.Default` iconUrl to the CDN pngs or use a custom divIcon).
- **`ListingForm.tsx`**: `"use client"`, controlled inputs, Zod-validated on submit, wired to predict endpoint for the live suggestion.
- **`SearchFilters.tsx`**: `"use client"`, pushes filter state into the URL searchParams (so results are shareable and server-fetched).

## Leaflet marker-icon gotcha (do this or markers vanish)
In `Map.tsx`, before rendering, set:
```ts
import L from "leaflet";
import "leaflet/dist/leaflet.css";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
```

## Map default view
Center the map on the Kathmandu Valley: lat `27.7050`, lng `85.3300`, zoom `12` when showing all cities; recenter to a listing on the detail page.

## Accessibility & polish
- Real empty states ("No rooms match your filters").
- Loading states for the predict call.
- Format all money with `lib/format.ts` (`Rs 15,000`).
