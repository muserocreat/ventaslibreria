"use client";

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts";
import type { MetodoPagoItem } from "@/lib/reportesActions";
import { formatCurrency } from "@/lib/formatter";

const COLORS = ["#10b981", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b"];

type PieLabelEntry = {
  name?: string;
  percentage?: string;
};

interface Props {
  data: MetodoPagoItem[];
}

export function MetodosPagoChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-zinc-500 text-center py-12">Sin ventas en el período</p>;

  const total = data.reduce((acc, d) => acc + d.monto, 0);

  const chartData = data.map((d, i) => ({
    name: d.metodo,
    value: d.monto,
    percentage: total > 0 ? ((d.monto / total) * 100).toFixed(1) : "0",
    color: COLORS[i % COLORS.length],
  }));

  const renderLabel = (entry: PieLabelEntry) => `${entry.name} (${entry.percentage}%)`;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
          formatter={(value: unknown) => formatCurrency(Number(value || 0))}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
