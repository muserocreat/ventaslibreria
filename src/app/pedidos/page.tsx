import { db } from "@/db";
import { pedidos, clientes } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/formatter";
import Link from "next/link";
import { Plus, Truck, Calendar, User, DollarSign, CheckCircle, Clock, Package, AlertCircle } from "lucide-react";
import { FechaPedidosFilter } from "./FechaPedidosFilter";

export const dynamic = "force-dynamic";

const ESTADOS = {
  "Recibido": { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  "En Proceso": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
  "Terminado": { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: CheckCircle },
  "Entregado": { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  "Venta Generada": { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: DollarSign },
};

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  const fechaSeleccionada = params.fecha || new Date().toISOString().split("T")[0];

  // Obtener pedidos de la fecha seleccionada
  const pedidosList = await db
    .select({
      id: pedidos.id,
      codigo: pedidos.codigo,
      cliente_id: pedidos.cliente_id,
      cliente_nombre: clientes.nombre,
      detalles: pedidos.detalles,
      total: pedidos.total,
      adelanto: pedidos.adelanto,
      estado: pedidos.estado,
      fecha: pedidos.fecha,
      fecha_estimada_entrega: pedidos.fecha_estimada_entrega,
      venta_generada: pedidos.venta_generada,
    })
    .from(pedidos)
    .leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
    .where(sql`DATE(${pedidos.fecha}) = ${fechaSeleccionada}`)
    .orderBy(desc(pedidos.fecha));

  // Calcular estadísticas
  const totalPedidos = pedidosList.length;
  const pendientes = pedidosList.filter((p) => p.estado === "Recibido").length;
  const enProceso = pedidosList.filter((p) => p.estado === "En Proceso").length;
  const terminados = pedidosList.filter((p) => p.estado === "Terminado").length;
  const entregados = pedidosList.filter((p) => p.estado === "Entregado").length;
  const ventasGeneradas = pedidosList.filter((p) => p.estado === "Venta Generada").length;
  const totalValor = pedidosList.reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Pedidos</h1>
          <p className="text-zinc-400 mt-2">Administra los pedidos de tus clientes</p>
        </div>
        <Link
          href="/pedidos/nuevo"
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalPedidos}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-400">Recibidos</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{pendientes}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-400">En Proceso</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{enProceso}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-zinc-400">Terminados</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{terminados}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-zinc-400">Entregados</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{entregados}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm text-zinc-400">Ventas Gen.</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{ventasGeneradas}</p>
        </div>
      </div>

      {/* Filtro por fecha */}
      <FechaPedidosFilter 
        fechaSeleccionada={fechaSeleccionada} 
        totalValor={totalValor} 
      />

      {/* Tabla de pedidos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="text-left p-4 text-zinc-400 font-medium">Código</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Cliente</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Detalles</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Total</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Adelanto</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Saldo</th>
                <th className="text-center p-4 text-zinc-400 font-medium">Estado</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Fecha</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Entrega Est.</th>
                <th className="text-center p-4 text-zinc-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-500">
                    No hay pedidos para esta fecha
                  </td>
                </tr>
              ) : (
                pedidosList.map((pedido) => {
                  const estadoConfig = ESTADOS[pedido.estado as keyof typeof ESTADOS] || ESTADOS.Recibido;
                  const EstadoIcon = estadoConfig.icon;
                  const saldo = (pedido.total || 0) - (pedido.adelanto || 0);

                  return (
                    <tr key={pedido.id} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm text-zinc-300">{pedido.codigo}</span>
                      </td>
                      <td className="p-4">
                        {pedido.cliente_nombre ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-500" />
                            <span className="text-zinc-300">{pedido.cliente_nombre}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">Anónimo</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-zinc-300 max-w-xs truncate">{pedido.detalles || "-"}</div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold text-zinc-300">{formatCurrency(pedido.total || 0)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-emerald-400">{formatCurrency(pedido.adelanto || 0)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold text-amber-400">{formatCurrency(saldo)}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${estadoConfig.color}`}>
                          <EstadoIcon className="w-3 h-3" />
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {formatDate(pedido.fecha as string)}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {pedido.fecha_estimada_entrega ? formatDate(pedido.fecha_estimada_entrega) : "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 justify-center">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
                          >
                            Ver
                          </Link>
                          {!pedido.venta_generada && pedido.estado !== "Venta Generada" && (
                            <Link
                              href={`/pedidos/${pedido.id}/generar-venta`}
                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                            >
                              Generar Venta
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
