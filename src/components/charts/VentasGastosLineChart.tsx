"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { FlujoItem } from "@/lib/reportesActions";
import { formatCurrency } from "@/lib/formatter";

const formatARS = (v: number) => formatCurrency(v);

interface Props {
  data: FlujoItem[];
}

export function VentasGastosLineChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-zinc-500 text-center py-12">Sin datos para el período</p>;

  const chartData = data.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    Ventas: d.ingresos,
    Gastos: d.egresos,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis dataKey="fecha" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
          itemStyle={{ color: "#a1a1aa" }}
          formatter={(value: unknown) => formatARS(Number(value || 0))}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend />
        <Line type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }} />
        <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
