import { db } from "@/db";
import { pedidos, clientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/formatter";
import Link from "next/link";
import { ArrowLeft, DollarSign, CheckCircle, AlertTriangle, User, Package } from "lucide-react";
import { generarVentaDesdePedidoAction } from "@/lib/pedidosActions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GenerarVentaPage({ params }: Props) {
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
      venta_generada: pedidos.venta_generada,
    })
    .from(pedidos)
    .leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
    .where(eq(pedidos.id, pedidoId));

  if (!pedido) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-300 mb-2">Pedido no encontrado</h2>
          <Link href="/pedidos" className="text-emerald-400 hover:underline">
            Volver a pedidos
          </Link>
        </div>
      </div>
    );
  }

  if (pedido.venta_generada || pedido.estado === "Venta Generada") {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-300 mb-2">Venta ya generada</h2>
          <p className="text-zinc-400 mb-4">Este pedido ya generó una venta</p>
          <Link href={`/pedidos/${pedido.id}`} className="text-emerald-400 hover:underline">
            Ver detalle del pedido
          </Link>
        </div>
      </div>
    );
  }

  const saldo = (pedido.total || 0) - (pedido.adelanto || 0);
  const productos = pedido.productos_json ? JSON.parse(pedido.productos_json as string) : [];

  // Generar venta
  const result = await generarVentaDesdePedidoAction(pedidoId);

  if (result.success) {
    redirect(`/pedidos/${pedidoId}`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/pedidos/${pedido.id}`} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generar Venta desde Pedido</h1>
          <p className="text-zinc-400 mt-2">Confirma la generación de venta para el pedido {pedido.codigo}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {result.success === false && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            Error: {result.error}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Resumen del Pedido</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-500">Cliente</p>
                <p className="text-zinc-300">{pedido.cliente_nombre || "Anónimo"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-500">Total del Pedido</p>
                <p className="text-zinc-300">{formatCurrency(pedido.total || 0)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm text-zinc-500">Adelanto Pagado</p>
                <p className="text-emerald-400">{formatCurrency(pedido.adelanto || 0)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm text-zinc-500">Saldo a Generar como Venta</p>
                <p className="text-amber-400 font-bold text-xl">{formatCurrency(saldo)}</p>
              </div>
            </div>
          </div>
        </div>

        {productos.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-zinc-400" />
              Productos
            </h3>
            <div className="space-y-2">
              {productos.map((producto: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{producto.nombre} x{producto.cantidad}</span>
                  <span className="text-zinc-400">{formatCurrency(producto.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-bold mb-1">Confirmación Requerida</p>
              <p className="text-sm text-amber-400/80">
                Al generar la venta, se creará un registro de venta por el saldo restante del pedido ({formatCurrency(saldo)}).
                El pedido se marcará como "Venta Generada" y no podrá ser modificado.
                {pedido.cliente_id && saldo > 0 && ` Se otorgarán ${Math.floor(saldo / 100)} puntos al cliente.`}
              </p>
            </div>
          </div>
        </div>

        <form action={async () => {
          "use server";
          await generarVentaDesdePedidoAction(pedidoId);
        }}>
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign className="w-5 h-5" />
            Confirmar y Generar Venta
          </button>
        </form>

        <Link
          href={`/pedidos/${pedido.id}`}
          className="block mt-4 text-center text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </div>
  );
}
