"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, DollarSign, Calendar, User, Package, Search, CheckCircle, Tag, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";
import { createPedidoAction } from "@/lib/pedidosActions";
import { searchClientesAction, searchProductosAction, getPrecioPromocionalForClientAction, type ProductoResult, type ClienteResult } from "@/lib/ventaActions";

interface PedidoProducto {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_original: number;
  precio_final: number;
  subtotal: number;
  esPromocional: boolean;
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteResult | null>(null);
  const [searchCli, setSearchCli] = useState("");
  const [clientesFound, setClientesFound] = useState<ClienteResult[]>([]);
  
  const [searchProd, setSearchProd] = useState("");
  const [prodsFound, setProdsFound] = useState<ProductoResult[]>([]);
  
  const [detalles, setDetalles] = useState("");
  const [adelanto, setAdelanto] = useState("0");
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [productos, setProductos] = useState<PedidoProducto[]>([]);
  const [notificar, setNotificar] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const searchCliTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchProdTimeout = useRef<NodeJS.Timeout | null>(null);

  // Búsqueda de clientes
  useEffect(() => {
    if (searchCli.length < 2) {
      setClientesFound([]);
      return;
    }
    if (searchCliTimeout.current) clearTimeout(searchCliTimeout.current);
    searchCliTimeout.current = setTimeout(async () => {
      const res = await searchClientesAction(searchCli);
      setClientesFound(res);
    }, 300);
  }, [searchCli]);

  // Búsqueda de productos
  useEffect(() => {
    if (searchProd.length < 2) {
      setProdsFound([]);
      return;
    }
    if (searchProdTimeout.current) clearTimeout(searchProdTimeout.current);
    searchProdTimeout.current = setTimeout(async () => {
      const res = await searchProductosAction(searchProd);
      setProdsFound(res);
    }, 300);
  }, [searchProd]);

  const total = productos.reduce((sum, p) => sum + p.subtotal, 0);
  const adelantoNum = parseFloat(adelanto) || 0;
  const saldo = total - adelantoNum;

  const agregarProducto = async (p: ProductoResult) => {
    const cantidad = 1;
    // Obtener precio promocional si aplica
    const promo = await getPrecioPromocionalForClientAction(p.id, cantidad, cliente?.id || null);
    const precioBase = p.precio_venta_minorista || 0;
    const precioFinal = promo.esPromocional ? (promo.precio || precioBase) : precioBase;

    const nuevo: PedidoProducto = {
      producto_id: p.id,
      nombre: `${p.tipo || ""} ${p.marca || ""} ${p.descripcion || ""}`.trim(),
      cantidad,
      precio_original: precioBase,
      precio_final: precioFinal,
      subtotal: precioFinal * cantidad,
      esPromocional: promo.esPromocional,
    };

    setProductos((prev) => {
      const existIdx = prev.findIndex((item) => item.producto_id === p.id);
      if (existIdx >= 0) {
        const updated = [...prev];
        updated[existIdx].cantidad += 1;
        // Recalcular promo para la nueva cantidad
        recalcularPrecioItem(existIdx, updated[existIdx].cantidad);
        return updated;
      }
      return [...prev, nuevo];
    });
    setSearchProd("");
    setProdsFound([]);
  };

  const recalcularPrecioItem = async (idx: number, nuevaCantidad: number) => {
    const item = productos[idx];
    const promo = await getPrecioPromocionalForClientAction(item.producto_id, nuevaCantidad, cliente?.id || null);
    const precioFinal = promo.esPromocional ? (promo.precio || item.precio_original) : item.precio_original;
    
    setProductos((prev) => {
      const updated = [...prev];
      updated[idx].cantidad = nuevaCantidad;
      updated[idx].precio_final = precioFinal;
      updated[idx].subtotal = precioFinal * nuevaCantidad;
      updated[idx].esPromocional = promo.esPromocional;
      return updated;
    });
  };

  const quitarProducto = (id: number) => {
    setProductos(productos.filter((p) => p.producto_id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productos.length === 0) {
      setToast({ text: "Agrega al menos un producto", ok: false });
      return;
    }
    setSubmitting(true);
    const result = await createPedidoAction({
      cliente_id: cliente?.id || 0,
      detalles: detalles || "Sin descripción adicional",
      productos: productos.map(p => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio_final,
        subtotal: p.subtotal
      })),
      total,
      adelanto: adelantoNum,
      fecha_estimada_entrega: fechaEstimada || undefined,
      notificar_whatsapp: notificar,
    });
    setSubmitting(false);
    if (result.success) {
      setToast({ text: `Pedido ${result.codigo} creado con éxito`, ok: true });
      setTimeout(() => router.push("/pedidos"), 1500);
    } else {
      setToast({ text: result.error || "Error al crear pedido", ok: false });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pedidos" className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Pedido</h1>
            <p className="text-zinc-500 mt-1">Registra pedidos con seña y seguimiento de estado</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente y Productos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selector Cliente */}
              <div className="relative">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">Cliente</label>
                {cliente ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg"><User className="w-4 h-4 text-emerald-400" /></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-400">{cliente.nombre}</p>
                        <p className="text-[10px] text-emerald-500/70">{cliente.telefono || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <button onClick={() => setCliente(null)} className="text-xs text-emerald-500/50 hover:text-emerald-400 underline font-medium">Cambiar</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={searchCli}
                      onChange={(e) => setSearchCli(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
                    />
                    {clientesFound.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                        {clientesFound.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => { setCliente(c); setClientesFound([]); setSearchCli(""); }}
                            className="p-3 hover:bg-zinc-800 cursor-pointer flex items-center justify-between border-b border-zinc-800/50 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-semibold">{c.nombre}</p>
                              <p className="text-[10px] text-zinc-500">{c.dni} · {c.telefono}</p>
                            </div>
                            <Plus className="w-4 h-4 text-zinc-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fecha Estimada */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">Entrega Estimada</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="date"
                    value={fechaEstimada}
                    onChange={(e) => setFechaEstimada(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Selector Productos */}
            <div className="relative">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">Agregar Productos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  placeholder="Buscar por nombre o código de barras..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
                />
                {prodsFound.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                    {prodsFound.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => agregarProducto(p)}
                        className="p-3 hover:bg-zinc-800 cursor-pointer flex items-center justify-between border-b border-zinc-800/50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold">{p.tipo} {p.marca} {p.descripcion}</p>
                          <p className="text-xs text-emerald-400 font-bold">{formatCurrency(p.precio_venta_minorista || 0)}</p>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Listado de Productos */}
            <div className="space-y-3">
              {productos.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                  <Package className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Agrega productos para comenzar el pedido</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950/50">
                      <tr>
                        <th className="text-left p-3 text-zinc-500 font-bold text-[10px] uppercase">Producto</th>
                        <th className="text-center p-3 text-zinc-500 font-bold text-[10px] uppercase">Cant.</th>
                        <th className="text-right p-3 text-zinc-500 font-bold text-[10px] uppercase">Precio</th>
                        <th className="text-right p-3 text-zinc-500 font-bold text-[10px] uppercase">Subtotal</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-zinc-950">
                      {productos.map((p, idx) => (
                        <tr key={p.producto_id} className="border-t border-zinc-800/50 group">
                          <td className="p-3">
                            <p className="font-medium text-zinc-200">{p.nombre}</p>
                            {p.esPromocional && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[9px] font-bold mt-1">
                                <Tag className="w-2.5 h-2.5" /> PROMO APLICADA
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => recalcularPrecioItem(idx, Math.max(1, p.cantidad - 1))}
                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center"
                              >-</button>
                              <input 
                                type="number"
                                min="1"
                                value={p.cantidad}
                                onChange={(e) => recalcularPrecioItem(idx, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 bg-zinc-950 border border-zinc-800 rounded text-center font-bold text-sm focus:outline-none focus:border-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button 
                                onClick={() => recalcularPrecioItem(idx, p.cantidad + 1)}
                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center"
                              >+</button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {p.esPromocional && <p className="text-[10px] text-zinc-500 line-through">{formatCurrency(p.precio_original)}</p>}
                            <p className="font-bold">{formatCurrency(p.precio_final)}</p>
                          </td>
                          <td className="p-3 text-right font-bold text-zinc-100">
                            {formatCurrency(p.subtotal)}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => quitarProducto(p.producto_id)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resumen y Pago */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 sticky top-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              Resumen del Pedido
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">Descripción / Instrucciones</label>
                <textarea
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  placeholder="Ej: Retira el sábado, sin envoltorio..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Total Pedido</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-zinc-500">Adelanto / Seña</span>
                    <span className="text-emerald-400 font-bold">+{formatCurrency(adelantoNum)}</span>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      value={adelanto}
                      onChange={(e) => setAdelanto(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-purple-500/30 transition-colors"
                     onClick={() => setNotificar(!notificar)}>
                  <input
                    type="checkbox"
                    checked={notificar}
                    onChange={(e) => setNotificar(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-800 text-purple-500 focus:ring-purple-500 bg-zinc-900"
                  />
                  <div>
                    <p className="text-sm font-bold text-zinc-200">Avisar al cliente</p>
                    <p className="text-[10px] text-zinc-500">Enviar WhatsApp al registrar y al finalizar el pedido</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-sm font-bold text-zinc-200">Saldo Restante</span>
                  <span className="text-xl font-black text-purple-500">{formatCurrency(saldo)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || productos.length === 0}
              className="w-full py-4 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? "Procesando..." : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Registrar Pedido
                </>
              )}
            </button>

            {toast && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                toast.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {toast.ok ? <CheckCircle className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                {toast.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
