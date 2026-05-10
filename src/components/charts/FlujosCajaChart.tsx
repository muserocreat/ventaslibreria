"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { FlujoItem } from "@/lib/reportesActions";
import { formatCurrency } from "@/lib/formatter";

interface Props {
  data: FlujoItem[];
}

export function FlujosCajaChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-zinc-500 text-center py-12">Sin datos para el período</p>;

  const chartData = data.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    Ingresos: d.ingresos,
    Egresos: d.egresos,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
          formatter={(value: unknown) => formatCurrency(Number(value || 0))}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend />
        <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} fill="url(#gradIngresos)" />
        <Area type="monotone" dataKey="Egresos" stroke="#ef4444" strokeWidth={2} fill="url(#gradEgresos)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
