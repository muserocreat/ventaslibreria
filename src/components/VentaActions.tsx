"use client";

import { useState } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { anularVentaAction } from "@/lib/ventaActions";

interface Props {
  ventaId: number;
  estado: string;
}

export function VentaActions({ ventaId, estado }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAnular = async () => {
    if (!confirm(`¿Estás seguro de ANULAR la venta #${ventaId}? \n\nEsto restaurará el stock y revertirá los saldos de cuenta corriente si aplica.`)) return;
    
    setLoading(true);
    const res = await anularVentaAction(ventaId);
    if (!res.success) alert(res.error);
    setLoading(false);
  };

  if (estado === 'anulado') {
    return (
      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-500 px-2 py-1 rounded-full border border-zinc-700">
        Anulada
      </span>
    );
  }

  return (
    <button 
      onClick={handleAnular}
      disabled={loading}
      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
      title="Anular venta"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
    </button>
  );
}
