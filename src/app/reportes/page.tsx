import {
  getKPIsAction,
  getGastosPorCategoriaAction,
  getGastosDetalladosAction,
  getTopProductosRentablesAction,
  getFlujosCajaAction,
  getMetodosPagoDistribucionAction,
  getObligacionesAction,
  getCuentasCorrientesResumenAction,
  getDistribucionDiariaAction,
  getGastosPorTipoAction,
  getSaludNegocioAction,
  getDeudasAction,
  getAlertasPredictivasAction,
  type Periodo,
  type AlertaPredictiva,
} from "@/lib/reportesActions";
import { formatCurrency } from "@/lib/formatter";
import { getConfiguracionNumeroAction, registrarPagoObligacionAction } from "@/lib/configActions";
import {
  TrendingUp, TrendingDown, DollarSign, Target, BarChart3,
  PieChart, ArrowUpRight, ArrowDownRight, Wallet, CreditCard,
  AlertTriangle, CheckCircle, Clock, Users, Layers,
  RefreshCw, Shield, Activity, Bell, Settings,
} from "lucide-react";
import { VentasGastosLineChart } from "@/components/charts/VentasGastosLineChart";
import { GastosPieChart } from "@/components/charts/GastosPieChart";
import { FlujosCajaChart } from "@/components/charts/FlujosCajaChart";
import { MetodosPagoChart } from "@/components/charts/MetodosPagoChart";
import { GastoForm } from "./GastoForm";
import { DeudaForm } from "./DeudaForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { key: "hoy", label: "Hoy" },
  { key: "7dias", label: "7 días" },
  { key: "mes", label: "Este ciclo" },
  { key: "mes_anterior", label: "Ciclo anterior" },
  { key: "anio", label: "Este año" },
] as const;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo; fechaDesde?: string; fechaHasta?: string; page?: string }>;
}) {
  const params = await searchParams;
  const periodo = params.periodo || "mes";
  const page = parseInt(params.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const [
    kpis, gastosPorCategoria, gastosDetallados, topProductos,
    flujos, metodosPago, obligaciones, ctasCtes,    distribucion,
    gastosPorTipo, salud, deudas, alertasPredictivas,
  ] = await Promise.all([
    getKPIsAction(periodo, params.fechaDesde, params.fechaHasta),
    getGastosPorCategoriaAction(periodo, params.fechaDesde, params.fechaHasta),
    getGastosDetalladosAction(periodo, params.fechaDesde, params.fechaHasta, limit, offset),
    getTopProductosRentablesAction(periodo, params.fechaDesde, params.fechaHasta, 10),
    getFlujosCajaAction(periodo, params.fechaDesde, params.fechaHasta),
    getMetodosPagoDistribucionAction(periodo, params.fechaDesde, params.fechaHasta),
    getObligacionesAction(),
    getCuentasCorrientesResumenAction(),
    getDistribucionDiariaAction(),
    getGastosPorTipoAction(periodo, params.fechaDesde, params.fechaHasta),
    getSaludNegocioAction(periodo, params.fechaDesde, params.fechaHasta),
    getDeudasAction(),
    getAlertasPredictivasAction(),
  ]);

  const totalPages = Math.ceil(gastosDetallados.total / limit);
  const totalGastosDia = distribucion.totalFijosDiario + distribucion.gastosOperativosDia + distribucion.gastosReinversionDia;
  const noAlcanza = distribucion.recaudacion > 0 && distribucion.recaudacion < totalGastosDia;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes Financieros</h1>
        <p className="text-zinc-500 mt-1">Ciclo operativo: 10 al 9 de cada mes</p>
      </div>

      {/* Periodo Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <a
            key={p.key}
            href={`/reportes?periodo=${p.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === p.key
                ? "bg-orange-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {/* ═══ Alertas Predictivas ═══ */}
      {alertasPredictivas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">Alertas ({alertasPredictivas.length})</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {alertasPredictivas.map((alerta, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                alerta.tipo === "danger" ? "bg-red-500/10 border-red-500/30" :
                alerta.tipo === "warning" ? "bg-yellow-500/10 border-yellow-500/30" :
                "bg-emerald-500/10 border-emerald-500/30"
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">{alerta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${
                      alerta.tipo === "danger" ? "text-red-400" :
                      alerta.tipo === "warning" ? "text-yellow-400" :
                      "text-emerald-400"
                    }`}>{alerta.titulo}</p>
                    <p className="text-xs text-zinc-400 mt-1">{alerta.mensaje}</p>
                    {alerta.accion && (
                      <p className={`text-xs font-medium mt-2 ${
                        alerta.tipo === "danger" ? "text-red-300" :
                        alerta.tipo === "warning" ? "text-yellow-300" :
                        "text-emerald-300"
                      }`}>{alerta.accion}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Salud del Negocio ═══ */}
      {(() => {
        const colorMap: Record<string, { bg: string; border: string; text: string; bar: string; ring: string }> = {
          emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-500", ring: "ring-emerald-500/30" },
          green:   { bg: "bg-green-500/10",   border: "border-green-500/30",   text: "text-green-400",   bar: "bg-green-500",   ring: "ring-green-500/30" },
          yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  text: "text-yellow-400",  bar: "bg-yellow-500",  ring: "ring-yellow-500/30" },
          orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  bar: "bg-orange-500",  ring: "ring-orange-500/30" },
          red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     bar: "bg-red-500",     ring: "ring-red-500/30" },
        };
        const c = colorMap[salud.color] || colorMap.yellow;
        return (
          <div className={`${c.bg} border ${c.border} rounded-2xl p-6`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Puntaje */}
              <div className="flex items-center gap-5 shrink-0">
                <div className={`relative w-20 h-20 rounded-full ring-4 ${c.ring} flex items-center justify-center bg-zinc-950`}>
                  <span className={`text-2xl font-black ${c.text}`}>{salud.puntaje}</span>
                  <span className="absolute -bottom-1 text-[9px] font-bold text-zinc-500">/ 100</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${c.text}`} />
                    <h2 className="text-lg font-bold">Salud del Negocio</h2>
                  </div>
                  <p className={`text-sm font-semibold ${c.text} capitalize mt-0.5`}>{salud.emoji} {salud.nivel}</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">{salud.mensaje}</p>
                </div>
              </div>

              {/* Factores */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {salud.factores.map((f: { nombre: string; puntaje: number; max: number; detalle: string }) => (
                  <div key={f.nombre} className="bg-zinc-950/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-zinc-400">{f.nombre}</span>
                      <span className={`text-[11px] font-bold ${c.text}`}>{f.puntaje}/{f.max}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${(f.puntaje / f.max) * 100}%` }} />
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-1.5 leading-tight">{f.detalle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/15"><TrendingUp className="w-6 h-6 text-emerald-500" /></div>
            <span className={`text-xs font-bold flex items-center gap-1 ${kpis.deltaVentas >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {kpis.deltaVentas >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(kpis.deltaVentas).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Ventas Totales</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.ventasTotales)}</p>
          <p className="text-xs text-zinc-500 mt-1">Promedio: {formatCurrency(kpis.ventasPromedioDiarias)}/día</p>
        </div>
        {/* Gastos Operativos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-500/15"><TrendingDown className="w-6 h-6 text-red-500" /></div>
            <span className={`text-xs font-bold flex items-center gap-1 ${kpis.deltaGastos <= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {kpis.deltaGastos <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              {Math.abs(kpis.deltaGastos).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Gastos Operativos</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.gastosOperativos)}</p>
        </div>
        {/* Egresos Totales */}
        {kpis.egresosTotales > kpis.gastosOperativos && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-red-500/15"><TrendingDown className="w-6 h-6 text-red-500" /></div>
              <span className="text-xs font-bold text-zinc-400">
                +{formatCurrency(kpis.egresosTotales - kpis.gastosOperativos)}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-400">Egresos Totales</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.egresosTotales)}</p>
          </div>
        )}
        {/* Utilidad */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${kpis.utilidadBruta >= 0 ? "bg-blue-500/15" : "bg-red-500/15"}`}>
              <DollarSign className={`w-6 h-6 ${kpis.utilidadBruta >= 0 ? "text-blue-500" : "text-red-500"}`} />
            </div>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">{kpis.margenPromedio.toFixed(1)}% margen</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Utilidad Bruta</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.utilidadBruta)}</p>
        </div>
        {/* Punto Equilibrio */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-orange-500/15"><Target className="w-6 h-6 text-orange-500" /></div>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Mínimo mensual</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Punto Equilibrio</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.puntoEquilibrio)}</p>
        </div>
      </div>

      {/* ═══ Distribución Diaria ═══ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/15 rounded-lg"><Layers className="w-5 h-5 text-purple-500" /></div>
          <div>
            <h2 className="text-lg font-bold">Distribución Diaria</h2>
            <p className="text-xs text-zinc-500">Asignación de fondos líquidos — {distribucion.operaciones} operaciones · Ticket prom: {formatCurrency(distribucion.ticketPromedio)}</p>
          </div>
        </div>

        {distribucion.recaudacionCC > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-blue-300">Ventas en Cuenta Corriente: <span className="font-bold">{formatCurrency(distribucion.recaudacionCC)}</span></p>
            </div>
            <p className="text-[10px] text-blue-400/70 italic">No incluido en distribución líquida hoy</p>
          </div>
        )}

        {noAlcanza && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">La recaudación del día no alcanza para cubrir los costos del día</p>
          </div>
        )}

        {/* KPIs del día */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-zinc-950 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ingresos Líquidos</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(distribucion.recaudacionLiquida)}</p>
          </div>
          <div className="bg-zinc-950 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reposición (CMV)</p>
            <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(distribucion.cmv)}</p>
          </div>
          <div className="bg-zinc-950 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fijos + Pasivos</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(distribucion.totalFijosDiario + distribucion.provisionDeudas)}</p>
          </div>
          <div className="bg-zinc-950 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1"><RefreshCw className="w-3 h-3" /> Reinversión 70%</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(distribucion.reinversion70)}</p>
          </div>
          <div className="bg-zinc-950 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Fondo + Ganancia 30%</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(distribucion.fondoEmergencia30)}</p>
          </div>
        </div>

        {/* Mínimo requerido para hoy */}
        {(() => {
          const pctMinimo = distribucion.minimoRequerido > 0 ? Math.min(100, (distribucion.recaudacion / distribucion.minimoRequerido) * 100) : 0;
          const alcanzado = distribucion.recaudacion >= distribucion.minimoRequerido;
          const falta = Math.max(0, distribucion.minimoRequerido - distribucion.recaudacion);
          return (
            <div className={`rounded-xl p-4 mb-4 border ${alcanzado ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={`w-4 h-4 ${alcanzado ? "text-emerald-400" : "text-amber-400"}`} />
                  <span className="text-sm font-semibold">Punto de Equilibrio Hoy (Líquido)</span>
                </div>
                <span className={`text-lg font-bold ${alcanzado ? "text-emerald-400" : "text-amber-400"}`}>{formatCurrency(distribucion.minimoRequerido)}</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${alcanzado ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${pctMinimo}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">
                  {distribucion.minimoDetalle.map((d: { concepto: string; monto: number }) => `${d.concepto}: ${formatCurrency(d.monto)}`).join(" + ")}
                </span>
                <span className={`font-semibold ${alcanzado ? "text-emerald-400" : "text-amber-400"}`}>
                  {alcanzado ? `✓ Superado por ${formatCurrency(distribucion.recaudacionLiquida - distribucion.minimoRequerido)}` : `Faltan ${formatCurrency(falta)} líquidos`}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Barra apilada */}
        {distribucion.recaudacion > 0 && (() => {
          const base = Math.max(distribucion.recaudacion, totalGastosDia + distribucion.reinversion70 + distribucion.fondoEmergencia30);
          const pct = (v: number) => ((v / base) * 100).toFixed(1);
          const segments = [
            { value: distribucion.totalFijosDiario, color: "bg-red-500", label: "Costos Fijos" },
            { value: distribucion.gastosOperativosDia, color: "bg-orange-500", label: "Operativos" },
            { value: distribucion.gastosReinversionDia, color: "bg-yellow-500", label: "G. Reinversión" },
            { value: distribucion.reinversion70, color: "bg-blue-500", label: "Reinversión 70%" },
            { value: distribucion.fondoEmergencia30, color: "bg-emerald-500", label: "Fondo 30%" },
          ].filter(s => s.value > 0);
          return (
            <div className="mb-4">
              <div className="flex rounded-xl overflow-hidden h-8">
                {segments.map(s => (
                  <div key={s.label} className={`${s.color} flex items-center justify-center text-[10px] font-bold text-white`}
                    style={{ width: `${pct(s.value)}%` }} title={`${s.label}: ${formatCurrency(s.value)}`}>
                    {parseFloat(pct(s.value)) >= 8 ? `${parseFloat(pct(s.value)).toFixed(0)}%` : ""}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-zinc-500">
                {segments.map(s => (
                  <span key={s.label} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tabla de sobres */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Concepto</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-medium">Monto</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-medium">% Recaudación</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800/60">
                <td className="py-2 px-2">
                  <p className="text-zinc-300">📦 Reposición Stock (CMV)</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Costo de mercadería vendida hoy</p>
                </td>
                <td className="py-2 px-2 text-right text-red-400 font-medium">{formatCurrency(distribucion.cmv)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacionLiquida > 0 ? ((distribucion.cmv / distribucion.recaudacionLiquida) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="border-b border-zinc-800/60">
                <td className="py-2 px-2">
                  <p className="text-zinc-300">🏠 Costos Fijos</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{distribucion.costosFijos.map(f => `${f.nombre} ${formatCurrency(f.cuotaDiaria)}`).join(" · ")}</p>
                </td>
                <td className="py-2 px-2 text-right text-orange-400 font-medium">{formatCurrency(distribucion.totalFijosDiario)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacionLiquida > 0 ? ((distribucion.totalFijosDiario / distribucion.recaudacionLiquida) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="border-b border-zinc-800/60">
                <td className="py-2 px-2">
                  <p className="text-zinc-300">💳 Provisión de Pasivos</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Cuota diaria para saldar deudas del ciclo</p>
                </td>
                <td className="py-2 px-2 text-right text-purple-400 font-medium">{formatCurrency(distribucion.provisionDeudas)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacionLiquida > 0 ? ((distribucion.provisionDeudas / distribucion.recaudacionLiquida) * 100).toFixed(1) : 0}%</td>
              </tr>
              {distribucion.gastosOperativosDia > 0 && (
                <tr className="border-b border-zinc-800/60">
                  <td className="py-2 px-2 text-zinc-300">📊 Gastos Operativos</td>
                  <td className="py-2 px-2 text-right text-orange-400">{formatCurrency(distribucion.gastosOperativosDia)}</td>
                  <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacion > 0 ? ((distribucion.gastosOperativosDia / distribucion.recaudacion) * 100).toFixed(1) : 0}%</td>
                </tr>
              )}
              {distribucion.gastosReinversionDia > 0 && (
                <tr className="border-b border-zinc-800/60">
                  <td className="py-2 px-2 text-zinc-300">🛒 Gastos Reinversión</td>
                  <td className="py-2 px-2 text-right text-yellow-400">{formatCurrency(distribucion.gastosReinversionDia)}</td>
                  <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacion > 0 ? ((distribucion.gastosReinversionDia / distribucion.recaudacion) * 100).toFixed(1) : 0}%</td>
                </tr>
              )}
              <tr className="border-b border-zinc-800/60 bg-zinc-950">
                <td className="py-2 px-2 text-zinc-200 font-medium">Excedente</td>
                <td className="py-2 px-2 text-right text-zinc-100 font-bold">{formatCurrency(distribucion.excedente)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacion > 0 ? ((distribucion.excedente / distribucion.recaudacion) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="border-b border-zinc-800/60 bg-blue-500/5">
                <td className="py-2 px-2 text-blue-300 font-medium">🔄 Reinversión (70% excedente)</td>
                <td className="py-2 px-2 text-right text-blue-400 font-bold">{formatCurrency(distribucion.reinversion70)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacion > 0 ? ((distribucion.reinversion70 / distribucion.recaudacion) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="bg-emerald-500/5">
                <td className="py-2 px-2 text-emerald-300 font-medium">💰 Fondo + Ganancia (30% excedente)</td>
                <td className="py-2 px-2 text-right text-emerald-400 font-bold">{formatCurrency(distribucion.fondoEmergencia30)}</td>
                <td className="py-2 px-2 text-right text-zinc-500">{distribucion.recaudacion > 0 ? ((distribucion.fondoEmergencia30 / distribucion.recaudacion) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Proyección de Liberación de Flujo ═══ */}
      {distribucion.liberacionFlujo.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/15 rounded-lg"><Shield className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <h2 className="text-lg font-bold">Proyección de Liberación de Flujo</h2>
              <p className="text-xs text-zinc-500">Al pagar estas deudas, tu mínimo requerido diario disminuirá</p>
            </div>
          </div>
          <div className="space-y-2">
            {distribucion.liberacionFlujo.map((d) => (
              <div key={d.nombre} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{d.nombre}</p>
                    <p className="text-xs text-zinc-500">Saldo pendiente: {formatCurrency(d.saldo)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Ahorro diario</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(d.ahorroDiario)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Gastos por Tipo y Deuda Tarjeta ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registrar Gasto */}
        <GastoForm />

        {/* Gastos por Tipo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/15 rounded-lg"><DollarSign className="w-5 h-5 text-orange-500" /></div>
            <h2 className="text-lg font-bold">Gastos por Tipo</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-950 rounded-xl p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Operativos</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-300">💵 Efectivo</span>
                <span className="text-sm font-bold text-zinc-200">{formatCurrency(gastosPorTipo.operativosEfectivo)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">💳 Tarjeta</span>
                <span className="text-sm font-bold text-purple-400">{formatCurrency(gastosPorTipo.operativosTarjeta)}</span>
              </div>
            </div>
            <div className="bg-zinc-950 rounded-xl p-4">
              <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Reinversión</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-300">💵 Efectivo</span>
                <span className="text-sm font-bold text-zinc-200">{formatCurrency(gastosPorTipo.reinversionEfectivo)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300">💳 Tarjeta</span>
                <span className="text-sm font-bold text-purple-400">{formatCurrency(gastosPorTipo.reinversionTarjeta)}</span>
              </div>
            </div>
            <div className="bg-zinc-950 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-300">Total en Tarjeta (deuda)</span>
              <span className="text-lg font-bold text-purple-400">{formatCurrency(gastosPorTipo.operativosTarjeta + gastosPorTipo.reinversionTarjeta)}</span>
            </div>
          </div>
        </div>

        {/* Deudas */}
        <DeudaForm deudas={deudas} />
      </div>

      {/* ═══ Gráficos principales ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/15 rounded-lg"><BarChart3 className="w-5 h-5 text-emerald-500" /></div>
            <h2 className="text-lg font-bold">Evolución Ventas vs Gastos</h2>
          </div>
          <VentasGastosLineChart data={flujos} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/15 rounded-lg"><Wallet className="w-5 h-5 text-emerald-500" /></div>
            <h2 className="text-lg font-bold">Flujo de Caja</h2>
          </div>
          <FlujosCajaChart data={flujos} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/15 rounded-lg"><PieChart className="w-5 h-5 text-red-500" /></div>
            <h2 className="text-lg font-bold">Distribución de Gastos</h2>
          </div>
          <GastosPieChart data={gastosPorCategoria} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/15 rounded-lg"><CreditCard className="w-5 h-5 text-purple-500" /></div>
            <h2 className="text-lg font-bold">Métodos de Pago</h2>
          </div>
          <MetodosPagoChart data={metodosPago} />
        </div>
      </div>

      {/* ═══ Obligaciones y Cuentas Corrientes ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obligaciones */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/15 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
              <h2 className="text-lg font-bold">Obligaciones del Ciclo</h2>
            </div>
            <Link
              href="/configuraciones"
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-300"
              title="Configurar obligaciones"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
          {obligaciones.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No hay obligaciones activas</p>
          ) : (
            <div className="space-y-2">
              {obligaciones.map((o) => (
                <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                  o.estado === "pagada" ? "bg-emerald-500/5 border-emerald-500/20" :
                  o.estado === "vencida" ? "bg-red-500/5 border-red-500/20" :
                  "bg-zinc-950 border-zinc-800"
                }`}>
                  <div className="flex items-center gap-3">
                    {o.estado === "pagada" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                     o.estado === "vencida" ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                     <Clock className="w-4 h-4 text-yellow-400" />}
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{o.nombre}</p>
                      <p className="text-xs text-zinc-500">Vence día {o.vencimiento_dia}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${o.estado === "pagada" ? "text-emerald-400" : "text-zinc-200"}`}>
                        {formatCurrency(o.monto_estimado)}
                      </p>
                      {o.monto_pagado > 0 && o.estado !== "pagada" && (
                        <p className="text-xs text-zinc-500">Pagado: {formatCurrency(o.monto_pagado)}</p>
                      )}
                    </div>
                    {o.estado !== "pagada" && (
                      <form action={async () => {
                        "use server";
                        const montoRestante = o.monto_estimado - o.monto_pagado;
                        await registrarPagoObligacionAction(o.id, montoRestante);
                      }}>
                        <button
                          type="submit"
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                          title="Marcar como pagada"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cuentas Corrientes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/15 rounded-lg"><Users className="w-5 h-5 text-purple-500" /></div>
            <div>
              <h2 className="text-lg font-bold">Cuentas Corrientes</h2>
              <p className="text-xs text-zinc-500">Total deuda: {formatCurrency(ctasCtes.totalDeuda)}</p>
            </div>
          </div>
          {ctasCtes.topDeudores.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">Sin deudas pendientes</p>
          ) : (
            <div className="space-y-2">
              {ctasCtes.topDeudores.map((c) => (
                <div key={c.cliente_id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <p className="text-sm font-medium text-zinc-200">{c.nombre}</p>
                  <p className="text-sm font-bold text-orange-400">{formatCurrency(c.saldo)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Tablas: Gastos + Top Productos ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Gastos Detallados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-2 text-zinc-500 font-medium">Descripción</th>
                  <th className="text-left py-3 px-2 text-zinc-500 font-medium">Tipo</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Monto</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {gastosDetallados.items.map((g) => (
                  <tr key={g.id} className="border-b border-zinc-800/60">
                    <td className="py-3 px-2 text-zinc-200">{g.descripcion}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          g.categoria === 1 ? "bg-orange-500/15 text-orange-400" :
                          g.categoria === 3 ? "bg-purple-500/15 text-purple-400" :
                          "bg-blue-500/15 text-blue-400"
                        }`}>
                          {g.categoria === 1 ? "Operativo" : g.categoria === 3 ? "Deuda / Pasivo" : "Reinversión"}
                        </span>
                        {g.medio_pago && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.medio_pago.toLowerCase() === "tarjeta" ? "bg-purple-500/15 text-purple-400" : "bg-zinc-700 text-zinc-400"}`}>
                            {g.medio_pago}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-zinc-300">{formatCurrency(g.monto)}</td>
                    <td className="py-3 px-2 text-right text-zinc-500">{g.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-zinc-500">
                {(page - 1) * limit + 1}–{Math.min(page * limit, gastosDetallados.total)} de {gastosDetallados.total}
              </p>
              <div className="flex gap-2">
                {page > 1 && <a href={`/reportes?periodo=${periodo}&page=${page - 1}`} className="px-3 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700">Anterior</a>}
                {page < totalPages && <a href={`/reportes?periodo=${periodo}&page=${page + 1}`} className="px-3 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700">Siguiente</a>}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Top 10 Productos Rentables</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-2 text-zinc-500 font-medium">Producto</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Vendidos</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Utilidad</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.map((prod) => (
                  <tr key={prod.producto_id} className="border-b border-zinc-800/60">
                    <td className="py-3 px-2 text-zinc-200 truncate max-w-[150px]">{prod.nombre}</td>
                    <td className="py-3 px-2 text-right text-zinc-300">{prod.cantidad_vendida}</td>
                    <td className={`py-3 px-2 text-right font-medium ${prod.utilidad >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(prod.utilidad)}</td>
                    <td className={`py-3 px-2 text-right font-medium ${prod.margen >= 0 ? "text-emerald-400" : "text-red-400"}`}>{prod.margen.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
