# CLAUDE_ASSISTANT.md — "Radar Assistant" Chat Widget (rule-based, no external AI)

## Mission
Add a floating **chat assistant** to the RoomRadar site — a polished, themed chatbot that *feels* like an AI assistant (typing indicator, streamed replies, a credit counter, quick-reply chips) but is powered entirely by a **local keyword → answer JSON**. No API, no keys, no cost, works offline. It answers common questions about areas, prices, room types, and how RoomRadar works.

Be honest in naming/description: it's a **rule-based assistant** ("Radar Assistant"), not an LLM. That's a legitimate, defensible feature — a fast, deterministic FAQ/helper. Do NOT label it as "AI-powered" or imply it uses a language model.

---

## CRITICAL GROUND RULES
- **Additive only.** Do not modify the ML, DB, auth, existing pages, or the live-radar section. Only ADD new files + mount one component in the root layout.
- **No new heavy dependencies.** Pure React state + CSS. `recharts`/`leaflet` already exist; you need neither. Do NOT add framer-motion or any chat SDK.
- **Reuse design tokens** from `src/app/globals.css`: `--color-primary #0e6e6e` (teal), `--color-primary-600`, `--color-primary-tint`, `--color-ink`, `--color-muted`, `--color-canvas`, `--color-warm #ea8b47`, `--font-display` (Fraunces), and the mono font. The widget must look like it belongs to the site: teal primary bubbles, warm accent, editorial serif for the header, rounded-2xl/3xl, soft shadows.
- **Respect `prefers-reduced-motion`**: disable the typing bounce and slide-in animations when set.
- Client-only component; must not break SSR. Mount once, globally.

---

## Knowledge base — `src/lib/assistant/knowledge.json`
A structured JSON the matcher reads. Author it with the REAL data below (areas come from `src/lib/constants.ts`). Structure:

```json
{
  "meta": {
    "assistantName": "Radar Assistant",
    "disclaimer": "I'm a rule-based helper — I answer common questions about rooms, areas, and pricing on RoomRadar.",
    "creditLimit": 10
  },
  "areas": {
    "Kathmandu": ["Baneshwor","Koteshwor","Kalanki","Chabahil","Baluwatar","Maharajgunj","Kirtipur","Balaju","Gongabu","Samakhusi","Naxal","Thamel"],
    "Lalitpur": ["Kupondole","Jhamsikhel","Pulchowk","Satdobato","Lagankhel","Imadol","Ekantakuna","Sanepa","Bhaisepati"],
    "Bhaktapur": ["Suryabinayak","Kamalbinayak","Sallaghari","Dudhpati","Katunje","Sipadol","Thimi","Gatthaghar"]
  },
  "priceBands": {
    "Single Room": "Rs 5,000–12,000 / month",
    "1BHK": "Rs 10,000–20,000 / month",
    "2BHK": "Rs 16,000–32,000 / month",
    "Flat": "Rs 22,000–55,000 / month",
    "Hostel": "Rs 6,000–13,000 / month (per seat)"
  },
  "intents": [
    {
      "id": "greeting",
      "keywords": ["hi","hello","hey","namaste","yo","good morning","good evening"],
      "answer": "Namaste! 👋 I'm the Radar Assistant. Ask me about areas in Kathmandu, Lalitpur or Bhaktapur, typical rents, room types, or how the fair-price score works."
    },
    {
      "id": "areas_ktm",
      "keywords": ["kathmandu areas","where in kathmandu","kathmandu locations","baneshwor","samakhusi","thamel","koteshwor","naxal","chabahil","maharajgunj","balaju","gongabu","kalanki","kirtipur","baluwatar"],
      "answer": "In Kathmandu, RoomRadar lists rooms in Baneshwor, Koteshwor, Kalanki, Chabahil, Baluwatar, Maharajgunj, Kirtipur, Balaju, Gongabu, Samakhusi, Naxal and Thamel. Baneshwor, Naxal and Thamel tend to be pricier; Kirtipur and Kalanki are more affordable."
    },
    {
      "id": "areas_lalitpur",
      "keywords": ["lalitpur areas","patan","where in lalitpur","jhamsikhel","sanepa","kupondole","pulchowk","satdobato","lagankhel","imadol","ekantakuna","bhaisepati"],
      "answer": "In Lalitpur, we cover Kupondole, Jhamsikhel, Pulchowk, Satdobato, Lagankhel, Imadol, Ekantakuna, Sanepa and Bhaisepati. Jhamsikhel and Sanepa are premium; Satdobato and Imadol are gentler on the budget."
    },
    {
      "id": "areas_bhaktapur",
      "keywords": ["bhaktapur areas","where in bhaktapur","suryabinayak","kamalbinayak","sallaghari","dudhpati","katunje","sipadol","thimi","gatthaghar"],
      "answer": "In Bhaktapur, RoomRadar lists Suryabinayak, Kamalbinayak, Sallaghari, Dudhpati, Katunje, Sipadol, Thimi and Gatthaghar. Bhaktapur is generally the most affordable of the three cities."
    },
    {
      "id": "price_1bhk",
      "keywords": ["1bhk price","one bhk","1 bhk rent","1bhk cost","single bedroom"],
      "answer": "A 1BHK in the Valley typically runs Rs 10,000–20,000 / month, depending on area and amenities. Post it on RoomRadar and our fair-price model tells you if a listing is priced fairly."
    },
    {
      "id": "price_2bhk",
      "keywords": ["2bhk price","two bhk","2 bhk rent","2bhk cost","two bedroom"],
      "answer": "2BHK units usually range Rs 16,000–32,000 / month. Central Kathmandu and Jhamsikhel sit at the higher end; Bhaktapur and outer areas are lower."
    },
    {
      "id": "price_single",
      "keywords": ["single room","room price","cheapest","budget room","single room rent"],
      "answer": "A single room generally costs Rs 5,000–12,000 / month. Hostels (per seat) are Rs 6,000–13,000. Great for students — try Kirtipur, Kalanki, or Bhaktapur for value."
    },
    {
      "id": "price_flat",
      "keywords": ["flat price","whole flat","apartment rent","flat cost","full flat"],
      "answer": "A full flat typically ranges Rs 22,000–55,000 / month depending on size, floor and location."
    },
    {
      "id": "roomtypes",
      "keywords": ["room types","what types","kinds of rooms","options","bhk meaning"],
      "answer": "RoomRadar covers five types: Single Room, 1BHK, 2BHK, Flat, and Hostel. (BHK = Bedroom-Hall-Kitchen — so a 1BHK has one bedroom plus a hall and kitchen.)"
    },
    {
      "id": "fairprice",
      "keywords": ["fair price","fair rent","how price","prediction","ml","model","overpriced","is it fair","fair-price badge","how does the price"],
      "answer": "Every listing is scored by our fair-rent model, which learned from Valley listings. It compares the asking rent to a predicted fair rent and shows a badge: Below market, Fair price, Slightly high, or Above fair — so you instantly know if a room is a good deal."
    },
    {
      "id": "how_to_post",
      "keywords": ["post a room","add listing","list my room","how to post","become owner","rent out","list a flat"],
      "answer": "To post a room: register as an Owner, then go to “Post a room”. As you fill in the details, the model shows a live suggested rent so you can price it fairly. You can add photos too."
    },
    {
      "id": "how_to_search",
      "keywords": ["find a room","search","filter","how to find","looking for room","browse"],
      "answer": "Use the search bar or the Explore page. You can filter by city, area, room type, price range and amenities. Results show on a list and an interactive map, each with a fair-price badge."
    },
    {
      "id": "amenities",
      "keywords": ["amenities","facilities","parking","wifi","water","furnished","balcony","kitchen","attached bathroom"],
      "answer": "Listings can include Water Supply, Parking, Attached Bathroom, Wi-Fi Ready, Kitchen and Balcony. You can filter for the ones you need — parking and attached bathroom usually add the most to rent."
    },
    {
      "id": "account",
      "keywords": ["sign up","register","login","account","create account","how to join"],
      "answer": "Click “Get started” to register as a Seeker (to browse) or an Owner (to post rooms). It's free."
    },
    {
      "id": "coverage",
      "keywords": ["which cities","coverage","where do you work","areas covered","outside valley","pokhara","chitwan"],
      "answer": "Right now RoomRadar focuses on the Kathmandu Valley — Kathmandu, Lalitpur and Bhaktapur. More cities are on our future roadmap."
    },
    {
      "id": "contact",
      "keywords": ["contact","support","help","phone","email","complaint"],
      "answer": "For support, use the Contact link in the footer. For listing questions, the fair-price badge and this assistant cover most of what you'll need."
    },
    {
      "id": "thanks",
      "keywords": ["thanks","thank you","dhanyabad","great","cool","awesome"],
      "answer": "Happy to help! 🙂 Ask me anything else about rooms, areas or pricing."
    }
  ],
  "fallback": "I'm not sure about that one — I can help with areas (Kathmandu, Lalitpur, Bhaktapur), typical rents, room types, amenities, how to post or search, and how the fair-price score works. Try one of the suggestions below.",
  "quickReplies": [
    "1BHK price in Lalitpur?",
    "Areas in Bhaktapur",
    "How does fair-price work?",
    "How do I post a room?"
  ]
}
```

Feel free to EXPAND intents (more keywords, more Q&A) — aim for ~18–22 solid intents. Keep answers short (1–3 sentences), friendly, and factual.

---

## Matcher — `src/lib/assistant/match.ts`
A small, deterministic scorer. No dependencies.

```ts
import kb from "./knowledge.json";

export type Match = { answer: string; intentId: string | null };

function normalize(s: string) {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchIntent(userText: string): Match {
  const q = normalize(userText);
  if (!q) return { answer: kb.fallback, intentId: null };

  let best: { score: number; answer: string; id: string } | null = null;

  for (const intent of kb.intents) {
    let score = 0;
    for (const kw of intent.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (q.includes(k)) {
        // longer/multi-word keyword matches are stronger signals
        score += k.includes(" ") ? 3 : 1.5;
      } else {
        // partial token overlap (helps single typos / word forms)
        const kwTokens = k.split(" ");
        const hit = kwTokens.filter((t) => t.length > 3 && q.includes(t)).length;
        score += hit * 0.5;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, answer: intent.answer, id: intent.id };
    }
  }

  if (!best) return { answer: kb.fallback, intentId: null };
  return { answer: best.answer, intentId: best.id };
}

export const KB_META = kb.meta;
export const QUICK_REPLIES = kb.quickReplies as string[];
```

---

## Widget — `src/components/assistant/RadarAssistant.tsx` (`"use client"`)

### Layout
- **Floating launcher button**, bottom-right (fixed), z-50, above the map/footer. A rounded teal circle with a small radar/chat glyph and a subtle pulse ring. Tooltip on hover: "Ask Radar Assistant".
- Clicking opens a **chat panel** (~360px wide, ~520px tall on desktop; near-full-width sheet on mobile), anchored bottom-right, rounded-3xl, white surface, soft shadow, teal header bar.
- **Header**: assistant name "Radar Assistant" (font-display), a small "rule-based helper" sub-label, an online dot, and a close (×) button. Include a tiny credits pill: "credits: {n}/10".
- **Message list**: user bubbles right-aligned (teal `--color-primary`, white text), assistant bubbles left-aligned (light `--color-primary-tint` / white with border, ink text). Timestamps optional/subtle. Auto-scroll to newest.
- **Typing indicator**: three bouncing dots in an assistant bubble while a reply is "being generated".
- **Quick-reply chips** under the input (from `QUICK_REPLIES`) — tapping one sends it as the user's message. Show them at the start and after the fallback.
- **Input row**: text field + send button (teal). Enter sends. Disable input while "typing" and when out of credits.

### Behavior (the "feels like AI" part — all local)
- On first open, assistant greets automatically (use the `greeting` intent answer) — this does NOT cost a credit.
- When the user sends a message:
  1. Immediately render the user bubble.
  2. Decrement credits by 1. If credits hit 0 *before* sending, block with a polite "You've used all your free chat credits for this demo. Reset?" + a **Reset credits** button (restores to 10). (Credits are per-session, in React state — no storage needed; if you want persistence across reloads, you may use React state only. Do NOT use localStorage in artifacts, but in this real Next.js app localStorage is fine — use it for credits + last session if convenient.)
  3. Show the typing indicator for a **randomized 500–1100ms** (feels like thinking/streaming).
  4. Compute `matchIntent(text)` and reveal the answer with a light **streaming/typewriter effect** (append characters over ~15ms each, capped so long answers still finish in <1s). Respect reduced-motion → show instantly.
- Keep the last N messages in state. "Clear chat" action in a small menu resets the thread (keeps credits).
- **Credit meter**: visible count; when low (≤3) turn the pill warm-orange; at 0, red + disabled input + reset offer. This is purely a demo flourish — label the tooltip "demo credit limit".

### Accessibility
- Panel is a `role="dialog"` with `aria-label="Radar Assistant chat"`.
- Input has a visible label (sr-only ok). Messages list `aria-live="polite"`.
- Focus moves into the input on open; Esc closes.
- Reduced-motion disables bounce/typewriter/slide.

---

## Mount it globally — `src/app/layout.tsx`
Import and render `<RadarAssistant />` once, just before `</body>` (after `{children}` / Footer), so it floats on every page. It's a client component; that's fine inside the server layout.

```tsx
import RadarAssistant from "@/components/assistant/RadarAssistant";
// ...
<body>
  {/* existing shell: Navbar, children, Footer */}
  <RadarAssistant />
</body>
```

---

## CSS keyframes to add to `globals.css` (namespaced `asst-`)
```css
@keyframes asst-pop { 0%{transform:scale(.9);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes asst-slide { 0%{transform:translateY(8px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes asst-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
@keyframes asst-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }
.asst-panel { animation: asst-pop .18s ease-out both; }
.asst-msg { animation: asst-slide .22s ease-out both; }
.asst-dot { animation: asst-bounce 1.2s infinite; }
.asst-dot:nth-child(2){ animation-delay:.15s } .asst-dot:nth-child(3){ animation-delay:.3s }
.asst-ring { animation: asst-ring 1.8s ease-out infinite; }
@media (prefers-reduced-motion: reduce){
  .asst-panel,.asst-msg,.asst-dot,.asst-ring{ animation:none !important; }
}
```

---

## Honesty note (put in README, be ready to say it)
"Radar Assistant is a **rule-based helper**: it matches the user's message against a curated keyword knowledge base and returns predefined answers about areas, prices, and how RoomRadar works. It does not call any external AI service — this keeps it free, fast, private, and available offline. The typing indicator and credit limit are UX touches emulating a chat assistant." This is completely fair to present as a feature.

---

## Build order for Claude Code
1. Create `src/lib/assistant/knowledge.json` (expand intents to ~18–22).
2. Create `src/lib/assistant/match.ts`.
3. Build `RadarAssistant.tsx` (launcher + panel + messages + typing + credits + quick replies).
4. Add the `asst-` keyframes to `globals.css`.
5. Mount `<RadarAssistant />` in `layout.tsx`.
6. `npm run build` — fix type/lint errors; confirm all existing pages still render and the widget appears site-wide.
7. Test reduced-motion; test credit exhaustion + reset; test fallback + quick replies.

## Acceptance checklist
- [ ] Floating launcher on every page, themed to the site (teal/warm, serif header).
- [ ] Opens a chat panel; auto-greeting on first open.
- [ ] User can type or tap quick replies; answers come from the JSON via keyword match.
- [ ] Typing indicator + streamed reply make it feel live.
- [ ] Credit counter decrements, warns, blocks at 0, and can reset.
- [ ] Sensible fallback with suggestions when no keyword matches.
- [ ] Accessible (dialog role, aria-live, Esc to close, focus management).
- [ ] `prefers-reduced-motion` disables animations.
- [ ] `npm run build` passes; nothing else affected.
- [ ] README notes it's a rule-based (non-LLM) assistant.
```