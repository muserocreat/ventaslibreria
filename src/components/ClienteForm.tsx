"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCliente, updateCliente } from "@/lib/clientActions";
import { Save, CheckCircle, AlertTriangle } from "lucide-react";

interface ClienteFormProps {
  cliente?: {
    id: number;
    nombre: string;
    telefono: string;
    dni: string;
    barrio: string;
    puntos: number | null;
    observaciones: string | null;
    nivel: string | null;
    descuento_activo: number | null;
  };
  isEdit?: boolean;
}

export function ClienteForm({ cliente, isEdit = false }: ClienteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = isEdit && cliente
        ? await updateCliente(cliente.id, formData)
        : await createCliente(formData);

      if (result.success) {
        setMessage({ text: result.message || "Operación exitosa", ok: true });
        setTimeout(() => router.push("/clientes"), 1200);
      } else {
        setMessage({ text: result.error || "Error en la operación", ok: false });
      }
    } catch {
      setMessage({ text: "Error de conexión al procesar la solicitud", ok: false });
    } finally {
      setLoading(false);
    }
  };

  const niveles = ["Bronce", "Plata", "Oro", "Diamante"];

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6"
      >
        {/* Datos personales */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-purple-500 rounded" />
            <h2 className="text-lg font-semibold text-zinc-100">Datos Personales</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                required
                defaultValue={cliente?.nombre ?? ""}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                placeholder="Ej: García Juan Carlos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                DNI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dni"
                required
                defaultValue={cliente?.dni ?? ""}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
                placeholder="Ej: 12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="telefono"
                required
                defaultValue={cliente?.telefono ?? ""}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                placeholder="Ej: 3704123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Barrio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="barrio"
                required
                defaultValue={cliente?.barrio ?? ""}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                placeholder="Ej: Centro, Villa del Carmen"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                defaultValue={cliente?.observaciones ?? ""}
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                placeholder="Notas internas sobre el cliente..."
              />
            </div>
          </div>
        </section>

        {/* Nivel y descuento — solo visible en edición */}
        {isEdit && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 bg-emerald-500 rounded" />
              <h2 className="text-lg font-semibold text-zinc-100">Nivel y Beneficios</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nivel de cliente</label>
                <select
                  name="nivel"
                  defaultValue={cliente?.nivel ?? "Bronce"}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  {niveles.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input
                  type="checkbox"
                  id="descuento_activo"
                  name="descuento_activo"
                  value="1"
                  defaultChecked={cliente?.descuento_activo === 1}
                  className="w-4 h-4 accent-emerald-500"
                />
                <label htmlFor="descuento_activo" className="text-sm font-medium text-zinc-300">
                  Descuento activo
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Botones */}
        <div className="flex items-center gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.push("/clientes")}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 font-medium transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "Guardar Cambios" : "Crear Cliente"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast */}
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
    </>
  );
}
