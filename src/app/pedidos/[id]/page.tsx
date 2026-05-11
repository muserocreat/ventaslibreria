import { db } from "@/db";
import { pedidos, clientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/formatter";
import Link from "next/link";
import { ArrowLeft, Truck, User, Calendar, DollarSign, Package, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { cambiarEstadoPedidoAction, generarVentaDesdePedidoAction } from "@/lib/pedidosActions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const ESTADOS = {
  "Recibido": { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  "En Proceso": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
  "Terminado": { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: CheckCircle },
  "Entregado": { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  "Venta Generada": { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: DollarSign },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DetallePedidoPage({ params }: Props) {
  const resolved = await params;
  const pedidoId = parseInt(resolved.id);

  // Obtener pedido con información del cliente
  const [pedido] = await db
    .select({
      id: pedidos.id,
      codigo: pedidos.codigo,
      cliente_id: pedidos.cliente_id,
      cliente_nombre: clientes.nombre,
      cliente_telefono: clientes.telefono,
      detalles: pedidos.detalles,
      productos_json: pedidos.productos_json,
      total: pedidos.total,
      adelanto: pedidos.adelanto,
      saldo: pedidos.saldo,
      estado: pedidos.estado,
      fecha: pedidos.fecha,
      fecha_estimada_entrega: pedidos.fecha_estimada_entrega,
      venta_generada: pedidos.venta_generada,
    })
    .from(pedidos)
    .leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
    .where(eq(pedidos.id, pedidoId));

  if (!pedido) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-300 mb-2">Pedido no encontrado</h2>
          <Link href="/pedidos" className="text-emerald-400 hover:underline">
            Volver a pedidos
          </Link>
        </div>
      </div>
    );
  }

  const estadoConfig = ESTADOS[pedido.estado as keyof typeof ESTADOS] || ESTADOS.Recibido;
  const EstadoIcon = estadoConfig.icon;
  const productos = pedido.productos_json ? JSON.parse(pedido.productos_json as string) : [];

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/pedidos" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalle del Pedido</h1>
          <p className="text-zinc-400 mt-2">Información completa del pedido {pedido.codigo}</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Información principal */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xl font-bold text-zinc-100">{pedido.codigo}</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estadoConfig.color}`}>
                  <EstadoIcon className="w-3 h-3" />
                  {pedido.estado}
                </span>
              </div>
              <p className="text-zinc-400">{formatDate(pedido.fecha as string)}</p>
            </div>
            {!pedido.venta_generada && pedido.estado !== "Venta Generada" && (
              <Link
                href={`/pedidos/${pedido.id}/generar-venta`}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                Generar Venta
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-500">Cliente</p>
                  <p className="text-zinc-300">{pedido.cliente_nombre || "Anónimo"}</p>
                </div>
              </div>
              {pedido.fecha_estimada_entrega && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-500">Fecha Estimada de Entrega</p>
                    <p className="text-zinc-300">{formatDate(pedido.fecha_estimada_entrega)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-zinc-500">Total</p>
                  <p className="text-xl font-bold text-zinc-100">{formatCurrency(pedido.total || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-zinc-500">Adelanto</p>
                  <p className="text-emerald-400">{formatCurrency(pedido.adelanto || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm text-zinc-500">Saldo Restante</p>
                  <p className="text-amber-400 font-bold">{formatCurrency(pedido.saldo || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Productos */}
        {productos.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-zinc-400" />
              Productos del Pedido
            </h3>
            <div className="space-y-3">
              {productos.map((producto: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-zinc-950 rounded-lg">
                  <div>
                    <p className="text-zinc-300 font-medium">{producto.nombre}</p>
                    <p className="text-sm text-zinc-500">Cantidad: {producto.cantidad}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-300">{formatCurrency(producto.precio)} x {producto.cantidad}</p>
                    <p className="text-emerald-400 font-bold">{formatCurrency(producto.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalles */}
        {pedido.detalles && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Detalles / Instrucciones</h3>
            <p className="text-zinc-300">{pedido.detalles}</p>
          </div>
        )}

        {/* Cambio de estado */}
        {!pedido.venta_generada && pedido.estado !== "Venta Generada" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Cambiar Estado</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(ESTADOS).map((estado) => (
                <form key={estado} action={async (formData) => {
                  "use server";
                  await cambiarEstadoPedidoAction(pedidoId, estado);
                  revalidatePath("/pedidos");
                  revalidatePath(`/pedidos/${pedidoId}`);
                }}>
                  <button
                    type="submit"
                    disabled={pedido.estado === estado}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pedido.estado === estado
                        ? ESTADOS[estado as keyof typeof ESTADOS].color
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {estado}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}

        {pedido.venta_generada && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-400 font-bold">Venta Generada</p>
                <p className="text-sm text-green-400/80">Este pedido ya generó una venta</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
