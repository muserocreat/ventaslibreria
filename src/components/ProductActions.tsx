"use client";

import { toggleProduct, deleteProduct } from "@/lib/actions";
import { Ban, Trash2, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: number;
  productName: string;
  isActive: number | null;
}

export function ProductActions({ productId, isActive }: Props) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estado local para reflejar el cambio inmediatamente sin esperar re-render del servidor
  const [localActive, setLocalActive] = useState<number | null>(isActive);
  const isCurrentlyActive = localActive === 1 || localActive === null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setToggleLoading(true);
    setMessage(null);
    try {
      const result = await toggleProduct(Number(productId));
      if (result.success) {
        // Actualizar estado local inmediatamente
        setLocalActive(prev => (prev === 1 || prev === null) ? 0 : 1);
        setMessage(result.message || "Estado actualizado");
        router.refresh();
      } else if (result.error) {
        setMessage(result.error);
      }
    } catch {
      setMessage("Error de conexión al procesar la solicitud.");
    }
    setToggleLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDeleteLoading(true);
    setMessage(null);
    try {
      const result = await deleteProduct(Number(productId));
      if (result.success) {
        setMessage(result.message || "Producto eliminado");
        setShowDeleteConfirm(false);
        setTimeout(() => {
          router.refresh();
        }, 800);
      } else if (result.error) {
        setMessage(result.error);
        setShowDeleteConfirm(false);
      }
    } catch {
      setMessage("Error de conexión al intentar borrar.");
    }
    setDeleteLoading(false);
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {/* Botón Anular / Reactivar */}
      <button 
        onClick={handleToggle}
        disabled={toggleLoading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
          isCurrentlyActive 
            ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-orange-500/50 hover:text-orange-500" 
            : "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
        } ${toggleLoading ? 'opacity-50 cursor-wait' : ''}`} 
      >
        {toggleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
          isCurrentlyActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />
        )}
        <span className="text-[10px] font-bold uppercase">{isCurrentlyActive ? 'Anular' : 'Activar'}</span>
      </button>

      {/* Botón Eliminar */}
      {!showDeleteConfirm ? (
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(true); }}
          disabled={toggleLoading || deleteLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-500 transition-all shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase">Borrar</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
          <button 
            onClick={handleDelete}
            disabled={deleteLoading}
            className="px-2.5 py-1.5 rounded-lg bg-red-500 text-zinc-950 text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-lg"
          >
            {deleteLoading ? '...' : 'SI'}
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); }}
            disabled={deleteLoading}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-100 text-[10px] font-bold uppercase hover:bg-zinc-700 transition-all"
          >
            NO
          </button>
        </div>
      )}

      {/* Mensaje Emergente */}
      {message && (
        <div className={`fixed bottom-4 right-4 z-[9999] bg-zinc-950 border rounded-2xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-right ${
          message.includes('correctamente') 
            ? 'border-emerald-500/50 shadow-emerald-500/10' 
            : 'border-orange-500/50 shadow-orange-500/10'
        }`}>
          <div className="flex items-start gap-3">
            {message.includes('correctamente') ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            )}
            <div>
              <p className="text-sm text-zinc-200 font-medium leading-relaxed">{message}</p>
              <button onClick={() => setMessage(null)} className="text-xs text-zinc-500 hover:text-zinc-100 mt-2 font-bold uppercase tracking-wider">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
