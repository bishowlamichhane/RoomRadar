import kb from "./knowledge.json";

export type Cta = { label: string; href: string };
export type Match = { answer: string; intentId: string | null; cta?: Cta };

/* ------------------------- utilities ------------------------- */

function normalize(s: string) {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Words that are too common to be reliable partial-match signals across intents.
const STOPWORDS = new Set([
  "room", "rooms", "rent", "cost", "price", "type", "types",
  "help", "need", "want", "looking", "find", "under", "over",
  "with", "have", "there", "here", "about", "does", "what",
  "which", "where", "how", "when", "please", "just", "give",
  "info", "budget", "monthly", "month",
]);

/* ------------------------- area lookup ------------------------- */

const AREA_TO_CITY: Record<string, string> = {};
for (const [city, areas] of Object.entries(kb.areas as Record<string, string[]>)) {
  for (const a of areas) AREA_TO_CITY[a.toLowerCase()] = city;
}

type Tier = "premium" | "mid" | "budget";

function tierFor(area: string): Tier {
  const key = area.toLowerCase();
  for (const cityTiers of Object.values(
    kb.areaTiers as Record<string, Record<Tier, string[]>>,
  )) {
    for (const [tier, list] of Object.entries(cityTiers)) {
      if (list.some((a) => a.toLowerCase() === key)) return tier as Tier;
    }
  }
  return "mid";
}

function findArea(q: string): { name: string; city: string } | null {
  // longest match wins to prefer "kamalbinayak" over shorter substrings
  let best: { name: string; city: string; len: number } | null = null;
  for (const [a, c] of Object.entries(AREA_TO_CITY)) {
    if (!q.includes(a)) continue;
    if (!best || a.length > best.len) {
      best = { name: cap(a), city: c, len: a.length };
    }
  }
  return best ? { name: best.name, city: best.city } : null;
}

/* ------------------------- budget parsing ------------------------- */

function extractBudget(q: string): number | null {
  // "17k", "17.5k", "17 k"
  const kMatch = q.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  // bare number like 17000 (4–6 digits)
  const numMatch = q.match(/\b(\d{4,6})\b/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

function typesForBudget(budget: number): string {
  if (budget < 8000) return "Hostel seats and shared rooms";
  if (budget < 13000) return "Single Rooms and Hostel seats";
  if (budget < 18000) return "Single Rooms and 1BHKs";
  if (budget < 25000) return "1BHKs and smaller 2BHKs";
  if (budget < 40000) return "2BHKs and small Flats";
  return "Flats and larger 2BHKs";
}

function tierPhrase(t: Tier): string {
  if (t === "premium") return "on the higher end";
  if (t === "budget") return "value-friendly";
  return "mid-budget";
}

function buildAreaAnswer(
  area: string,
  city: string,
  budget: number | null,
): { answer: string; cta: Cta } {
  const tier = tierPhrase(tierFor(area));
  const parts: string[] = [];
  parts.push(`${area} is in ${city} — generally ${tier} by Valley standards.`);
  if (budget !== null) {
    parts.push(
      `With a budget of Rs ${budget.toLocaleString("en-IN")}/month, you'll typically find ${typesForBudget(budget)} there.`,
    );
  }
  parts.push(`Tap below to see current listings, each with a fair-price badge.`);

  const params = new URLSearchParams({ area });
  if (budget !== null) params.set("maxRent", String(budget));
  const label = budget !== null
    ? `See rooms in ${area} under Rs ${budget.toLocaleString("en-IN")}`
    : `See rooms in ${area}`;

  return {
    answer: parts.join(" "),
    cta: { label, href: `/listings?${params.toString()}` },
  };
}

/* ------------------------- intent scoring ------------------------- */

type IntentHit = { score: number; answer: string; id: string; cta?: Cta };

function scoreIntents(q: string): IntentHit | null {
  let best: IntentHit | null = null;
  for (const intent of kb.intents as Array<{
    id: string;
    keywords: string[];
    answer: string;
    cta?: Cta;
  }>) {
    let score = 0;
    for (const kw of intent.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (q.includes(k)) {
        score += k.includes(" ") ? 3 : 1.5;
        continue;
      }
      // Partial token overlap — but only for distinctive tokens (length ≥ 5)
      // and never for stopwords. This prevents common words like "room" or
      // "rent" from dragging the wrong intent to the top.
      const tokens = k.split(" ");
      const hit = tokens.filter(
        (t) => t.length >= 5 && !STOPWORDS.has(t) && q.includes(t),
      ).length;
      score += hit * 0.5;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = {
        score,
        answer: intent.answer,
        id: intent.id,
        cta: intent.cta,
      };
    }
  }
  return best;
}

/* ------------------------- public API ------------------------- */

export function matchIntent(userText: string): Match {
  const q = normalize(userText);
  if (!q) return { answer: kb.fallback, intentId: null };

  const intentHit = scoreIntents(q);
  const area = findArea(q);
  const budget = extractBudget(q);

  // Area detection wins over generic scoring, EXCEPT when a very strong
  // exact multi-word intent hit is present (e.g. "how does fair-price work?").
  if (area) {
    const strong = intentHit && intentHit.score >= 3;
    if (!strong) {
      const built = buildAreaAnswer(area.name, area.city, budget);
      return {
        answer: built.answer,
        intentId: "area_lookup",
        cta: built.cta,
      };
    }
  }

  if (!intentHit) return { answer: kb.fallback, intentId: null };
  return {
    answer: intentHit.answer,
    intentId: intentHit.id,
    cta: intentHit.cta,
  };
}

export const KB_META = kb.meta;
export const QUICK_REPLIES = kb.quickReplies as string[];
