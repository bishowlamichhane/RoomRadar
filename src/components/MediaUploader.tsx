"use client";

import { CldUploadWidget } from "next-cloudinary";
import type { MediaItem } from "@/lib/media";
import Spinner from "@/components/ui/Spinner";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function MediaUploader({
  value,
  onChange,
}: {
  value: MediaItem[];
  onChange: (next: MediaItem[]) => void;
}) {
  const configured = !!(CLOUD_NAME && UPLOAD_PRESET);

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function handleUpload(result: unknown) {
    const info = (result as { info?: Record<string, unknown> })?.info;
    if (!info) return;
    const url = info.secure_url as string | undefined;
    const publicId = info.public_id as string | undefined;
    const resource = info.resource_type as string | undefined;
    if (!url) return;
    const item: MediaItem = {
      url,
      type: resource === "video" ? "video" : "image",
      publicId,
      width: info.width as number | undefined,
      height: info.height as number | undefined,
    };
    onChange([...value, item]);
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <div className="font-semibold mb-1">Cloudinary not configured</div>
        Add <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and{" "}
        <code>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> to <code>.env</code>{" "}
        (see README), then restart the dev server.
      </div>
    );
  }

  const photoCount = value.filter((m) => m.type === "image").length;
  const videoCount = value.filter((m) => m.type === "video").length;

  return (
    <div className="space-y-4">
      {/* Thumbnail grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((m, i) => (
            <div
              key={m.url + i}
              className="relative aspect-square rounded-xl overflow-hidden border border-black/10 bg-[color:var(--color-primary-tint)] group"
            >
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full bg-black">
                  <video
                    src={m.url}
                    className="w-full h-full object-cover opacity-90"
                    muted
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-3xl drop-shadow">
                    ▶
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <span className="absolute bottom-1.5 left-1.5 text-[9px] uppercase tracking-wider font-semibold bg-black/60 text-white rounded-full px-2 py-0.5">
                {m.type}
              </span>
              {i === 0 && m.type === "image" && (
                <span className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-wider font-semibold bg-white text-[color:var(--color-primary-600)] rounded-full px-2 py-0.5">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo dropzone */}
      <CldUploadWidget
        uploadPreset={UPLOAD_PRESET}
        options={{
          multiple: true,
          resourceType: "image",
          sources: ["local", "url", "camera"],
          maxFiles: 8,
          folder: "roomradar/listings",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        }}
        onSuccess={handleUpload}
      >
        {({ open, isLoading }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={isLoading}
            className="group w-full rounded-2xl border-[1.5px] border-dashed border-black/15 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-tint)]/40 focus:outline-none focus:border-[color:var(--color-primary)] focus:bg-[color:var(--color-primary-tint)]/40 transition-colors px-6 py-8 flex flex-col items-center gap-2 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[color:var(--color-primary-tint)] group-hover:bg-white flex items-center justify-center text-[color:var(--color-primary)] transition-colors">
              {isLoading ? (
                <Spinner size="md" />
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  <polyline points="7 10 12 5 17 10" />
                  <line x1="12" y1="5" x2="12" y2="17" />
                </svg>
              )}
            </div>
            <div className="font-semibold text-sm text-[color:var(--color-ink)]">
              Drop photos here or click to upload
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              JPG, PNG or WebP · up to 8 photos ·{" "}
              {photoCount > 0
                ? `${photoCount} added`
                : "first one becomes the cover"}
            </div>
          </button>
        )}
      </CldUploadWidget>

      {/* Video secondary */}
      <CldUploadWidget
        uploadPreset={UPLOAD_PRESET}
        options={{
          multiple: false,
          resourceType: "video",
          sources: ["local", "url", "camera"],
          maxFiles: 1,
          folder: "roomradar/listings",
          clientAllowedFormats: ["mp4", "mov", "webm"],
        }}
        onSuccess={handleUpload}
      >
        {({ open, isLoading }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--color-primary)] hover:text-[color:var(--color-primary-600)] py-2"
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            )}
            {videoCount > 0
              ? "Replace walkthrough video"
              : "+ Add a walkthrough video (MP4/MOV/WebM)"}
          </button>
        )}
      </CldUploadWidget>
    </div>
  );
}
