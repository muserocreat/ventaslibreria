"use client";

import { useState } from "react";
import { createDeudaAction, addPagoDeudaAction, deleteDeudaAction, deletePagoDeudaAction, type DeudaItem } from "@/lib/reportesActions";
import { Plus, Minus, DollarSign, CreditCard, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

export function DeudaForm({ deudas }: { deudas: DeudaItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pagoMonto, setPagoMonto] = useState<Record<number, string>>({});
  const [pagoNota, setPagoNota] = useState<Record<number, string>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !monto) return;
    setSubmitting(true);
    const result = await createDeudaAction({
      nombre,
      descripcion: descripcion || undefined,
      monto_total: parseFloat(monto),
      fecha_vencimiento: fechaVencimiento || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      setNombre("");
      setMonto("");
      setDescripcion("");
      setFechaVencimiento("");
      setShowForm(false);
      window.location.reload();
    } else {
      alert("Error: " + result.error);
    }
  };

  const handlePago = async (deudaId: number) => {
    const m = parseFloat(pagoMonto[deudaId] || "0");
    if (!m || m <= 0) return;
    setSubmitting(true);
    const result = await addPagoDeudaAction({
      deuda_id: deudaId,
      monto: m,
      nota: pagoNota[deudaId] || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      setPagoMonto((prev) => ({ ...prev, [deudaId]: "" }));
      setPagoNota((prev) => ({ ...prev, [deudaId]: "" }));
      window.location.reload();
    } else {
      alert("Error: " + result.error);
    }
  };

  const handleDeleteDeuda = async (id: number) => {
    if (!confirm("¿Eliminar esta deuda y todos sus pagos?")) return;
    const result = await deleteDeudaAction(id);
    if (result.success) window.location.reload();
    else alert("Error: " + result.error);
  };

  const handleDeletePago = async (id: number) => {
    if (!confirm("¿Eliminar este pago?")) return;
    const result = await deletePagoDeudaAction(id);
    if (result.success) window.location.reload();
    else alert("Error: " + result.error);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/15 rounded-lg">
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Deudas</h2>
            <p className="text-xs text-zinc-500">{deudas.length} activa{deudas.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancelar" : "Nueva"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 border-t border-zinc-800 pt-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tarjeta de Crédito"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Monto Total</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vencimiento (opcional)</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-purple-500/50 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Nota adicional..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 font-bold text-sm transition-all disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Crear Deuda"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {deudas.map((d) => {
          const isExpanded = expandedId === d.id;
          const pct = d.monto_total > 0 ? Math.min(100, (d.monto_pagado / d.monto_total) * 100) : 0;
          const isPagada = d.saldo <= 0;
          return (
            <div key={d.id} className={`border rounded-xl overflow-hidden ${isPagada ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950"}`}>
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-200">{d.nombre}</p>
                    {isPagada && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>Total: {formatCurrency(d.monto_total)}</span>
                    <span className={d.saldo > 0 ? "text-orange-400" : "text-emerald-400"}>
                      Saldo: {formatCurrency(Math.max(0, d.saldo))}
                    </span>
                    {d.fecha_vencimiento && (
                      <span className="flex items-center gap-1 text-purple-400 font-medium">
                        <Clock className="w-3 h-3" />
                        Vence: {d.fecha_vencimiento}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPagada ? "bg-emerald-500" : "bg-purple-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-500">{pct.toFixed(0)}%</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                  {/* Pago form */}
                  {!isPagada && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Registrar Pago</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="number"
                            step="0.01"
                            value={pagoMonto[d.id] || ""}
                            onChange={(e) => setPagoMonto((prev) => ({ ...prev, [d.id]: e.target.value }))}
                            placeholder="Monto..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={pagoNota[d.id] || ""}
                        onChange={(e) => setPagoNota((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        placeholder="Nota..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm"
                      />
                      <button
                        onClick={() => handlePago(d.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-zinc-950 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Pagos list */}
                  {d.pagos.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Pagos registrados</p>
                      {d.pagos.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm text-zinc-300">{formatCurrency(p.monto)}</span>
                            {p.nota && <span className="text-xs text-zinc-500">· {p.nota}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">{p.fecha}</span>
                            <button
                              onClick={() => handleDeletePago(p.id)}
                              className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteDeuda(d.id)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar deuda
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {deudas.length === 0 && !showForm && (
          <p className="text-sm text-zinc-500 text-center py-4">Sin deudas activas</p>
        )}
      </div>
    </div>
  );
}
