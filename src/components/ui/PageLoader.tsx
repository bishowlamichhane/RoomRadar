import Spinner from "./Spinner";

/**
 * Full-viewport loading overlay used by every `loading.tsx` file.
 * Fires automatically during server-component page transitions
 * (nav clicks, room-card clicks, filter changes), so any Link
 * navigation gets a blurred backdrop + centered spinner.
 */
export default function PageLoader({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 border border-black/5 shadow-[0_12px_40px_rgba(23,26,28,0.12)] px-6 py-5">
        <Spinner size="md" className="text-[color:var(--color-primary)]" />
        <div className="text-xs font-medium text-[color:var(--color-muted)]">
          {label}
        </div>
      </div>
    </div>
  );
}
