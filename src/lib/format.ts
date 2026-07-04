export const npr = (n: number) =>
  "Rs " + Math.round(n).toLocaleString("en-IN");

export const pct = (n: number) =>
  `${n >= 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;
