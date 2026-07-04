"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CITIES, AREAS, type City } from "@/lib/constants";
import Button from "@/components/ui/Button";

const BUDGETS = [
  { label: "Any budget", value: "" },
  { label: "≤ Rs 10,000", value: "10000" },
  { label: "≤ Rs 15,000", value: "15000" },
  { label: "≤ Rs 20,000", value: "20000" },
  { label: "≤ Rs 30,000", value: "30000" },
  { label: "≤ Rs 50,000", value: "50000" },
];

export default function HeroSearch() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [city, setCity] = useState<City | "">("Kathmandu");
  const [area, setArea] = useState<string>("Baneshwor");
  const [budget, setBudget] = useState<string>("20000");

  const areas = city ? AREAS[city as City] : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (area) p.set("area", area);
    if (budget) p.set("maxRent", budget);
    startTransition(() => router.push(`/listings?${p.toString()}`));
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-3xl bg-white/95 backdrop-blur-md border border-white/70 shadow-[0_24px_60px_rgba(60,30,30,0.28)] rounded-[20px] p-2 flex items-stretch gap-1"
    >
      <PillSelect
        label="City"
        value={city}
        onChange={(v) => {
          setCity(v as City | "");
          if (v && !AREAS[v as City].includes(area)) setArea("");
        }}
        options={[
          { label: "Any city", value: "" },
          ...CITIES.map((c) => ({ label: c, value: c })),
        ]}
        divider
      />
      <PillSelect
        label="Area"
        value={area}
        onChange={setArea}
        disabled={!city}
        options={[
          { label: "Any area", value: "" },
          ...areas.map((a) => ({ label: a, value: a })),
        ]}
        divider
      />
      <PillSelect
        label="Budget"
        value={budget}
        onChange={setBudget}
        options={BUDGETS}
      />
      <Button
        type="submit"
        variant="primary"
        loading={isPending}
        className="!rounded-2xl px-6 whitespace-nowrap"
      >
        <span className="text-base">◎</span>
        Search
      </Button>
    </form>
  );
}

function PillSelect({
  label,
  value,
  onChange,
  options,
  divider,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  divider?: boolean;
  disabled?: boolean;
}) {
  const displayed =
    options.find((o) => o.value === value)?.label ??
    options[0]?.label ??
    "Any";

  return (
    <label
      className={`relative flex-1 min-w-0 flex flex-col justify-center px-4 py-2 cursor-pointer text-left ${
        divider ? "border-r border-black/10" : ""
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <span className="mono text-[10px] tracking-[.14em] font-semibold text-[color:var(--color-muted)]">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-[color:var(--color-ink)] mt-0.5 truncate">
        {displayed || "Any"}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="opacity-60 shrink-0"
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
