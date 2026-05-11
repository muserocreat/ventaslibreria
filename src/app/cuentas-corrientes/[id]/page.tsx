import { db } from "@/db";
import { clientes, cuentas_corrientes, movimientos_cuenta_corriente } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { ArrowLeft, Plus, Minus, TrendingUp, TrendingDown, Calendar, UserRound, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatter";
import { PagoForm } from "@/components/PagoForm";
import { MovimientoActions } from "@/components/MovimientoActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DetalleCuentaCorrientePage({ params }: Props) {
  const resolved = await params;
  const clienteId = parseInt(resolved.id);

  // Obtener información del cliente
  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      barrio: clientes.barrio,
      limite_credito: clientes.limite_credito,
      saldo_actual: sql<number>`COALESCE(${cuentas_corrientes.saldo_actual}, 0)`,
      fecha_ultimo_movimiento: cuentas_corrientes.fecha_ultimo_movimiento,
    })
    .from(clientes)
    .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!cliente) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-400 mb-4">Cliente no encontrado</h1>
          <Link
            href="/cuentas-corrientes"
            className="text-orange-400 hover:text-orange-300 underline"
          >
            Volver a Cuentas Corrientes
          </Link>
        </div>
      </div>
    );
  }

  // Obtener movimientos del cliente
  const movimientos = await db
    .select({
      id: movimientos_cuenta_corriente.id,
      tipo_movimiento: movimientos_cuenta_corriente.tipo_movimiento,
      monto: movimientos_cuenta_corriente.monto,
      descripcion: movimientos_cuenta_corriente.descripcion,
      fecha: movimientos_cuenta_corriente.fecha,
      detalles: movimientos_cuenta_corriente.detalles,
    })
    .from(movimientos_cuenta_corriente)
    .where(eq(movimientos_cuenta_corriente.cliente_id, clienteId))
    .orderBy(desc(movimientos_cuenta_corriente.fecha))
    .limit(50);

  const saldo = cliente.saldo_actual || 0;
  const limite = cliente.limite_credito || 10000;
  const disponible = limite - saldo;
  const porcentajeUsado = (saldo / limite) * 100;

  // Calcular estadísticas del cliente
  const stats = await db
    .select({
      total_ventas: sql<number>`SUM(CASE WHEN ${movimientos_cuenta_corriente.tipo_movimiento} = 'venta' THEN ${movimientos_cuenta_corriente.monto} ELSE 0 END)`,
      total_pagos: sql<number>`SUM(CASE WHEN ${movimientos_cuenta_corriente.tipo_movimiento} = 'pago' THEN ${movimientos_cuenta_corriente.monto} ELSE 0 END)`,
      total_ajustes: sql<number>`SUM(CASE WHEN ${movimientos_cuenta_corriente.tipo_movimiento} NOT IN ('venta', 'pago') THEN ${movimientos_cuenta_corriente.monto} ELSE 0 END)`,
    })
    .from(movimientos_cuenta_corriente)
    .where(eq(movimientos_cuenta_corriente.cliente_id, clienteId));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/cuentas-corrientes"
            className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Cuenta Corriente</h1>
            <p className="text-zinc-400">{cliente.nombre}</p>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {/* Superior: Resumen, Estadísticas y Formulario */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Resumen de cuenta */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserRound className="w-5 h-5 text-orange-400" />
                Resumen de Cuenta
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Saldo Actual</p>
                  <p className={`text-2xl font-bold ${
                    saldo > 0 ? 'text-red-400' : saldo < 0 ? 'text-green-400' : 'text-zinc-300'
                  }`}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Límite de Crédito</p>
                  <p className="text-2xl font-bold text-zinc-300">{formatCurrency(limite)}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Crédito Disponible</p>
                  <p className={`text-2xl font-bold ${
                    disponible > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(disponible)}
                  </p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Uso de Crédito</span>
                  <span>{porcentajeUsado.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      porcentajeUsado > 90 ? 'bg-red-500' : 
                      porcentajeUsado > 70 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
                  />
                </div>
                {porcentajeUsado > 90 && (
                  <div className="flex items-center gap-2 mt-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Crédito casi agotado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Formulario de pago */}
            <PagoForm 
              clienteId={clienteId} 
              clienteNombre={cliente.nombre}
              saldoActual={saldo}
            />
          </div>

          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full">
              <h2 className="text-lg font-bold mb-4">Estadísticas Acumuladas</h2>
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Total Ventas</p>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(stats[0]?.total_ventas || 0)}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-red-500/30" />
                </div>
                <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Total Pagos</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(stats[0]?.total_pagos || 0)}</p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-green-500/30" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Otros Ajustes</p>
                    <p className="text-xl font-bold text-zinc-300">{formatCurrency(stats[0]?.total_ajustes || 0)}</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-zinc-500/30 -rotate-90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inferior: Historial de movimientos (Ancho completo) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            Historial de Movimientos
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 text-zinc-400">Fecha</th>
                  <th className="text-left p-3 text-zinc-400">Tipo</th>
                  <th className="text-left p-3 text-zinc-400">Descripción</th>
                  <th className="text-right p-3 text-zinc-400">Monto</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => {
                  const esDebito = movimiento.tipo_movimiento === 'venta';
                  const esCredito = movimiento.tipo_movimiento === 'pago';
                  
                  return (
                    <tr key={movimiento.id} className="border-b border-zinc-800/60 group">
                      <td className="p-3 text-zinc-300">{formatDate(movimiento.fecha as string)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          esDebito ? 'bg-red-500/20 text-red-400' : 
                          esCredito ? 'bg-green-500/20 text-green-400' : 
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {movimiento.tipo_movimiento}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-300">
                        <div>
                          <p className="font-medium">{movimiento.descripcion}</p>
                          {movimiento.detalles && (
                            <details className="text-xs text-zinc-500 mt-1">
                              <summary className="cursor-pointer hover:text-zinc-400">Ver detalles</summary>
                              <pre className="mt-2 p-2 bg-zinc-800 rounded text-zinc-300 overflow-x-auto">
                                {JSON.stringify(JSON.parse(movimiento.detalles), null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        esDebito ? 'text-red-400' : 
                        esCredito ? 'text-green-400' : 'text-zinc-300'
                      }`}>
                        {esDebito ? '-' : '+'}{formatCurrency(movimiento.monto || 0)}
                      </td>
                      <td className="p-3 text-right">
                        <MovimientoActions 
                          movimiento={{
                            id: movimiento.id,
                            monto: movimiento.monto || 0,
                            descripcion: movimiento.descripcion || "",
                            tipo: movimiento.tipo_movimiento || ""
                          }} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {movimientos.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No hay movimientos registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
