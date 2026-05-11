"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

interface Props {
  clienteId: number;
  clienteNombre: string;
  saldoActual: number;
}

export function PagoForm({ clienteId, clienteNombre, saldoActual }: Props) {
  const router = useRouter();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      setToast({ text: "El monto debe ser mayor a 0", ok: false });
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch("/api/cuentas-corrientes/pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          monto: montoNum,
          descripcion: descripcion.trim() || "Pago manual",
          tipo_movimiento: "pago"
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setToast({ text: `Pago de ${formatCurrency(montoNum)} registrado correctamente`, ok: true });
        setMonto("");
        setDescripcion("");
        router.refresh();
      } else {
        setToast({ text: result.error || "Error al registrar pago", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const montoSugerido = saldoActual > 0 ? Math.abs(saldoActual) : 0;
  const montoNum = parseFloat(monto) || 0;
  const nuevoSaldo = saldoActual - montoNum;
  const esPagoTotal = montoNum >= saldoActual && saldoActual > 0;
  const esPagoParcial = montoNum > 0 && montoNum < saldoActual;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-green-400" />
        Registrar Pago - {clienteNombre}
      </h3>
      
      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          toast.ok ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            <DollarSign className="w-4 h-4 inline mr-2" />
            Monto del Pago
          </label>
          
          {/* Botones rápidos */}
          {saldoActual > 0 && (
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMonto(montoSugerido.toString())}
                className="flex-1 py-2 px-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                disabled={submitting}
              >
                Pagar Total ({formatCurrency(montoSugerido)})
              </button>
              <button
                type="button"
                onClick={() => setMonto((montoSugerido / 2).toString())}
                className="flex-1 py-2 px-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                disabled={submitting}
              >
                Mitad ({formatCurrency(montoSugerido / 2)})
              </button>
            </div>
          )}
          
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder={montoSugerido > 0 ? `Sugerido: ${formatCurrency(montoSugerido)}` : "0.00"}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
              disabled={submitting}
            />
            {saldoActual > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                Saldo actual: {formatCurrency(saldoActual)}
              </div>
            )}
          </div>
          
          {/* Preview del nuevo saldo */}
          {montoNum > 0 && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              nuevoSaldo < 0 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : nuevoSaldo === 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span>Nuevo saldo:</span>
                <span className="font-bold">{formatCurrency(nuevoSaldo)}</span>
              </div>
              {nuevoSaldo < 0 && (
                <p className="mt-1 text-xs opacity-80">El cliente tendrá saldo a favor de {formatCurrency(Math.abs(nuevoSaldo))}</p>
              )}
              {nuevoSaldo > 0 && (
                <p className="mt-1 text-xs opacity-80">Quedará pendiente de pago</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Pago parcial, transferencia bancaria, etc."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all resize-none"
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !monto || parseFloat(monto) <= 0}
          className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-950 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent animate-spin"></div>
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Registrar Pago
            </>
          )}
        </button>

        {saldoActual <= 0 && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-400">
                <p className="font-medium">Este cliente tiene saldo a favor</p>
                <p>Saldo actual: {formatCurrency(Math.abs(saldoActual))}</p>
                <p>Considera registrar un ajuste en lugar de un pago.</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
