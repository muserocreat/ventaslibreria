"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCliente } from "@/lib/clientActions";
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  clienteId: number;
  clienteNombre: string;
}

export function ClienteActions({ clienteId }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setMessage(null);
    try {
      const result = await deleteCliente(clienteId);
      if (result.success) {
        setMessage({ text: result.message || "Cliente eliminado", ok: true });
        setShowConfirm(false);
        setTimeout(() => router.refresh(), 800);
      } else {
        setMessage({ text: result.error || "Error al eliminar", ok: false });
        setShowConfirm(false);
      }
    } catch {
      setMessage({ text: "Error de conexión al intentar borrar.", ok: false });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {!showConfirm ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase">Borrar</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-red-500 text-zinc-950 text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-lg"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "SI"}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(false); }}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-100 text-[10px] font-bold uppercase hover:bg-zinc-700 transition-all"
          >
            NO
          </button>
        </div>
      )}

      {message && (
        <div className={`fixed bottom-4 right-4 z-[9999] bg-zinc-950 border rounded-2xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-right ${
          message.ok ? "border-emerald-500/50" : "border-orange-500/50"
        }`}>
          <div className="flex items-start gap-3">
            {message.ok
              ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              : <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            }
            <div>
              <p className="text-sm text-zinc-200 font-medium leading-relaxed">{message.text}</p>
              <button onClick={() => setMessage(null)} className="text-xs text-zinc-500 hover:text-zinc-100 mt-2 font-bold uppercase tracking-wider">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
