"use client";

import { useState } from "react";
import { Trash2, Edit2, X, Check, AlertCircle } from "lucide-react";
import { deleteMovimientoCCAction, updateMovimientoCCAction } from "@/lib/ccActions";
import { formatCurrency } from "@/lib/formatter";

interface Props {
  movimiento: {
    id: number;
    monto: number;
    descripcion: string;
    tipo: string;
  };
}

export function MovimientoActions({ movimiento }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [editMonto, setEditMonto] = useState(movimiento.monto.toString());
  const [editDesc, setEditDesc] = useState(movimiento.descripcion);

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este movimiento? El saldo del cliente se ajustará automáticamente.")) return;
    setLoading(true);
    const res = await deleteMovimientoCCAction(movimiento.id);
    if (!res.success) alert(res.error);
    setLoading(false);
    setIsDeleting(false);
  };

  const handleUpdate = async () => {
    setLoading(true);
    const res = await updateMovimientoCCAction(movimiento.id, {
      monto: parseFloat(editMonto),
      descripcion: editDesc
    });
    if (!res.success) alert(res.error);
    else setIsEditing(false);
    setLoading(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
        <div className="flex flex-col gap-1">
          <input 
            type="number" 
            value={editMonto} 
            onChange={(e) => setEditMonto(e.target.value)}
            className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
          />
          <input 
            type="text" 
            value={editDesc} 
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-40 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
          />
        </div>
        <button onClick={handleUpdate} disabled={loading} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => setIsEditing(false)} disabled={loading} className="p-1 text-zinc-500 hover:bg-zinc-500/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={() => setIsEditing(true)}
        className="p-1.5 text-zinc-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
        title="Editar movimiento"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={handleDelete}
        disabled={loading}
        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        title="Eliminar movimiento"
      >
        <Trash2 className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  );
}
