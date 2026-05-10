import { db } from "@/db";
import { ventas, detalle_venta, clientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound, CreditCard, Package, Receipt } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatter";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const METODO_COLORS: Record<string, string> = {
  Efectivo:           "bg-emerald-500/15 text-emerald-400",
  Transferencia:      "bg-blue-500/15 text-blue-400",
  Tarjeta:            "bg-purple-500/15 text-purple-400",
  "Cuenta Corriente": "bg-orange-500/15 text-orange-400",
};

export default async function VentaDetailPage({ params }: Props) {
  const id = parseInt((await params).id);

  const [venta] = await db
    .select({
      id:          ventas.id,
      total:       ventas.total,
      fecha:       ventas.fecha,
      metodo_pago: ventas.metodo_pago,
      descuento:   ventas.descuento,
      tipo:        ventas.tipo,
      nombre:      clientes.nombre,
      cliente_id:  ventas.cliente_id,
    })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.cliente_id, clientes.id))
    .where(eq(ventas.id, id));

  if (!venta) notFound();

  const items = await db
    .select()
    .from(detalle_venta)
    .where(eq(detalle_venta.venta_id, id));

  const fechaDate = venta.fecha ? new Date(venta.fecha) : null;
  const fechaStr = fechaDate
    ? fechaDate.toLocaleString("es-AR", {
        weekday: "long", day: "2-digit", month: "long",
        year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "Fecha no disponible";

  const subtotalItems = items.reduce((acc, i) => acc + (i.subtotal ?? 0), 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/ventas"
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venta #{venta.id}</h1>
          <p className="text-zinc-400 capitalize">{fechaStr}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserRound className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wide">Cliente</span>
          </div>
          <p className="text-zinc-100 font-semibold text-sm">{venta.nombre ?? "Anónimo"}</p>
          {venta.cliente_id && (
            <Link href={`/clientes/${venta.cliente_id}/edit`}
              className="text-[11px] text-purple-400 hover:underline mt-1 inline-block">
              Ver cliente →
            </Link>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wide">Pago</span>
          </div>
          {venta.metodo_pago ? (
            <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${METODO_COLORS[venta.metodo_pago] ?? "bg-zinc-700 text-zinc-300"}`}>
              {venta.metodo_pago}
            </span>
          ) : (
            <p className="text-zinc-500 text-sm">No registrado</p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wide">Total</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(venta.total)}</p>
          {(venta.descuento ?? 0) > 0 && (
            <p className="text-[11px] text-orange-400 mt-0.5">
              Descuento: -{formatCurrency(venta.descuento ?? 0)}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <Package className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-200">
            Productos ({items.length})
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-600 font-medium">
            Sin detalle de productos registrado.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-3 text-left">Producto</th>
                <th className="px-6 py-3 text-center">Cant.</th>
                <th className="px-6 py-3 text-right">P. Unitario</th>
                <th className="px-6 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((item) => {
                const precioUnit =
                  item.precio_venta_historico ??
                  (item.cantidad && item.subtotal ? item.subtotal / item.cantidad : null);

                return (
                  <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-zinc-200 font-medium text-sm">
                        {item.nombre_producto ?? "Producto eliminado"}
                      </p>
                      {item.nombre_variante && (
                        <p className="text-xs text-zinc-500">{item.nombre_variante}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center text-zinc-300 font-mono">
                      {item.cantidad ?? 1}
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-400 text-sm">
                      {precioUnit != null ? formatCurrency(precioUnit) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-zinc-100">
                      {item.subtotal != null ? formatCurrency(item.subtotal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-800/30">
                <td colSpan={3} className="px-6 py-3 text-right text-sm text-zinc-400 font-medium">
                  Subtotal productos
                </td>
                <td className="px-6 py-3 text-right font-bold text-zinc-100">
                  {formatCurrency(subtotalItems)}
                </td>
              </tr>
              {(venta.descuento ?? 0) > 0 && (
                <tr className="bg-zinc-800/30">
                  <td colSpan={3} className="px-6 py-2 text-right text-sm text-orange-400">
                    Descuento
                  </td>
                  <td className="px-6 py-2 text-right text-sm text-orange-400 font-bold">
                    -{formatCurrency(venta.descuento ?? 0)}
                  </td>
                </tr>
              )}
              <tr className="bg-zinc-800/50">
                <td colSpan={3} className="px-6 py-3 text-right font-bold text-zinc-100">
                  TOTAL
                </td>
                <td className="px-6 py-3 text-right text-lg font-black text-emerald-400">
                  {formatCurrency(venta.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
