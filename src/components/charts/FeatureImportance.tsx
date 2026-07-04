"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FeatureImportance({
  data,
}: {
  data: { feature: string; importance: number }[];
}) {
  const top = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid stroke="#e6e8e3" horizontal={false} />
        <XAxis type="number" stroke="#6B7378" fontSize={11} />
        <YAxis
          type="category"
          dataKey="feature"
          stroke="#6B7378"
          fontSize={11}
          width={130}
        />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="importance" fill="#0E6E6E" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
