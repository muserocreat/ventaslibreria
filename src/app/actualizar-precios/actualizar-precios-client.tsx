"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileSearch,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  aplicarPreciosAction,
  generarPreviewPreciosAction,
  type PrecioCambio,
  type PreciosPreviewState,
} from "@/lib/preciosActions";
import { formatCurrency } from "@/lib/formatter";

type Filtro = "todos" | "subas" | "bajas";

export function ActualizarPreciosClient() {
  const [preview, setPreview] = useState<PreciosPreviewState | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<Filtro>("todos");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const cambios = preview?.cambios ?? [];
  const subas = cambios.filter((cambio) => cambio.accion === "sube");
  const bajas = cambios.filter((cambio) => cambio.accion === "baja");
  const seleccionados = cambios.filter((cambio) => selected.has(cambio.productoId));
  const cambiosVisibles = cambios.filter((cambio) => {
    if (filter === "subas") return cambio.accion === "sube";
    if (filter === "bajas") return cambio.accion === "baja";
    return true;
  });

  const costoAnterior = seleccionados.reduce((acc, cambio) => acc + cambio.costoActual, 0);
  const costoNuevo = seleccionados.reduce((acc, cambio) => acc + cambio.costoAplicado, 0);
  const minoristaAnterior = seleccionados.reduce((acc, cambio) => acc + cambio.minoristaActual, 0);
  const minoristaNuevo = seleccionados.reduce((acc, cambio) => acc + cambio.minoristaNuevo, 0);
  const mayoristaAnterior = seleccionados.reduce((acc, cambio) => acc + cambio.mayoristaActual, 0);
  const mayoristaNuevo = seleccionados.reduce((acc, cambio) => acc + cambio.mayoristaNuevo, 0);
  const totals = {
    impactoCosto: costoNuevo - costoAnterior,
    impactoMinorista: minoristaNuevo - minoristaAnterior,
    impactoMayorista: mayoristaNuevo - mayoristaAnterior,
  };

  const generatedAt = preview?.generatedAt
    ? new Date(preview.generatedAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const generarPreview = () => {
    setMessage(null);
    setAuthorized(false);
    startTransition(async () => {
      const result = await generarPreviewPreciosAction();
      setPreview(result);
      setFilter("todos");

      const nuevosSeleccionados = new Set(
        (result.cambios ?? [])
          .filter((cambio) => cambio.accion === "sube")
          .map((cambio) => cambio.productoId)
      );
      setSelected(nuevosSeleccionados);

      if (!result.ok) {
        setMessage({ ok: false, text: result.error ?? "No se pudo generar el informe" });
      }
    });
  };

  const aplicarPrecios = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await aplicarPreciosAction(seleccionados);
      if (result.ok) {
        setMessage({ ok: true, text: `${result.actualizados ?? 0} productos actualizados correctamente.` });
        setPreview(null);
        setSelected(new Set());
        setAuthorized(false);
      } else {
        setMessage({ ok: false, text: result.error ?? "No se pudieron aplicar los precios" });
      }
    });
  };

  const toggle = (productoId: number) => {
    setAuthorized(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productoId)) next.delete(productoId);
      else next.add(productoId);
      return next;
    });
  };

  const selectAllSubas = () => {
    setAuthorized(false);
    setSelected(new Set(subas.map((cambio) => cambio.productoId)));
  };

  const clearSelection = () => {
    setAuthorized(false);
    setSelected(new Set());
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actualizar Precios</h1>
          <p className="text-zinc-400 mt-1">
            Primero se descarga y compara la lista. Despues revisas el informe y autorizas la actualizacion.
          </p>
        </div>
        <button
          onClick={generarPreview}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition-all hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Paso 1: Descargar y Comparar
        </button>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 ${message.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {message.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <MetricCard label="Filas proveedor" value={preview?.proveedorFilas ?? 0} />
        <MetricCard label="Productos comparados" value={preview?.productosComparados ?? 0} />
        <MetricCard label="Subas aplicables" value={subas.length} tone="emerald" />
        <MetricCard label="Bajas informadas" value={bajas.length} tone="orange" />
      </div>

      {preview?.ok && (
        <>
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-orange-100">Paso 2: Autorizar actualizacion</h2>
                </div>
                <p className="text-sm text-zinc-400">
                  Revise el informe, ajuste la seleccion y confirme explicitamente antes de modificar la base de datos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:min-w-[620px]">
                <SummaryBox label="Seleccionados" value={String(seleccionados.length)} />
                <SummaryBox label="Impacto costo" value={formatCurrency(totals.impactoCosto)} />
                <SummaryBox label="Impacto minorista" value={formatCurrency(totals.impactoMinorista)} />
                <SummaryBox label="Impacto mayorista" value={formatCurrency(totals.impactoMayorista)} />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300 lg:flex-1">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(event) => setAuthorized(event.target.checked)}
                  disabled={seleccionados.length === 0}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 disabled:opacity-40"
                />
                <span>
                  Revise el listado y autorizo actualizar los precios seleccionados en la base de datos.
                </span>
              </label>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button onClick={selectAllSubas} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700">
                  Seleccionar subas
                </button>
                <button onClick={clearSelection} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700">
                  Limpiar
                </button>
                <button
                  onClick={aplicarPrecios}
                  disabled={isPending || seleccionados.length === 0 || !authorized}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Autorizar Actualizacion
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
              <div className="flex flex-col gap-4 border-b border-zinc-800 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-bold">Paso 1: Informe de diferencias</h2>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {generatedAt ? `Generado ${generatedAt}` : "Comparacion generada"} · Se informan diferencias mayores a $50.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterButton active={filter === "todos"} onClick={() => setFilter("todos")}>
                    Todos ({cambios.length})
                  </FilterButton>
                  <FilterButton active={filter === "subas"} onClick={() => setFilter("subas")}>
                    Subas ({subas.length})
                  </FilterButton>
                  <FilterButton active={filter === "bajas"} onClick={() => setFilter("bajas")}>
                    Bajas ({bajas.length})
                  </FilterButton>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-800/60 text-xs uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Autorizar</th>
                      <th className="px-4 py-3 min-w-[280px]">Articulo</th>
                      <th className="px-4 py-3">Costo actual</th>
                      <th className="px-4 py-3">Costo proveedor</th>
                      <th className="px-4 py-3">Costo aplicado</th>
                      <th className="px-4 py-3">Minorista</th>
                      <th className="px-4 py-3">Mayorista</th>
                      <th className="px-4 py-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {cambiosVisibles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                          No hay diferencias para este filtro.
                        </td>
                      </tr>
                    ) : (
                      cambiosVisibles.map((cambio) => (
                        <CambioRow
                          key={`${cambio.productoId}-${cambio.codigo}`}
                          cambio={cambio}
                          checked={selected.has(cambio.productoId)}
                          onToggle={() => toggle(cambio.productoId)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!preview && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
          <RefreshCw className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">Todavia no se genero una comparacion de precios.</p>
        </div>
      )}
    </div>
  );
}

function CambioRow({ cambio, checked, onToggle }: { cambio: PrecioCambio; checked: boolean; onToggle: () => void }) {
  const canApply = cambio.accion === "sube";

  return (
    <tr className="hover:bg-zinc-800/30">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={!canApply}
          onChange={onToggle}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-500 disabled:opacity-30"
        />
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-zinc-100">{cambio.nombre || cambio.proveedorNombre}</p>
        <p className="font-mono text-xs text-zinc-500">{cambio.codigo}</p>
        {cambio.proveedorNombre && cambio.proveedorNombre !== cambio.nombre && (
          <p className="mt-1 text-xs text-zinc-600">Proveedor: {cambio.proveedorNombre}</p>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-300">{formatCurrency(cambio.costoActual)}</td>
      <td className="px-4 py-3">
        <p className="font-bold text-zinc-100">{formatCurrency(cambio.costoProveedor)}</p>
        <p className={`text-xs ${cambio.diferencia > 0 ? "text-emerald-400" : "text-orange-400"}`}>
          {cambio.diferencia > 0 ? "+" : ""}
          {formatCurrency(cambio.diferencia)}
        </p>
      </td>
      <td className="px-4 py-3 font-semibold text-zinc-100">{formatCurrency(cambio.costoAplicado)}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-emerald-400">{formatCurrency(cambio.minoristaNuevo)}</p>
        <p className="text-xs text-zinc-500">antes {formatCurrency(cambio.minoristaActual)}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-blue-400">{formatCurrency(cambio.mayoristaNuevo)}</p>
        <p className="text-xs text-zinc-500">antes {formatCurrency(cambio.mayoristaActual)}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase ${
          canApply ? "bg-emerald-500/15 text-emerald-400" : "bg-orange-500/15 text-orange-400"
        }`}>
          {canApply ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {canApply ? "Sube" : "No baja"}
        </span>
      </td>
    </tr>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
        active ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-zinc-950/70 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-zinc-100" title={value}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "emerald" | "orange" }) {
  const color = {
    zinc: "text-zinc-100",
    emerald: "text-emerald-400",
    orange: "text-orange-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
