"use client";

import { Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

export function FechaPedidosFilter({ 
  fechaSeleccionada, 
  totalValor 
}: { 
  fechaSeleccionada: string; 
  totalValor: number;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-4">
        <Calendar className="w-5 h-5 text-zinc-400" />
        <label className="text-sm text-zinc-400">Fecha:</label>
        <input
          type="date"
          defaultValue={fechaSeleccionada}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          onChange={(e) => {
            window.location.href = `/pedidos?fecha=${e.target.value}`;
          }}
        />
        <span className="text-sm text-zinc-500">
          Total del día: {formatCurrency(totalValor)}
        </span>
      </div>
    </div>
  );
}
