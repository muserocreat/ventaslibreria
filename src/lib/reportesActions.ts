"use server";

import { db } from "@/db";
import {
  ventas, detalle_venta, gastos, gastos_fijos,
  obligaciones_fijas, pagos_obligaciones, pagos_tarjeta,
  cuentas_corrientes, clientes,
  pedidos, deudas, pagos_deuda,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────

export type Periodo = "hoy" | "7dias" | "mes" | "mes_anterior" | "anio" | "personalizado";

export type KPIsResult = {
  ventasTotales: number;
  gastosOperativos: number; // Solo cat 1 y 2 (reales del negocio)
  egresosTotales: number;   // Todos los egresos incluyendo deuda/pasivo
  utilidadBruta: number;
  margenPromedio: number;
  puntoEquilibrio: number;
  ventasPromedioDiarias: number;
  deltaVentas: number;
  deltaGastos: number;
};

export type VentaDia = { fecha: string; ventas: number };
export type GastoCategoria = { categoria: string; monto: number };
export type GastoDetalle = { id: number; descripcion: string; monto: number; fecha: string; categoria: number; medio_pago: string | null };
export type ProductoRentable = { producto_id: number; nombre: string; cantidad_vendida: number; venta_total: number; costo_total: number; utilidad: number; margen: number };

export type FlujoItem = { fecha: string; ingresos: number; egresos: number };
export type MetodoPagoItem = { metodo: string; monto: number };
export type ObligacionItem = { id: number; nombre: string; descripcion: string | null; monto_estimado: number; vencimiento_dia: number; pagada: boolean; monto_pagado: number; estado: "pagada" | "pendiente" | "vencida" };
export type CuentaCorrienteItem = { cliente_id: number; nombre: string; saldo: number };
export type PedidoResumen = { pendientes: number; entregados: number; totalAdelantos: number; saldoPorCobrar: number; items: PedidoItem[] };
export type PedidoItem = { id: number; codigo: string | null; cliente_id: number | null; total: number; estado: string | null; fecha_estimada: string | null; adelanto: number; saldo: number };
export type DistribucionDiaria = {
  recaudacion: number;
  costosFijos: { nombre: string; cuotaDiaria: number }[];
  totalFijosDiario: number;
  gastosOperativosDia: number;
  gastosReinversionDia: number;
  excedente: number;
  reinversion70: number;
  fondoEmergencia30: number;
  operaciones: number;
  ticketPromedio: number;
  minimoRequerido: number;
  minimoDetalle: { concepto: string; monto: number }[];
  liberacionFlujo: { nombre: string; saldo: number; ahorroDiario: number }[];
};

export type DeudaTarjeta = {
  totalDeuda: number;
  gastosEnTarjeta: { descripcion: string; monto: number; fecha: string; tipo: string }[];
  pagosRealizados: { monto: number; fecha: string; nota: string | null }[];
  totalPagado: number;
};

export type GastosPorTipo = {
  operativosEfectivo: number;
  operativosTarjeta: number;
  reinversionEfectivo: number;
  reinversionTarjeta: number;
};

export type SaludNegocio = {
  puntaje: number;             // 0-100
  nivel: "critico" | "riesgo" | "atencion" | "saludable" | "excelente";
  color: string;
  emoji: string;
  mensaje: string;
  factores: { nombre: string; puntaje: number; max: number; detalle: string }[];
};

export type AlertaPredictiva = {
  tipo: "warning" | "danger" | "opportunity";
  emoji: string;
  titulo: string;
  mensaje: string;
  accion?: string;
  monto?: number;
  diasRestantes?: number;
};

// ── Ciclo operativo 10-al-9 ─────────────────────────────────────

function getCicloActual(): { desde: string; hasta: string } {
  const hoy = new Date();
  const dia = hoy.getDate();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();

  if (dia >= 10) {
    const desde = new Date(anio, mes, 10);
    const hasta = new Date(anio, mes + 1, 9);
    return { desde: fmt(desde), hasta: fmt(hasta) };
  } else {
    const desde = new Date(anio, mes - 1, 10);
    const hasta = new Date(anio, mes, 9);
    return { desde: fmt(desde), hasta: fmt(hasta) };
  }
}

function getCicloAnterior(): { desde: string; hasta: string } {
  const actual = getCicloActual();
  const d = new Date(actual.desde);
  const desde = new Date(d.getFullYear(), d.getMonth() - 1, 10);
  const hasta = new Date(d.getFullYear(), d.getMonth(), 9);
  return { desde: fmt(desde), hasta: fmt(hasta) };
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPeriodoFilter(periodo: Periodo, fechaDesde?: string, fechaHasta?: string) {
  switch (periodo) {
    case "hoy":
      return sql`date(${ventas.fecha}) = date('now','localtime')`;
    case "7dias":
      return sql`date(${ventas.fecha}) >= date('now','localtime', '-7 days')`;
    case "mes": {
      const c = getCicloActual();
      return sql`date(${ventas.fecha}) >= ${c.desde} AND date(${ventas.fecha}) <= ${c.hasta}`;
    }
    case "mes_anterior": {
      const c = getCicloAnterior();
      return sql`date(${ventas.fecha}) >= ${c.desde} AND date(${ventas.fecha}) <= ${c.hasta}`;
    }
    case "anio":
      return sql`strftime('%Y', ${ventas.fecha}) = strftime('%Y', 'now', 'localtime')`;
    case "personalizado":
      if (!fechaDesde || !fechaHasta) return sql`1=0`;
      return sql`date(${ventas.fecha}) >= ${fechaDesde} AND date(${ventas.fecha}) <= ${fechaHasta}`;
    default:
      return sql`1=1`;
  }
}

function getGastosPeriodoFilter(periodo: Periodo, fechaDesde?: string, fechaHasta?: string) {
  switch (periodo) {
    case "hoy":
      return sql`date(${gastos.fecha}) = date('now','localtime')`;
    case "7dias":
      return sql`date(${gastos.fecha}) >= date('now','localtime', '-7 days')`;
    case "mes": {
      const c = getCicloActual();
      return sql`date(${gastos.fecha}) >= ${c.desde} AND date(${gastos.fecha}) <= ${c.hasta}`;
    }
    case "mes_anterior": {
      const c = getCicloAnterior();
      return sql`date(${gastos.fecha}) >= ${c.desde} AND date(${gastos.fecha}) <= ${c.hasta}`;
    }
    case "anio":
      return sql`strftime('%Y', ${gastos.fecha}) = strftime('%Y', 'now', 'localtime')`;
    case "personalizado":
      if (!fechaDesde || !fechaHasta) return sql`1=0`;
      return sql`date(${gastos.fecha}) >= ${fechaDesde} AND date(${gastos.fecha}) <= ${fechaHasta}`;
    default:
      return sql`1=1`;
  }
}

// ── 1. KPIs con comparativo ─────────────────────────────────────

export async function getKPIsAction(
  periodo: Periodo = "mes",
  fechaDesde?: string,
  fechaHasta?: string
): Promise<KPIsResult> {
  const filter = getPeriodoFilter(periodo, fechaDesde, fechaHasta);
  const gFilter = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);

  const [ventasResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` })
    .from(ventas).where(filter);

  // Gastos operativos = cat 1 y 2 (reales del negocio)
  const [gastosOpResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos).where(sql`${gFilter} AND ${gastos.categoria} IN (1, 2)`);

  // Egresos totales = todos incluyendo deuda/pasivo (cat 3 o excluir_distribucion=1)
  const [egresosTotalResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos).where(gFilter);

  const gastosOperativos = gastosOpResult.total || 0;
  const egresosTotales = egresosTotalResult.total || 0;
  const utilidadBruta = ventasResult.total - gastosOperativos;
  const margenPromedio = ventasResult.total > 0 ? (utilidadBruta / ventasResult.total) * 100 : 0;

  // Punto de equilibrio: costos fijos mensuales / margen de contribución real
  const gastosFijosRows = await db
    .select({ monto: gastos_fijos.monto_mensual })
    .from(gastos_fijos)
    .where(sql`date('now','localtime') >= ${gastos_fijos.fecha_desde} AND (${gastos_fijos.fecha_hasta} IS NULL OR date('now','localtime') <= ${gastos_fijos.fecha_hasta})`);
  const gastosFijosMensual = gastosFijosRows.reduce((a, g) => a + (g.monto || 0), 0);

  const [costoVentasResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${detalle_venta.precio_costo_historico} * ${detalle_venta.cantidad}), 0)` })
    .from(detalle_venta)
    .innerJoin(ventas, eq(detalle_venta.venta_id, ventas.id))
    .where(filter);
  const margenContrib = ventasResult.total > 0 ? (ventasResult.total - costoVentasResult.total) / ventasResult.total : 0.5;
  const puntoEquilibrio = margenContrib > 0 ? gastosFijosMensual / margenContrib : 0;

  const [ventas30d] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` })
    .from(ventas).where(sql`date(${ventas.fecha}) >= date('now','localtime', '-30 days')`);
  const ventasPromedioDiarias = ventas30d.total / 30;

  // Comparativo vs período anterior
  const filterAnterior = getPeriodoFilter("mes_anterior");
  const gFilterAnterior = getGastosPeriodoFilter("mes_anterior");
  const [ventasAnt] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` })
    .from(ventas).where(filterAnterior);
  const [gastosAnt] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos).where(gFilterAnterior);

  const deltaVentas = ventasAnt.total > 0 ? ((ventasResult.total - ventasAnt.total) / ventasAnt.total) * 100 : 0;
  const deltaGastos = (gastosAnt.total || 0) > 0 ? ((egresosTotales - (gastosAnt.total || 0)) / (gastosAnt.total || 1)) * 100 : 0;

  return {
    ventasTotales: ventasResult.total || 0,
    gastosOperativos,
    egresosTotales,
    utilidadBruta,
    margenPromedio,
    puntoEquilibrio,
    ventasPromedioDiarias,
    deltaVentas,
    deltaGastos,
  };
}

// ── 2. Ventas por día ───────────────────────────────────────────

export async function getVentasPorDiaAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<VentaDia[]> {
  return db
    .select({
      fecha: sql<string>`date(${ventas.fecha})`,
      ventas: sql<number>`COALESCE(SUM(${ventas.total}), 0)`,
    })
    .from(ventas)
    .where(getPeriodoFilter(periodo, fechaDesde, fechaHasta))
    .groupBy(sql`date(${ventas.fecha})`)
    .orderBy(sql`date(${ventas.fecha})`);
}

// ── 3. Gastos por categoría ─────────────────────────────────────

const CATEGORIAS_MAP: Record<number, string> = {
  1: "Operativos", 2: "Reinversión", 3: "Deuda / Pasivo",
};

export async function getGastosPorCategoriaAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<GastoCategoria[]> {
  const results = await db
    .select({
      categoria: gastos.categoria,
      monto: sql<number>`COALESCE(SUM(${gastos.monto}), 0)`,
    })
    .from(gastos)
    .where(getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta))
    .groupBy(gastos.categoria)
    .orderBy(sql`SUM(${gastos.monto}) DESC`);

  return results.map((r) => ({
    categoria: CATEGORIAS_MAP[r.categoria] || `Categoría ${r.categoria}`,
    monto: r.monto,
  }));
}

// ── 4. Gastos detallados ────────────────────────────────────────

export async function getGastosDetalladosAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string,
  limit: number = 50, offset: number = 0
): Promise<{ items: GastoDetalle[]; total: number }> {
  const gf = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);
  const [countResult] = await db.select({ total: sql<number>`COUNT(*)` }).from(gastos).where(gf);
  const items = await db.select().from(gastos).where(gf)
    .orderBy(sql`date(${gastos.fecha}) DESC`).limit(limit).offset(offset);
  return { items: items as GastoDetalle[], total: countResult.total };
}

// ── 5. Top productos rentables ──────────────────────────────────

export async function getTopProductosRentablesAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string, limit: number = 10
): Promise<ProductoRentable[]> {
  const results = await db
    .select({
      producto_id: detalle_venta.producto_id,
      nombre: detalle_venta.nombre_producto,
      cantidad_vendida: sql<number>`COALESCE(SUM(${detalle_venta.cantidad}), 0)`,
      venta_total: sql<number>`COALESCE(SUM(${detalle_venta.subtotal}), 0)`,
      costo_total: sql<number>`COALESCE(SUM(${detalle_venta.precio_costo_historico} * ${detalle_venta.cantidad}), 0)`,
    })
    .from(detalle_venta)
    .innerJoin(ventas, eq(detalle_venta.venta_id, ventas.id))
    .where(getPeriodoFilter(periodo, fechaDesde, fechaHasta))
    .groupBy(detalle_venta.producto_id, detalle_venta.nombre_producto)
    .orderBy(sql`SUM(${detalle_venta.subtotal}) DESC`)
    .limit(limit);

  return results.map((r) => ({
    producto_id: r.producto_id || 0,
    nombre: r.nombre || "Sin nombre",
    cantidad_vendida: r.cantidad_vendida || 0,
    venta_total: r.venta_total || 0,
    costo_total: r.costo_total || 0,
    utilidad: (r.venta_total || 0) - (r.costo_total || 0),
    margen: r.venta_total > 0 ? ((r.venta_total - r.costo_total) / r.venta_total) * 100 : 0,
  }));
}

// ── 6. Flujo de caja ────────────────────────────────────────────

export async function getFlujosCajaAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<FlujoItem[]> {
  const ventasDia = await getVentasPorDiaAction(periodo, fechaDesde, fechaHasta);
  const gf = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);

  const gastosDia = await db
    .select({
      fecha: sql<string>`date(${gastos.fecha})`,
      total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)`,
    })
    .from(gastos).where(gf)
    .groupBy(sql`date(${gastos.fecha})`);

  const fechasSet = new Set<string>();
  ventasDia.forEach(v => fechasSet.add(v.fecha));
  gastosDia.forEach(g => fechasSet.add(g.fecha));

  const fechas = Array.from(fechasSet).sort();
  const ventasMap = Object.fromEntries(ventasDia.map(v => [v.fecha, v.ventas]));
  const gastosMap = Object.fromEntries(gastosDia.map(g => [g.fecha, g.total]));

  return fechas.map(f => ({
    fecha: f,
    ingresos: ventasMap[f] || 0,
    egresos: gastosMap[f] || 0,
  }));
}

// ── 7. Métodos de pago ──────────────────────────────────────────

export async function getMetodosPagoDistribucionAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<MetodoPagoItem[]> {
  const results = await db
    .select({
      metodo: sql<string>`COALESCE(${ventas.metodo_pago}, 'Sin especificar')`,
      monto: sql<number>`COALESCE(SUM(${ventas.total}), 0)`,
    })
    .from(ventas)
    .where(getPeriodoFilter(periodo, fechaDesde, fechaHasta))
    .groupBy(ventas.metodo_pago)
    .orderBy(sql`SUM(${ventas.total}) DESC`);

  return results;
}

// ── 8. Obligaciones ─────────────────────────────────────────────

export async function getObligacionesAction(): Promise<ObligacionItem[]> {
  const ciclo = getCicloActual();
  const obligaciones = await db.select().from(obligaciones_fijas).where(sql`${obligaciones_fijas.activa} = 1`);

  const pagosDelCiclo = await db.select().from(pagos_obligaciones)
    .where(sql`date(${pagos_obligaciones.fecha_pago}) >= ${ciclo.desde} AND date(${pagos_obligaciones.fecha_pago}) <= ${ciclo.hasta}`);

  const hoy = new Date().getDate();

  return obligaciones.map((o) => {
    const pagos = pagosDelCiclo.filter(p => p.obligacion_id === o.id);
    const montoPagado = pagos.reduce((a, p) => a + (p.monto_pagado || 0), 0);
    const pagada = montoPagado >= (o.monto_estimado || 0);
    const vencida = !pagada && (o.vencimiento_dia || 0) < hoy;

    return {
      id: o.id,
      nombre: o.nombre || "",
      descripcion: o.descripcion,
      monto_estimado: o.monto_estimado || 0,
      vencimiento_dia: o.vencimiento_dia || 0,
      pagada,
      monto_pagado: montoPagado,
      estado: pagada ? "pagada" as const : vencida ? "vencida" as const : "pendiente" as const,
    };
  });
}

// ── 9. Cuentas corrientes resumen ───────────────────────────────

export async function getCuentasCorrientesResumenAction(): Promise<{
  totalDeuda: number;
  topDeudores: CuentaCorrienteItem[];
}> {
  const cuentas = await db
    .select({
      cliente_id: cuentas_corrientes.cliente_id,
      saldo: cuentas_corrientes.saldo_actual,
    })
    .from(cuentas_corrientes)
    .where(sql`${cuentas_corrientes.saldo_actual} > 0`)
    .orderBy(sql`${cuentas_corrientes.saldo_actual} DESC`)
    .limit(10);

  const totalDeuda = cuentas.reduce((a, c) => a + (c.saldo || 0), 0);

  const topDeudores: CuentaCorrienteItem[] = [];
  for (const c of cuentas) {
    const [cli] = await db.select({ nombre: clientes.nombre }).from(clientes).where(eq(clientes.id, c.cliente_id));
    topDeudores.push({
      cliente_id: c.cliente_id,
      nombre: cli?.nombre || "Desconocido",
      saldo: c.saldo || 0,
    });
  }

  return { totalDeuda, topDeudores };
}

// ── 10. Pedidos resumen ─────────────────────────────────────────

export async function getPedidosResumenAction(): Promise<PedidoResumen> {
  const allPedidos = await db.select().from(pedidos);

  const pendientes = allPedidos.filter(p => p.estado !== "entregado" && p.estado !== "cancelado");
  const entregados = allPedidos.filter(p => p.estado === "entregado");
  const totalAdelantos = pendientes.reduce((a, p) => a + (p.adelanto || 0), 0);
  const saldoPorCobrar = pendientes.reduce((a, p) => a + (p.saldo || 0), 0);

  const items: PedidoItem[] = pendientes.slice(0, 15).map(p => ({
    id: p.id,
    codigo: p.codigo,
    cliente_id: p.cliente_id,
    total: p.total || 0,
    estado: p.estado,
    fecha_estimada: p.fecha_estimada_entrega || p.fecha_estimada,
    adelanto: p.adelanto || 0,
    saldo: p.saldo || 0,
  }));

  return {
    pendientes: pendientes.length,
    entregados: entregados.length,
    totalAdelantos,
    saldoPorCobrar,
    items,
  };
}

// ── 11. Distribución diaria (asignación de fondos) ──────────────

export async function getDistribucionDiariaAction(fecha?: string): Promise<DistribucionDiaria> {
  const targetDate = fecha || fmt(new Date());

  // Recaudación del día
  const [ventasDia] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ventas.total}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ventas)
    .where(sql`date(${ventas.fecha}) = ${targetDate}`);

  const recaudacion = ventasDia.total || 0;
  const operaciones = ventasDia.count || 0;
  const ticketPromedio = operaciones > 0 ? recaudacion / operaciones : 0;

  // Costos fijos activos → cuota diaria
  const fijosActivos = await db.select().from(gastos_fijos)
    .where(sql`date(${targetDate}) >= ${gastos_fijos.fecha_desde} AND (${gastos_fijos.fecha_hasta} IS NULL OR date(${targetDate}) <= ${gastos_fijos.fecha_hasta})`);

  const costosFijos = fijosActivos.map(f => ({
    nombre: f.nombre,
    cuotaDiaria: (f.monto_mensual || 0) / 30,
  }));
  const totalFijosDiario = costosFijos.reduce((a, f) => a + f.cuotaDiaria, 0);

  // Gastos operativos del día (cat 1) — todos influyen en distribución
  const [gastosOpDia] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(sql`date(${gastos.fecha}) = ${targetDate} AND ${gastos.categoria} = 1`);
  const gastosOperativosDia = gastosOpDia.total || 0;

  // Gastos reinversión del día (cat 2) — todos influyen en distribución
  const [gastosReinvDia] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(sql`date(${gastos.fecha}) = ${targetDate} AND ${gastos.categoria} = 2`);
  const gastosReinversionDia = gastosReinvDia.total || 0;

  // Saldo pendiente de deudas activas (solo influye lo que falta pagar)
  const allDeudas = await db.select().from(deudas).where(eq(deudas.activa, 1));
  const allPagos = await db.select().from(pagos_deuda);
  const saldoDeudasPendiente = allDeudas.reduce((total, deuda) => {
    const pagosDeuda = allPagos.filter(p => p.deuda_id === deuda.id);
    const pagado = pagosDeuda.reduce((sum, p) => sum + (p.monto || 0), 0);
    const saldo = Math.max(0, (deuda.monto_total || 0) - pagado);
    return total + saldo;
  }, 0);

  // Excedente = Recaudación - Fijos diarios - Operativos - Reinversión - Saldo deudas pendientes
  const totalGastosDia = totalFijosDiario + gastosOperativosDia + gastosReinversionDia + saldoDeudasPendiente;
  const excedente = Math.max(0, recaudacion - totalGastosDia);
  const reinversion70 = excedente * 0.70;
  const fondoEmergencia30 = excedente * 0.30;

  // Mínimo requerido: fijos diarios + promedio diario gastos operativos del ciclo + saldo deudas pendientes
  const ciclo = getCicloActual();
  const [gastosOpCiclo] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(sql`date(${gastos.fecha}) >= ${ciclo.desde} AND date(${gastos.fecha}) <= ${ciclo.hasta} AND ${gastos.categoria} = 1`);

  const diasTranscurridos = Math.max(1, Math.round((new Date(targetDate).getTime() - new Date(ciclo.desde).getTime()) / 86400000) + 1);
  const promedioOpDiario = (gastosOpCiclo.total || 0) / diasTranscurridos;

  const minimoDetalle = [
    { concepto: "Costos fijos diarios", monto: totalFijosDiario },
    { concepto: `Gastos operativos prom. (${diasTranscurridos}d)`, monto: promedioOpDiario },
    { concepto: "Saldo deudas pendientes", monto: saldoDeudasPendiente },
  ];
  const minimoRequerido = minimoDetalle.reduce((a, d) => a + d.monto, 0);

  // Proyección de liberación de flujo: qué pasa si pagas cada deuda
  const liberacionFlujo = allDeudas.map((deuda) => {
    const pagosDeuda = allPagos.filter(p => p.deuda_id === deuda.id);
    const pagado = pagosDeuda.reduce((sum, p) => sum + (p.monto || 0), 0);
    const saldo = Math.max(0, (deuda.monto_total || 0) - pagado);
    return {
      nombre: deuda.nombre || `Deuda #${deuda.id}`,
      saldo,
      ahorroDiario: saldo, // Al pagarla, el mínimo requerido baja este monto diario
    };
  }).filter(d => d.saldo > 0);

  return {
    recaudacion,
    costosFijos,
    totalFijosDiario,
    gastosOperativosDia,
    gastosReinversionDia,
    excedente,
    reinversion70,
    fondoEmergencia30,
    operaciones,
    ticketPromedio,
    minimoRequerido,
    minimoDetalle,
    liberacionFlujo,
  };
}

// ── 12. Deuda de tarjeta ────────────────────────────────────────

export async function getDeudaTarjetaAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<DeudaTarjeta> {
  const gf = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);

  // Gastos pagados con tarjeta en el período
  const gastosEnTarjetaRows = await db
    .select()
    .from(gastos)
    .where(sql`${gf} AND LOWER(${gastos.medio_pago}) = 'tarjeta'`)
    .orderBy(sql`date(${gastos.fecha}) DESC`)
    .limit(20);

  const gastosEnTarjeta = gastosEnTarjetaRows.map(g => ({
    descripcion: g.descripcion,
    monto: g.monto,
    fecha: g.fecha || "",
    tipo: g.categoria === 1 ? "Operativo" : "Reinversión",
  }));

  const [totalDeudaResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(sql`${gf} AND LOWER(${gastos.medio_pago}) = 'tarjeta'`);

  // Pagos de tarjeta realizados en el período
  const pagosRows = await db.select().from(pagos_tarjeta)
    .orderBy(sql`date(${pagos_tarjeta.fecha}) DESC`)
    .limit(10);

  const pagosRealizados = pagosRows.map(p => ({
    monto: p.monto || 0,
    fecha: p.fecha || "",
    nota: p.nota,
  }));
  const totalPagado = pagosRows.reduce((a, p) => a + (p.monto || 0), 0);

  return {
    totalDeuda: totalDeudaResult.total || 0,
    gastosEnTarjeta,
    pagosRealizados,
    totalPagado,
  };
}

// ── 13. Gastos por tipo y medio de pago ─────────────────────────

export async function getGastosPorTipoAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<GastosPorTipo> {
  const gf = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);

  const [opEf] = await db.select({ t: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos)
    .where(sql`${gf} AND ${gastos.categoria} = 1 AND (LOWER(${gastos.medio_pago}) = 'efectivo' OR ${gastos.medio_pago} IS NULL)`);
  const [opTj] = await db.select({ t: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos)
    .where(sql`${gf} AND ${gastos.categoria} = 1 AND LOWER(${gastos.medio_pago}) = 'tarjeta'`);
  const [reEf] = await db.select({ t: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos)
    .where(sql`${gf} AND ${gastos.categoria} = 2 AND (LOWER(${gastos.medio_pago}) = 'efectivo' OR ${gastos.medio_pago} IS NULL)`);
  const [reTj] = await db.select({ t: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos)
    .where(sql`${gf} AND ${gastos.categoria} = 2 AND LOWER(${gastos.medio_pago}) = 'tarjeta'`);

  return {
    operativosEfectivo: opEf.t || 0,
    operativosTarjeta: opTj.t || 0,
    reinversionEfectivo: reEf.t || 0,
    reinversionTarjeta: reTj.t || 0,
  };
}

// ── 14. Salud del negocio ─────────────────────────────────────────

export async function getSaludNegocioAction(
  periodo: Periodo = "mes", fechaDesde?: string, fechaHasta?: string
): Promise<SaludNegocio> {
  const filter = getPeriodoFilter(periodo, fechaDesde, fechaHasta);
  const gFilter = getGastosPeriodoFilter(periodo, fechaDesde, fechaHasta);

  // Datos base
  const [vRes] = await db.select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` }).from(ventas).where(filter);
  const [gRes] = await db.select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos).where(gFilter);
  const ventasTotal = vRes.total || 0;
  const gastosTotal = gRes.total || 0;

  // Fijos mensuales
  const fijosRows = await db.select({ monto: gastos_fijos.monto_mensual }).from(gastos_fijos)
    .where(sql`date('now','localtime') >= ${gastos_fijos.fecha_desde} AND (${gastos_fijos.fecha_hasta} IS NULL OR date('now','localtime') <= ${gastos_fijos.fecha_hasta})`);
  const fijosMensual = fijosRows.reduce((a, g) => a + (g.monto || 0), 0);

  // Ventas promedio diarias (30d)
  const [v30] = await db.select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` }).from(ventas)
    .where(sql`date(${ventas.fecha}) >= date('now','localtime', '-30 days')`);
  const ventasDiarias = v30.total / 30;
  const fijosDiarios = fijosMensual / 30;

  // Delta ventas vs periodo anterior
  const filterAnt = getPeriodoFilter("mes_anterior");
  const [vAnt] = await db.select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` }).from(ventas).where(filterAnt);
  const deltaVentas = vAnt.total > 0 ? ((ventasTotal - vAnt.total) / vAnt.total) * 100 : 0;

  // Distribución hoy
  const [vHoy] = await db.select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` }).from(ventas)
    .where(sql`date(${ventas.fecha}) = date('now','localtime')`);
  const [gHoy] = await db.select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` }).from(gastos)
    .where(sql`date(${gastos.fecha}) = date('now','localtime')`);

  const factores: SaludNegocio["factores"] = [];

  // Factor 1: Rentabilidad (0-35)
  // ventas > gastos = bien. Ratio ideal >= 1.5
  let pRentabilidad = 0;
  if (ventasTotal > 0) {
    const ratio = ventasTotal / Math.max(gastosTotal, 1);
    if (ratio >= 2) pRentabilidad = 35;
    else if (ratio >= 1.5) pRentabilidad = 30;
    else if (ratio >= 1.2) pRentabilidad = 25;
    else if (ratio >= 1) pRentabilidad = 18;
    else if (ratio >= 0.8) pRentabilidad = 10;
    else pRentabilidad = 3;
  }
  const ratioDisplay = ventasTotal > 0 ? (ventasTotal / Math.max(gastosTotal, 1)).toFixed(2) : "0";
  factores.push({ nombre: "Rentabilidad", puntaje: pRentabilidad, max: 35, detalle: `Ratio ventas/gastos: ${ratioDisplay}x` });

  // Factor 2: Cobertura de fijos (0-25)
  // ¿Las ventas diarias cubren los costos fijos diarios?
  let pCobertura = 0;
  if (ventasDiarias > 0) {
    const coberturaRatio = ventasDiarias / Math.max(fijosDiarios, 1);
    if (coberturaRatio >= 5) pCobertura = 25;
    else if (coberturaRatio >= 3) pCobertura = 22;
    else if (coberturaRatio >= 2) pCobertura = 18;
    else if (coberturaRatio >= 1.5) pCobertura = 12;
    else if (coberturaRatio >= 1) pCobertura = 7;
    else pCobertura = 2;
  }
  factores.push({ nombre: "Cobertura Fijos", puntaje: pCobertura, max: 25, detalle: `Ventas diarias ${(ventasDiarias / Math.max(fijosDiarios, 1)).toFixed(1)}x vs fijos` });

  // Factor 3: Tendencia ventas (0-20)
  let pTendencia = 10; // neutro por defecto
  if (deltaVentas > 20) pTendencia = 20;
  else if (deltaVentas > 10) pTendencia = 17;
  else if (deltaVentas > 0) pTendencia = 13;
  else if (deltaVentas > -10) pTendencia = 8;
  else if (deltaVentas > -20) pTendencia = 4;
  else pTendencia = 1;
  factores.push({ nombre: "Tendencia", puntaje: pTendencia, max: 20, detalle: `${deltaVentas >= 0 ? "+" : ""}${deltaVentas.toFixed(1)}% vs ciclo anterior` });

  // Factor 4: Día actual (0-20)
  // ¿Hoy la recaudación cubre los costos diarios (fijos + gastos)?
  let pDia = 10;
  const costosDiaTotal = fijosDiarios + (gHoy.total || 0);
  if (vHoy.total > 0) {
    const ratioDia = vHoy.total / Math.max(costosDiaTotal, 1);
    if (ratioDia >= 2) pDia = 20;
    else if (ratioDia >= 1.5) pDia = 17;
    else if (ratioDia >= 1) pDia = 13;
    else if (ratioDia >= 0.7) pDia = 8;
    else pDia = 3;
  } else {
    pDia = 5; // sin ventas hoy aún
  }
  factores.push({ nombre: "Hoy", puntaje: pDia, max: 20, detalle: vHoy.total > 0 ? `Recaudación hoy cubre ${((vHoy.total / Math.max(costosDiaTotal, 1)) * 100).toFixed(0)}% de costos` : "Sin ventas registradas hoy" });

  const puntaje = Math.min(100, Math.max(0, pRentabilidad + pCobertura + pTendencia + pDia));

  let nivel: SaludNegocio["nivel"];
  let color: string;
  let emoji: string;
  let mensaje: string;

  if (puntaje >= 80) {
    nivel = "excelente"; color = "emerald"; emoji = "💪";
    mensaje = "El negocio está en excelente estado. Ventas sólidas, costos controlados.";
  } else if (puntaje >= 60) {
    nivel = "saludable"; color = "green"; emoji = "✅";
    mensaje = "Buen rendimiento general. Hay margen para optimizar algunos puntos.";
  } else if (puntaje >= 40) {
    nivel = "atencion"; color = "yellow"; emoji = "⚠️";
    mensaje = "Hay señales de atención. Revisá los factores con puntaje bajo.";
  } else if (puntaje >= 20) {
    nivel = "riesgo"; color = "orange"; emoji = "🔶";
    mensaje = "Situación de riesgo. Los gastos están presionando la rentabilidad.";
  } else {
    nivel = "critico"; color = "red"; emoji = "🚨";
    mensaje = "Situación crítica. Los costos superan ampliamente los ingresos.";
  }

  return { puntaje, nivel, color, emoji, mensaje, factores };
}

// ── Crear Gasto ───────────────────────────────────────────────────

export async function createGastoAction(data: {
  descripcion: string;
  monto: number;
  categoria: number; // 1 = Operativos, 2 = Reinversión
  medio_pago?: string;
  fecha?: string;
  es_compra_credito?: boolean; // Si es true y medio_pago=Tarjeta, genera deuda
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Insertar gasto normal
    await db.insert(gastos).values({
      descripcion: data.descripcion,
      monto: data.monto,
      categoria: data.categoria,
      medio_pago: data.medio_pago || null,
      fecha: data.fecha || new Date().toISOString(),
    });

    // Si es compra a crédito con tarjeta, crear deuda y pago automáticamente
    if (data.es_compra_credito && data.medio_pago?.toLowerCase() === "tarjeta") {
      const [insertedDeuda] = await db.insert(deudas).values({
        nombre: data.descripcion,
        descripcion: "Compra a crédito con tarjeta",
        monto_total: data.monto,
        activa: 1,
      }).returning({ id: deudas.id });

      await db.insert(pagos_deuda).values({
        deuda_id: insertedDeuda.id,
        monto: data.monto,
        nota: "Compra a crédito registrada",
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ── Deudas (Tarjeta de Crédito, préstamos, etc.) ──────────────────

export type DeudaItem = {
  id: number;
  nombre: string;
  descripcion: string | null;
  monto_total: number;
  monto_pagado: number;
  saldo: number;
  activa: number | null;
  fecha_creacion: string | null;
  pagos: { id: number; monto: number; fecha: string; nota: string | null }[];
};

export async function getDeudasAction(): Promise<DeudaItem[]> {
  const allDeudas = await db.select().from(deudas).where(eq(deudas.activa, 1));
  const allPagos = await db.select().from(pagos_deuda);

  return allDeudas.map((d) => {
    const pagos = allPagos.filter((p) => p.deuda_id === d.id);
    const montoPagado = pagos.reduce((a, p) => a + (p.monto || 0), 0);
    return {
      ...d,
      monto_pagado: montoPagado,
      saldo: (d.monto_total || 0) - montoPagado,
      pagos: pagos.map((p) => ({
        id: p.id,
        monto: p.monto || 0,
        fecha: p.fecha || "",
        nota: p.nota,
      })),
    };
  });
}

// ── 15. Alertas Predictivas (Early Warning System) ──────────────

export async function getAlertasPredictivasAction(): Promise<AlertaPredictiva[]> {
  const alertas: AlertaPredictiva[] = [];
  const ciclo = getCicloActual();
  const hoy = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // 1. Ventas promedio del ciclo vs mínimo requerido
  const [ventasCiclo] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(ventas)
    .where(sql`date(${ventas.fecha}) >= ${ciclo.desde} AND date(${ventas.fecha}) <= ${fmt(hoy)}`);

  const diasTranscurridos = Math.max(1, Math.round((hoy.getTime() - new Date(ciclo.desde).getTime()) / 86400000) + 1);
  const ventasPromedioDiarias = (ventasCiclo.total || 0) / diasTranscurridos;

  // Mínimo requerido diario (costos fijos + promedio operativos)
  const fijosActivos = await db.select().from(gastos_fijos)
    .where(sql`date(${fmt(hoy)}) >= ${gastos_fijos.fecha_desde} AND (${gastos_fijos.fecha_hasta} IS NULL OR date(${fmt(hoy)}) <= ${gastos_fijos.fecha_hasta})`);
  const totalFijosDiario = fijosActivos.reduce((a, f) => a + ((f.monto_mensual || 0) / 30), 0);

  const [gastosOpCiclo] = await db
    .select({ total: sql<number>`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(sql`date(${gastos.fecha}) >= ${ciclo.desde} AND date(${gastos.fecha}) <= ${fmt(hoy)} AND ${gastos.categoria} = 1`);
  const promedioOpDiario = (gastosOpCiclo.total || 0) / diasTranscurridos;

  const minimoRequerido = totalFijosDiario + promedioOpDiario;

  // 🟡 Alerta: Cash flow negativo proyectado
  if (ventasPromedioDiarias < minimoRequerido) {
    const deficit = minimoRequerido - ventasPromedioDiarias;
    const pctFaltante = minimoRequerido > 0 ? (deficit / minimoRequerido) * 100 : 0;
    alertas.push({
      tipo: "warning",
      emoji: "🟡",
      titulo: "Cash flow negativo proyectado",
      mensaje: `Ventas promedio $${Math.round(ventasPromedioDiarias).toLocaleString()}/día vs mínimo $${Math.round(minimoRequerido).toLocaleString()}/día`,
      accion: `Necesitás aumentar ventas un ${pctFaltante.toFixed(1)}% para cubrir gastos`,
      monto: deficit,
    });
  }

  // 2. Deudas críticas
  const allDeudas = await db.select().from(deudas).where(eq(deudas.activa, 1));
  const allPagos = await db.select().from(pagos_deuda);
  const totalVentasCiclo = ventasCiclo.total || 0;

  for (const deuda of allDeudas) {
    const pagos = allPagos.filter(p => p.deuda_id === deuda.id);
    const pagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const saldo = Math.max(0, (deuda.monto_total || 0) - pagado);

    if (saldo > 0 && totalVentasCiclo > 0 && saldo > totalVentasCiclo * 0.5) {
      alertas.push({
        tipo: "danger",
        emoji: "🔴",
        titulo: `Deuda crítica: ${deuda.nombre}`,
        mensaje: `Saldo $${Math.round(saldo).toLocaleString()} representa más del 50% de ventas del ciclo`,
        accion: "Priorizar pago para liberar flujo",
        monto: saldo,
      });
    }

    // 🟢 Oportunidad: si hay fondo suficiente para pagar deuda
    const excedentePromedio = Math.max(0, ventasPromedioDiarias - minimoRequerido);
    if (saldo > 0 && excedentePromedio > 0 && saldo <= excedentePromedio * 30) {
      alertas.push({
        tipo: "opportunity",
        emoji: "🟢",
        titulo: `Oportunidad: pagar ${deuda.nombre}`,
        mensaje: `Podés pagar $${Math.round(saldo).toLocaleString()} con el excedente acumulado`,
        accion: "Liberar flujo diario al pagar",
        monto: saldo,
      });
    }
  }

  // 🔴 Alerta: Sin ventas recientes (3 días)
  const tresDiasAtras = new Date(hoy); tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
  const [ventas3dias] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ventas.total}), 0)` })
    .from(ventas)
    .where(sql`date(${ventas.fecha}) >= ${fmt(tresDiasAtras)}`);

  if ((ventas3dias.total || 0) === 0) {
    alertas.push({
      tipo: "danger",
      emoji: "🔴",
      titulo: "Sin ventas en 3 días",
      mensaje: "No se registraron ventas en los últimos 3 días",
      accion: "Revisar operación y promociones",
    });
  }

  return alertas;
}

// ── Deudas CRUD ──────────────────────────────────────────────────

export async function createDeudaAction(data: {
  nombre: string;
  descripcion?: string;
  monto_total: number;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const [inserted] = await db.insert(deudas).values({
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      monto_total: data.monto_total,
      activa: 1,
    }).returning({ id: deudas.id });
    return { success: true, id: inserted.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function addPagoDeudaAction(data: {
  deuda_id: number;
  monto: number;
  nota?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(pagos_deuda).values({
      deuda_id: data.deuda_id,
      monto: data.monto,
      nota: data.nota || null,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePagoDeudaAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(pagos_deuda).where(eq(pagos_deuda.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteDeudaAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(pagos_deuda).where(eq(pagos_deuda.deuda_id, id));
    await db.delete(deudas).where(eq(deudas.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
