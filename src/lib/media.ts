export const MEDIA_CATEGORIES = [
  "bedroom",
  "living",
  "kitchen",
  "bathroom",
  "balcony",
  "terrace",
  "exterior",
  "other",
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  bedroom: "Bedroom",
  living: "Living / Sofa",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  balcony: "Balcony",
  terrace: "Terrace",
  exterior: "Exterior",
  other: "Other",
};

export function isMediaCategory(x: unknown): x is MediaCategory {
  return (
    typeof x === "string" &&
    (MEDIA_CATEGORIES as readonly string[]).includes(x)
  );
}

export type MediaItem = {
  url: string;
  type: "image" | "video";
  category?: MediaCategory;
  publicId?: string;
  width?: number;
  height?: number;
};

export function parseMedia(raw: string | null | undefined): MediaItem[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    if (!Array.isArray(j)) return [];
    return j
      .filter(
        (m): m is MediaItem =>
          !!m &&
          typeof m.url === "string" &&
          (m.type === "image" || m.type === "video"),
      )
      .map((m) => ({
        ...m,
        category: isMediaCategory(m.category) ? m.category : undefined,
      }));
  } catch {
    return [];
  }
}

export function serializeMedia(items: MediaItem[]): string {
  return JSON.stringify(items ?? []);
}

export function firstImage(items: MediaItem[]): string | null {
  return items.find((m) => m.type === "image")?.url ?? null;
}

export function firstVideo(items: MediaItem[]): string | null {
  return items.find((m) => m.type === "video")?.url ?? null;
}

export function groupImagesByCategory(items: MediaItem[]) {
  const images = items.filter((m) => m.type === "image");
  const groups: Record<MediaCategory, MediaItem[]> = {
    bedroom: [],
    living: [],
    kitchen: [],
    bathroom: [],
    balcony: [],
    terrace: [],
    exterior: [],
    other: [],
  };
  for (const m of images) {
    groups[m.category ?? "other"].push(m);
  }
  return groups;
}
