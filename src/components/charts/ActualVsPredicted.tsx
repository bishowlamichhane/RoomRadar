"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function ActualVsPredicted({
  data,
}: {
  data: { actual: number; predicted: number }[];
}) {
  const max = Math.max(
    ...data.map((d) => Math.max(d.actual, d.predicted)),
    50000,
  );
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
        <CartesianGrid stroke="#e6e8e3" />
        <XAxis
          type="number"
          dataKey="actual"
          name="Actual"
          domain={[0, max]}
          stroke="#6B7378"
          fontSize={11}
          label={{ value: "Actual rent (NPR)", position: "insideBottom", offset: -2, fill: "#6B7378", fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="predicted"
          name="Predicted"
          domain={[0, max]}
          stroke="#6B7378"
          fontSize={11}
          label={{ value: "Predicted", angle: -90, position: "insideLeft", fill: "#6B7378", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: max, y: max },
          ]}
          stroke="#0E6E6E"
          strokeDasharray="4 4"
        />
        <Scatter data={data} fill="#0E6E6E" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
