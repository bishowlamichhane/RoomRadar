export type MediaItem = {
  url: string;
  type: "image" | "video";
  publicId?: string;
  width?: number;
  height?: number;
};

export function parseMedia(raw: string | null | undefined): MediaItem[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    if (!Array.isArray(j)) return [];
    return j.filter(
      (m): m is MediaItem =>
        !!m &&
        typeof m.url === "string" &&
        (m.type === "image" || m.type === "video"),
    );
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
