import { db } from "@/db";
import { ventas, detalle_venta, clientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/formatter";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketVentaPage({ params }: Props) {
  const resolved = await params;
  const ventaId = parseInt(resolved.id);

  const [venta] = await db
    .select({
      id: ventas.id,
      fecha: ventas.fecha,
      total: ventas.total,
      metodo_pago: ventas.metodo_pago,
      descuento: ventas.descuento,
      cliente_nombre: clientes.nombre,
      cliente_dni: clientes.dni,
    })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.cliente_id, clientes.id))
    .where(eq(ventas.id, ventaId))
    .limit(1);

  if (!venta) notFound();

  const detalles = await db
    .select()
    .from(detalle_venta)
    .where(eq(detalle_venta.venta_id, ventaId));

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8 print:p-0 print:bg-white">
      {/* Botones de control (ocultos al imprimir) */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link 
          href="/ventas"
          className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Ventas
        </Link>
        <PrintButton />
      </div>

      {/* Comprobante */}
      <div className="max-w-[800px] mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none border border-zinc-200 print:border-none">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 border-b border-zinc-100 pb-12">
            <div className="space-y-4">
              <div className="relative w-48 h-20 mb-4">
                <Image 
                  src="/logo.png" 
                  alt="Libreria Del Norte" 
                  fill
                  className="object-contain object-left"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Librería DEL NORTE</h1>
                <p className="text-zinc-500 font-medium">Rapipago VdC · Villa del Carmen</p>
                <p className="text-zinc-500">Cel: 3704502575 · @delnorte_libreria</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="inline-block bg-zinc-900 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                Comprobante No Válido como Factura
              </div>
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-wider">Número de Venta</p>
              <p className="text-4xl font-black text-zinc-900">#{String(venta.id).padStart(6, '0')}</p>
              <p className="text-zinc-500 font-medium">{formatDate(venta.fecha || "")}</p>
            </div>
          </div>

          {/* Info Cliente & Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-zinc-50 rounded-2xl p-6">
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Cliente</p>
              <p className="text-lg font-bold text-zinc-900">{venta.cliente_nombre || "Consumidor Final"}</p>
              {venta.cliente_dni && <p className="text-sm text-zinc-500">DNI: {venta.cliente_dni}</p>}
            </div>
            <div className="bg-zinc-50 rounded-2xl p-6">
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Información de Pago</p>
              <p className="text-lg font-bold text-zinc-900">{venta.metodo_pago}</p>
              <p className="text-sm text-zinc-500">Estado: Completado</p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-12">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <th className="py-4">Descripción</th>
                  <th className="py-4 text-center">Cant.</th>
                  <th className="py-4 text-right">Precio</th>
                  <th className="py-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {detalles.map((item) => (
                  <tr key={item.id} className="text-zinc-700">
                    <td className="py-4">
                      <p className="font-bold text-zinc-900">{item.nombre_producto}</p>
                    </td>
                    <td className="py-4 text-center font-medium">{item.cantidad}</td>
                    <td className="py-4 text-right font-medium">{formatCurrency((item.subtotal || 0) / (item.cantidad || 1))}</td>
                    <td className="py-4 text-right font-bold text-zinc-900">{formatCurrency(item.subtotal || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end border-t-4 border-zinc-900 pt-8">
            <div className="w-full md:w-64 space-y-3">
              {venta.descuento && venta.descuento > 0 ? (
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Descuento</span>
                  <span className="text-orange-500">-{formatCurrency(venta.descuento)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center bg-zinc-900 text-white p-4 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest opacity-70">Total Final</span>
                <span className="text-2xl font-black">{formatCurrency(venta.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center border-t border-dashed border-zinc-200 pt-12">
            <p className="text-xl font-black text-zinc-900 mb-2">¡Gracias por tu compra!</p>
            <p className="text-zinc-400 text-sm font-medium">Si tenés alguna duda contactanos por WhatsApp.</p>
            <div className="mt-8 flex justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-300">
              <span>Librería del Norte</span>
              <span>•</span>
              <span>Original Receipt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
