export default function AuthRadarPanel({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative bg-gradient-to-br from-[#0e6e6e] to-[#0b4b4b] text-white overflow-hidden">
      {/* Radar rings + sweep */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px]">
        <div className="absolute inset-0 rounded-full border border-white/25" />
        <div className="absolute inset-[40px] rounded-full border border-white/20" />
        <div className="absolute inset-[80px] rounded-full border border-white/15" />
        <div
          className="absolute inset-0 rounded-full radar-sweep"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,.35) 55deg, transparent 66deg)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
      </div>

      {/* Bottom label */}
      <div className="absolute left-6 bottom-6 right-6">
        <div className="mono text-white/70 !text-[10px]">{eyebrow}</div>
        <div className="font-display text-xl font-semibold mt-1">{title}</div>
        <div className="text-sm text-white/75 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
