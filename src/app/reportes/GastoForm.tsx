"use client";

import { useState } from "react";
import { createGastoAction } from "@/lib/reportesActions";
import { Plus, DollarSign, Tag, CreditCard } from "lucide-react";

export function GastoForm() {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState(1); // 1 = Operativos, 2 = Reinversión
  const [medioPago, setMedioPago] = useState("Efectivo");
  const [esCompraCredito, setEsCompraCredito] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || !monto) return;

    setSubmitting(true);
    const result = await createGastoAction({
      descripcion,
      monto: parseFloat(monto),
      categoria,
      medio_pago: medioPago,
      es_compra_credito: esCompraCredito,
    });
    setSubmitting(false);

    if (result.success) {
      setDescripcion("");
      setMonto("");
      setCategoria(1);
      setMedioPago("Efectivo");
      setEsCompraCredito(false);
      window.location.reload();
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/15 rounded-lg">
          <Plus className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="text-lg font-bold">Registrar Gasto</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descripción</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Pago tarjeta de crédito"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Monto</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-500/50 text-sm appearance-none"
            >
              <option value={1}>Operativos</option>
              <option value={2}>Reinversión</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Medio de Pago</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "Efectivo", label: "Efectivo", icon: DollarSign },
              { value: "Tarjeta", label: "Tarjeta", icon: CreditCard },
              { value: "Transferencia", label: "Transferencia" },
              { value: "Débito", label: "Débito" },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMedioPago(value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  medioPago === value
                    ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {medioPago === "Tarjeta" ? (
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-purple-300">Deuda Automática</span>
              <p className="text-[10px] text-purple-400/80 leading-tight">
                Al usar tarjeta, el sistema creará una deuda para seguimiento del vencimiento automáticamente.
              </p>
            </div>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={esCompraCredito}
              onChange={(e) => setEsCompraCredito(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-950 text-purple-500 focus:ring-purple-500/50"
            />
            <div className="flex-1">
              <span className="text-xs font-medium text-zinc-300">Marcar como compra a crédito</span>
              <p className="text-[10px] text-zinc-500">Generar deuda en el sistema para pago diferido.</p>
            </div>
          </label>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-zinc-950 font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? "Guardando..." : "Registrar Gasto"}
        </button>
      </form>
    </div>
  );
}
