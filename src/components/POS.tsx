"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  CheckCircle, AlertTriangle, Loader2, UserRound, Banknote,
  CreditCard, Smartphone, BadgePercent, Receipt, Zap
} from "lucide-react";
import {
  searchProductosAction,
  searchClientesAction,
  createVentaAction,
  ensureClienteAnonimoAction,
  getPrecioPromocionalForClientAction,
  type ProductoResult,
  type ClienteResult,
  type CartItem,
} from "@/lib/ventaActions";

const formatARS = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v);

const METODOS = [
  { value: "Efectivo",           label: "Efectivo",     icon: Banknote },
  { value: "Transferencia",      label: "Transferencia", icon: Smartphone },
  { value: "Tarjeta",            label: "Tarjeta",      icon: CreditCard },
  { value: "Cuenta Corriente",   label: "Cta. Corriente", icon: BadgePercent, esDeuda: true },
];

export function POS({ quickProducts = [] }: { quickProducts?: ProductoResult[] }) {
  // ── Product search ─────────────────────────────────────────────
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<ProductoResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cart ───────────────────────────────────────────────────────
  const [cart, setCart]             = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_cart');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });
  const [pendingQty, setPendingQty] = useState<Record<number, number>>({});

  // ── Modal state ────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [clienteQuery, setClienteQuery]       = useState("");
  const [clienteResults, setClienteResults]   = useState<ClienteResult[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteResult | null>(null);
  const [clienteAnonimo, setClienteAnonimo] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [descuento, setDescuento]   = useState<number>(0);
  const [descTipo, setDescTipo]     = useState<"monto" | "pct">("monto");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ text: string; ok: boolean } | null>(null);
  const clienteTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product search debounce ────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      searchTimer.current = setTimeout(() => {
        setResults([]);
        setSearching(false);
      }, 0);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchProductosAction(query);
      setResults(r);
      setSearching(false);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  // ── Cliente search debounce ────────────────────────────────────
  useEffect(() => {
    if (clienteTimer.current) clearTimeout(clienteTimer.current);
    if (clienteQuery.trim().length < 2) {
      clienteTimer.current = setTimeout(() => {
        setClienteResults([]);
        setClienteSearching(false);
      }, 0);
      return;
    }
    clienteTimer.current = setTimeout(async () => {
      setClienteSearching(true);
      const r = await searchClientesAction(clienteQuery);
      setClienteResults(r);
      setClienteSearching(false);
    }, 300);
    return () => { if (clienteTimer.current) clearTimeout(clienteTimer.current); };
  }, [clienteQuery]);

  // ── Cart helpers ───────────────────────────────────────────────
  const addToCart = useCallback((p: ProductoResult, qty: number = 1, precio: number = p.precio_venta_minorista ?? 0) => {
    const amount = Math.max(1, qty);
    setCart(prev => {
      const existing = prev.find(i => i.producto_id === p.id);
      if (existing) {
        return prev.map(i =>
          i.producto_id === p.id
            ? { ...i, cantidad: i.cantidad + amount, subtotal: (i.cantidad + amount) * precio, precio, esPromocional: precio !== (p.precio_venta_minorista ?? 0), precio_venta_minorista: p.precio_venta_minorista ?? 0 }
            : i
        );
      }
      return [...prev, {
        producto_id: p.id,
        nombre: [p.tipo, p.marca, p.descripcion].filter(Boolean).join(" "),
        precio,
        cantidad: amount,
        subtotal: precio * amount,
        esPromocional: precio !== (p.precio_venta_minorista ?? 0),
        precio_venta_minorista: p.precio_venta_minorista ?? 0,
      }];
    });
    setPendingQty(prev => ({ ...prev, [p.id]: 1 }));
  }, []);

  const handleAddToCart = useCallback(async (p: ProductoResult, qty: number = 1) => {
    const clienteId = selectedCliente?.id || (clienteAnonimo ? null : null);
    const result = await getPrecioPromocionalForClientAction(p.id, qty, clienteId || null);
    const precio = result.precio || p.precio_venta_minorista || 0;
    addToCart(p, qty, precio);
  }, [selectedCliente, clienteAnonimo, addToCart]);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart(prev =>
      prev
        .map(i =>
          i.producto_id === id
            ? { ...i, cantidad: i.cantidad + delta, subtotal: (i.cantidad + delta) * i.precio }
            : i
        )
        .filter(i => i.cantidad > 0)
    );
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    const val = Math.max(1, qty);
    setCart(prev =>
      prev.map(i =>
        i.producto_id === id
          ? { ...i, cantidad: val, subtotal: val * i.precio }
          : i
      )
    );
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart(prev => prev.filter(i => i.producto_id !== id));
  }, []);

  const updatePrice = useCallback((id: number, newPrice: number) => {
    setCart(prev =>
      prev.map(i =>
        i.producto_id === id
          ? { ...i, precio: newPrice, subtotal: i.cantidad * newPrice }
          : i
      )
    );
  }, []);

  const recalcularPreciosCarrito = useCallback(async () => {
    const clienteId = selectedCliente?.id || (clienteAnonimo ? null : null);
    const newCart = await Promise.all(
      cart.map(async (item) => {
        const result = await getPrecioPromocionalForClientAction(item.producto_id, item.cantidad, clienteId || null);
        const precio = result.precio || item.precio_venta_minorista || item.precio;
        return {
          ...item,
          precio,
          subtotal: item.cantidad * precio,
          esPromocional: precio !== item.precio_venta_minorista,
        };
      })
    );
    setCart(newCart);
  }, [selectedCliente, clienteAnonimo, cart]);

  const clearCart = () => {
    setCart([]);
    setQuery("");
    setResults([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_cart');
    }
  };

  // ── Persistir carrito en localStorage ────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // ── Recalcular precios cuando cambia el cliente ──────────────────
  useEffect(() => {
    if (cart.length > 0) {
      recalcularPreciosCarrito();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCliente?.id, clienteAnonimo]);

  // ── Recalcular precios cuando cambian cantidades (promociones por cantidad) ───
  const cantidadesKey = cart.map(i => `${i.producto_id}:${i.cantidad}`).join(",");
  useEffect(() => {
    if (cart.length > 0) {
      recalcularPreciosCarrito();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidadesKey]);

  // ── Totals ─────────────────────────────────────────────────────
  const subtotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const descuentoMonto = descTipo === "monto" ? descuento : subtotal * (descuento / 100);
  const total = Math.max(0, subtotal - descuentoMonto);

  // ── Finalize sale ──────────────────────────────────────────────
  const handleConfirmar = async () => {
    if (!clienteAnonimo && !selectedCliente) { setToast({ text: "Seleccioná un cliente", ok: false }); return; }
    if (!cart.length) { setToast({ text: "El carrito está vacío", ok: false }); return; }
    setSubmitting(true);

    let clienteId: number;
    if (clienteAnonimo) {
      clienteId = await ensureClienteAnonimoAction();
    } else {
      clienteId = selectedCliente!.id;
    }

    const result = await createVentaAction({
      cliente_id: clienteId,
      metodo_pago: metodoPago,
      descuento: descuentoMonto,
      items: cart,
    });
    setSubmitting(false);
    if (result.success) {
      setToast({ text: result.mensaje || `Venta #${result.ventaId} registrada correctamente`, ok: true });
      setModalOpen(false);
      clearCart();
      setSelectedCliente(null);
      setClienteAnonimo(false);
      setClienteQuery("");
      setDescuento(0);
      setMetodoPago("Efectivo");
    } else {
      setToast({ text: result.error ?? "Error al registrar la venta", ok: false });
    }
  };

  const openModal = () => {
    if (!cart.length) { setToast({ text: "Agregá productos al carrito primero", ok: false }); return; }
    setModalOpen(true);
  };

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/15 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Punto de Venta</h2>
            <p className="text-zinc-500 text-sm">Buscá productos y armá el pedido del cliente</p>
          </div>
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Vaciar carrito
          </button>
        )}
      </div>

      {/* ── Quick Products ─────────────────────────────── */}
      {quickProducts.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Rápido
          </div>
          {quickProducts.map((p) => {
            const label = [p.tipo, p.descripcion].filter(Boolean).join(' ');
            const inCart = cart.find(i => i.producto_id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => handleAddToCart(p, 1)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  inCart
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-900/80"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span className="text-xs text-emerald-400 font-bold">{formatARS(p.precio_venta_minorista ?? 0)}</span>
                {inCart && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-zinc-950 rounded-full text-[10px] font-black flex items-center justify-center">
                    {inCart.cantidad}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Search ──────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 animate-spin" />}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre, marca o código de barras..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-11 pr-11 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[420px] overflow-y-auto">
              <div className="p-3 border-b border-zinc-800 text-xs text-zinc-500 font-bold uppercase tracking-wider">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </div>
              <div className="divide-y divide-zinc-800/60">
                {results.map((p) => {
                  const inCart = cart.find(i => i.producto_id === p.id);
                  const qty = pendingQty[p.id] ?? 1;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-100 truncate">
                          {p.tipo} {p.marca}
                        </p>
                        {p.descripcion && (
                          <p className="text-xs text-zinc-500 truncate">{p.descripcion}</p>
                        )}
                        {p.codigo_barras && (
                          <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{p.codigo_barras}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {p.stock != null && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.stock > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                          }`}>
                            Stock: {p.stock}
                          </span>
                        )}
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">{formatARS(p.precio_venta_minorista ?? 0)}</p>
                          {p.precio_venta_mayorista && p.precio_venta_mayorista !== p.precio_venta_minorista && (
                            <p className="text-[10px] text-zinc-500">May: {formatARS(p.precio_venta_mayorista)}</p>
                          )}
                        </div>
                        {/* Qty + Add */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingQty(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1) })); }}
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-zinc-300" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-zinc-100">{qty}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingQty(prev => ({ ...prev, [p.id]: (prev[p.id] ?? 1) + 1 })); }}
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3 text-zinc-300" />
                          </button>
                          <button
                            onClick={() => handleAddToCart(p, qty)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              inCart
                                ? "bg-orange-500 hover:bg-orange-600 text-zinc-950"
                                : "bg-zinc-700 hover:bg-orange-500 hover:text-zinc-950 text-zinc-300"
                            }`}
                            title={inCart ? `En carrito: ${inCart.cantidad}` : "Agregar al carrito"}
                          >
                            {inCart
                              ? <span className="text-[10px] font-black">{inCart.cantidad}</span>
                              : <Plus className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : query.trim().length >= 2 && !searching ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-600">
              No se encontraron productos para &quot;{query}&quot;
            </div>
          ) : query.trim().length < 2 && cart.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Escribí al menos 2 caracteres para buscar</p>
            </div>
          ) : null}
        </div>

        {/* ── Right: Cart ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-zinc-200">Carrito</span>
              </div>
              {cart.length > 0 && (
                <span className="text-xs bg-orange-500 text-zinc-950 font-black px-2 py-0.5 rounded-full">
                  {cart.reduce((a, i) => a + i.cantidad, 0)} items
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-600">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">El carrito está vacío</p>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-zinc-800/60">
                  {cart.map((item) => (
                    <div key={item.producto_id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200 leading-tight">{item.nombre}</p>
                          {item.esPromocional && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                              Promo
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.producto_id)}
                          className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        {/* Qty controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.producto_id, -1)}
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-zinc-300" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => setQty(item.producto_id, parseInt(e.target.value) || 1)}
                            className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-zinc-100 text-sm text-center focus:outline-none focus:border-orange-500/50 transition-colors"
                          />
                          <button
                            onClick={() => updateQty(item.producto_id, 1)}
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3 text-zinc-300" />
                          </button>
                        </div>
                        {/* Editable price + subtotal */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <span className="text-[10px] text-zinc-600">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precio || ""}
                              onChange={(e) =>
                                updatePrice(item.producto_id, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 text-zinc-300 text-xs text-right focus:outline-none focus:border-orange-500/50 focus:text-zinc-100 transition-colors"
                              title="Precio unitario (editable)"
                            />
                          </div>
                          <p className="text-sm font-bold text-emerald-400">{formatARS(item.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-zinc-800 p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Subtotal</span>
                    <span>{formatARS(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black">
                    <span className="text-zinc-100">Total</span>
                    <span className="text-emerald-400">{formatARS(subtotal)}</span>
                  </div>
                  <button
                    onClick={openModal}
                    className="w-full mt-3 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    <Receipt className="w-4 h-4" />
                    Finalizar Venta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Finalizar Venta ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold">Finalizar Venta</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order summary */}
              <div className="bg-zinc-950 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  Resumen del Pedido ({cart.reduce((a, i) => a + i.cantidad, 0)} items)
                </p>
                {cart.map(item => (
                  <div key={item.producto_id} className="flex justify-between text-sm">
                    <span className="text-zinc-400 truncate mr-4">
                      <span className="text-zinc-200 font-medium">{item.cantidad}×</span> {item.nombre}
                    </span>
                    <span className="text-zinc-300 shrink-0 font-medium">{formatARS(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">
                  <UserRound className="w-4 h-4 inline mr-1.5 text-purple-400" />
                  Cliente <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="clienteAnonimo"
                    checked={clienteAnonimo}
                    onChange={(e) => {
                      setClienteAnonimo(e.target.checked);
                      if (e.target.checked) { setSelectedCliente(null); setClienteQuery(""); setClienteResults([]); }
                    }}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="clienteAnonimo" className="text-sm text-zinc-400">Cliente Anónimo</label>
                </div>
                {clienteAnonimo ? (
                  <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
                    <UserRound className="w-5 h-5 text-zinc-500" />
                    <p className="text-sm text-zinc-400">Venta sin cliente registrado</p>
                  </div>
                ) : selectedCliente ? (
                  <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{selectedCliente.nombre}</p>
                      <p className="text-xs text-zinc-500">{selectedCliente.telefono} · {selectedCliente.barrio}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedCliente(null); setClienteQuery(""); }}
                      className="text-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    {clienteSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />}
                    <input
                      type="text"
                      value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      placeholder="Buscar por nombre, DNI o teléfono..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-9 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                    {clienteResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
                        {clienteResults.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCliente(c); setClienteQuery(c.nombre); setClienteResults([]); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left"
                          >
                            <UserRound className="w-4 h-4 text-purple-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-zinc-100">{c.nombre}</p>
                              <p className="text-xs text-zinc-500">{c.telefono} · {c.barrio}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {METODOS.map(({ value, label, icon: Icon, esDeuda }) => (
                    <button
                      key={value}
                      onClick={() => setMetodoPago(value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        metodoPago === value
                          ? esDeuda 
                            ? "bg-red-500/20 border-red-500 text-red-400"
                            : "bg-orange-500 border-orange-500 text-zinc-950"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="text-left">
                        {label}
                        {esDeuda && metodoPago === value && selectedCliente && (
                          <p className="text-xs opacity-75">Límite: {formatARS(selectedCliente.limite_credito || 10000)}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Descuento */}
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Descuento</label>
                <div className="flex items-center gap-2">
                  <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden text-xs font-bold">
                    <button
                      onClick={() => setDescTipo("monto")}
                      className={`px-3 py-2 transition-colors ${descTipo === "monto" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      $
                    </button>
                    <button
                      onClick={() => setDescTipo("pct")}
                      className={`px-3 py-2 transition-colors ${descTipo === "pct" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={descTipo === "pct" ? 100 : subtotal}
                    step="0.01"
                    value={descuento || ""}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                    placeholder={descTipo === "monto" ? "0.00" : "0"}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                  />
                  {descuento > 0 && (
                    <span className="text-sm text-orange-400 font-bold shrink-0">
                      -{formatARS(descuentoMonto)}
                    </span>
                  )}
                </div>
              </div>

              {/* Total final */}
              <div className="bg-zinc-950 rounded-xl p-4 space-y-2 border border-zinc-800">
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Subtotal</span>
                  <span>{formatARS(subtotal)}</span>
                </div>
                {descuentoMonto > 0 && (
                  <div className="flex justify-between text-sm text-orange-400">
                    <span>Descuento</span>
                    <span>-{formatARS(descuentoMonto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xl border-t border-zinc-800 pt-2 mt-2">
                  <span className="text-zinc-100">TOTAL</span>
                  <span className="text-emerald-400">{formatARS(total)}</span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirmar}
                disabled={submitting || (!selectedCliente && !clienteAnonimo)}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-base uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Confirmar Venta · {formatARS(total)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] bg-zinc-950 border rounded-2xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-right ${
          toast.ok ? "border-emerald-500/50" : "border-orange-500/50"
        }`}>
          <div className="flex items-start gap-3">
            {toast.ok
              ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-sm text-zinc-200 font-medium leading-relaxed">{toast.text}</p>
              <button
                onClick={() => setToast(null)}
                className="text-xs text-zinc-500 hover:text-zinc-100 mt-2 font-bold uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
