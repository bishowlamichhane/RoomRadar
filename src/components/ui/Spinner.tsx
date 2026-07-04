export type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 22,
  lg: 32,
};

export default function Spinner({
  size = "sm",
  className = "",
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  const px = SIZE_MAP[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={`inline-block animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
