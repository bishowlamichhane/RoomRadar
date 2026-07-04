import { fairness, VERDICT_META } from "@/lib/fairPrice";

const TONE_CLASSES: Record<string, string> = {
  green: "bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary-600)]",
  amber: "bg-[#fcecdb] text-[#a05a1e]",
  red: "bg-[#fde1e0] text-[#a52a2a]",
  blue: "bg-[#e0eefc] text-[#255f9a]",
};

const DOT: Record<string, string> = {
  green: "bg-[color:var(--color-primary)]",
  amber: "bg-[#c17a2b]",
  red: "bg-[#c8402d]",
  blue: "bg-[#3672b1]",
};

export default function FairPriceBadge({
  listed,
  predicted,
  size = "sm",
}: {
  listed: number;
  predicted: number;
  size?: "sm" | "md";
}) {
  const { verdict } = fairness(listed, predicted);
  const meta = VERDICT_META[verdict];
  const px = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${px} ${TONE_CLASSES[meta.tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[meta.tone]}`} />
      {meta.label}
    </span>
  );
}
