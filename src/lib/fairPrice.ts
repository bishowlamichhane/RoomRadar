export type FairVerdict = "below" | "fair" | "slightlyHigh" | "high";

export function fairness(listed: number, predicted: number) {
  const diff = (listed - predicted) / predicted;
  let verdict: FairVerdict;
  if (diff < -0.1) verdict = "below";
  else if (diff <= 0.1) verdict = "fair";
  else if (diff <= 0.2) verdict = "slightlyHigh";
  else verdict = "high";
  return { diff, verdict };
}

export const VERDICT_META: Record<
  FairVerdict,
  { label: string; tone: "blue" | "green" | "amber" | "red" }
> = {
  below: { label: "Below market", tone: "blue" },
  fair: { label: "Fair price", tone: "green" },
  slightlyHigh: { label: "Slightly high", tone: "amber" },
  high: { label: "Above fair", tone: "red" },
};
