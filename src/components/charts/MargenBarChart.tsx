"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { VentaDia } from "@/lib/reportesActions";
import { formatCurrency } from "@/lib/formatter";

interface Props {
  data: VentaDia[];
}

export function MargenBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    ventas: d.ventas,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="fecha" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
          itemStyle={{ color: "#a1a1aa" }}
          formatter={(value: unknown) => formatCurrency(Number(value || 0))}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend />
        <Bar dataKey="ventas" fill="#f97316" radius={[4, 4, 0, 0]} name="Ventas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
