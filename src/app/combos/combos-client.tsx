"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  createComboAction,
  updateComboAction,
  deleteComboAction,
  toggleComboAction,
  reactivarComboAction,
  createPromocionAction,
  updatePromocionAction,
  deletePromocionAction,
  togglePromocionAction,
  reactivarPromocionAction,
  getCombosAction,
  getPromocionesAction,
  type Combo,
  type Promocion,
} from "@/lib/combosActions";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Power,
  Copy,
  Search,
  X,
  DollarSign,
  Package,
  Layers,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

// ── Product Search Component ───────────────────────────────────
function ProductSearch({
  productos,
  onSelect,
  placeholder = "Buscar producto...",
}: {
  productos: { id: number; nombre: string; precio_venta: number | null; precio_costo: number | null }[];
  onSelect: (id: number) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (q.length >= 1 ? productos.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []),
    [q, productos]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.length >= 1 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl max-h-60 overflow-y-auto shadow-xl">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); setQ(""); setOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm transition-colors flex justify-between items-center"
            >
              <span className="truncate mr-2">{p.nombre}</span>
              <span className="text-xs text-zinc-500 shrink-0">{formatCurrency(p.precio_venta || 0)}</span>
            </button>
          ))}
        </div>
      )}
      {open && q.length >= 1 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-500 text-center">
          Sin resultados
        </div>
      )}
    </div>
  );
}

// ── Margin Color Helper ────────────────────────────────────────
function getMarginColor(pct: number): { text: string; bg: string } {
  if (pct < 0) return { text: "text-red-400", bg: "bg-red-500/20" };
  if (pct < 15) return { text: "text-amber-400", bg: "bg-amber-500/20" };
  return { text: "text-blue-400", bg: "bg-blue-500/20" };
}

type ProductoItem = { id: number; nombre: string; precio_venta: number | null; precio_costo: number | null };

interface CombosClientProps {
  initialCombos: Combo[];
  initialPromociones: Promocion[];
  initialProductos: ProductoItem[];
}

export function CombosClient({ initialCombos, initialPromociones, initialProductos }: CombosClientProps) {
  const [tab, setTab] = useState<"combos" | "promociones">("combos");
  const [combos, setCombos] = useState<Combo[]>(initialCombos);
  const [promociones, setPromociones] = useState<Promocion[]>(initialPromociones);
  const [productos] = useState<ProductoItem[]>(initialProductos);
  const [search, setSearch] = useState("");
  const [showComboModal, setShowComboModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promocion | null>(null);
  const [showExpiradas, setShowExpiradas] = useState(false);
  const [showExpiradasCombos, setShowExpiradasCombos] = useState(false);

  const [comboForm, setComboForm] = useState({
    nombre: "",
    precio_combo: "",
    activa: true,
    fecha_expiracion: "",
    items: [] as { producto_id: number; cantidad: number }[],
  });

  const [promoForm, setPromoForm] = useState({
    producto_id: "",
    cantidad_minima: "",
    precio_promocional: "",
    activa: true,
    fecha_expiracion: "",
  });

  const [promoSearch, setPromoSearch] = useState("");

  async function reload() {
    const [c, p] = await Promise.all([getCombosAction(), getPromocionesAction()]);
    setCombos(c);
    setPromociones(p);
  }

  // ── Combo Handlers ──
  async function handleSaveCombo() {
    const data = { nombre: comboForm.nombre, precio_combo: parseFloat(comboForm.precio_combo), activa: comboForm.activa, fecha_expiracion: comboForm.fecha_expiracion || null, items: comboForm.items };
    const result = editingCombo && editingCombo.id > 0 ? await updateComboAction(editingCombo.id, data) : await createComboAction(data);
    if (result.success) { setShowComboModal(false); resetComboForm(); reload(); } else { alert(result.error); }
  }
  async function handleDeleteCombo(id: number) { if (confirm("¿Eliminar este combo?")) { const r = await deleteComboAction(id); if (r.success) reload(); else alert(r.error); } }
  async function handleToggleCombo(id: number) { const r = await toggleComboAction(id); if (r.success) reload(); }
  async function handleReactivarCombo(id: number) { const r = await reactivarComboAction(id); if (r.success) reload(); }

  function handleCloneCombo(combo: Combo) {
    setEditingCombo({ ...combo, id: 0, nombre: combo.nombre ? `${combo.nombre} (Copia)` : "Combo (Copia)" });
    setComboForm({ nombre: combo.nombre ? `${combo.nombre} (Copia)` : "Combo (Copia)", precio_combo: combo.precio_combo.toString(), activa: true, fecha_expiracion: "", items: combo.items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })) });
    setShowComboModal(true);
  }
  function handleEditCombo(combo: Combo) {
    setEditingCombo(combo);
    setComboForm({ nombre: combo.nombre || "", precio_combo: combo.precio_combo.toString(), activa: combo.activa === 1, fecha_expiracion: "", items: combo.items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })) });
    setShowComboModal(true);
  }
  function resetComboForm() { setComboForm({ nombre: "", precio_combo: "", activa: true, fecha_expiracion: "", items: [] }); setEditingCombo(null); }

  function addComboItem(producto_id: number) {
    const existing = comboForm.items.findIndex((i) => i.producto_id === producto_id);
    if (existing >= 0) {
      const items = [...comboForm.items];
      items[existing] = { ...items[existing], cantidad: items[existing].cantidad + 1 };
      setComboForm({ ...comboForm, items });
    } else {
      setComboForm({ ...comboForm, items: [...comboForm.items, { producto_id, cantidad: 1 }] });
    }
  }
  function updateComboItem(index: number, field: "producto_id" | "cantidad", value: number) {
    const items = [...comboForm.items];
    items[index] = { ...items[index], [field]: value };
    setComboForm({ ...comboForm, items });
  }
  function removeComboItem(index: number) { setComboForm({ ...comboForm, items: comboForm.items.filter((_, i) => i !== index) }); }

  // ── Promo Handlers ──
  async function handleSavePromo() {
    const data = { producto_id: parseInt(promoForm.producto_id), cantidad_minima: parseInt(promoForm.cantidad_minima), precio_promocional: parseFloat(promoForm.precio_promocional), activa: promoForm.activa, fecha_expiracion: promoForm.fecha_expiracion || null };
    const result = editingPromo ? await updatePromocionAction(editingPromo.id, data) : await createPromocionAction(data);
    if (result.success) { setShowPromoModal(false); resetPromoForm(); reload(); } else { alert(result.error); }
  }
  async function handleDeletePromo(id: number) { if (confirm("¿Eliminar esta promoción?")) { const r = await deletePromocionAction(id); if (r.success) reload(); else alert(r.error); } }
  async function handleTogglePromo(id: number) { const r = await togglePromocionAction(id); if (r.success) reload(); }
  async function handleReactivarPromo(id: number) { const r = await reactivarPromocionAction(id); if (r.success) reload(); }

  function handleEditPromo(promo: Promocion) {
    setEditingPromo(promo);
    setPromoForm({ producto_id: promo.producto_id.toString(), cantidad_minima: promo.cantidad_minima.toString(), precio_promocional: promo.precio_promocional.toString(), activa: promo.activa === 1, fecha_expiracion: "" });
    setShowPromoModal(true);
  }
  function resetPromoForm() { setPromoForm({ producto_id: "", cantidad_minima: "", precio_promocional: "", activa: true, fecha_expiracion: "" }); setEditingPromo(null); }

  // ── Combo Metrics ──
  function calcComboMetrics(items: { producto_id: number; cantidad: number }[], precioCombo: number) {
    let totalRegular = 0, totalCosto = 0;
    items.forEach((item) => {
      const prod = productos.find((p) => p.id === item.producto_id);
      if (prod) { 
        totalRegular += (prod.precio_venta || 0) * item.cantidad; 
        const costoUnitario = prod.precio_costo || (prod.precio_venta || 0) * 0.4;
        totalCosto += costoUnitario * item.cantidad; 
      }
    });
    const ahorroCliente = totalRegular - precioCombo;
    const margenGanancia = precioCombo - totalCosto;
    const ahorroClientePct = totalRegular > 0 ? (ahorroCliente / totalRegular) * 100 : 0;
    const margenPct = precioCombo > 0 ? (margenGanancia / precioCombo) * 100 : 0;
    const rentabilidad = totalCosto > 0 ? (margenGanancia / totalCosto) * 100 : 0;
    return { totalRegular, totalCosto, ahorroCliente, margenGanancia, ahorroClientePct, margenPct, rentabilidad };
  }
  const formMetrics = calcComboMetrics(comboForm.items, parseFloat(comboForm.precio_combo) || 0);

  // ── Promo Metrics ──
  function calcPromoMetrics(producto_id: number, cantidadMinima: number, precioPromocional: number) {
    const prod = productos.find((p) => p.id === producto_id);
    if (!prod) return null;
    const precioOriginal = prod.precio_venta || 0;
    const totalRegular = precioOriginal * cantidadMinima;
    const precioOfertaTotal = precioPromocional * cantidadMinima;
    const ahorroCliente = totalRegular - precioOfertaTotal;
    const ahorroClientePct = totalRegular > 0 ? (ahorroCliente / totalRegular) * 100 : 0;
    const costoUnitario = prod.precio_costo || (precioOriginal * 0.4);
    const totalCosto = costoUnitario * cantidadMinima;
    const margenGanancia = precioOfertaTotal - totalCosto;
    const margenPct = precioOfertaTotal > 0 ? (margenGanancia / precioOfertaTotal) * 100 : 0;
    const rentabilidad = totalCosto > 0 ? (margenGanancia / totalCosto) * 100 : 0;
    return { precioOriginal, precioUnitarioPromo: precioPromocional, totalRegular, precioOfertaTotal, ahorroCliente, ahorroClientePct, totalCosto, margenGanancia, margenPct, rentabilidad };
  }
  const promoFormMetrics = calcPromoMetrics(parseInt(promoForm.producto_id) || 0, parseInt(promoForm.cantidad_minima) || 0, parseFloat(promoForm.precio_promocional) || 0);

  // ── Derived Data ──
  const combosVigentes = combos.filter((c) => !c.expirado && (c.nombre?.toLowerCase().includes(search.toLowerCase()) ?? true));
  const combosExpirados = combos.filter((c) => c.expirado && (c.nombre?.toLowerCase().includes(search.toLowerCase()) ?? true));
  const promosVigentes = promociones.filter((p) => !p.expirado && (p.producto_nombre?.toLowerCase().includes(search.toLowerCase()) || p.producto_id.toString().includes(search)));
  const promosExpiradas = promociones.filter((p) => p.expirado && (p.producto_nombre?.toLowerCase().includes(search.toLowerCase()) || p.producto_id.toString().includes(search)));

  const promosAgrupadas = useMemo(() => {
    const map = new Map<number, { nombre: string; promos: Promocion[] }>();
    promosVigentes.forEach((p) => {
      const existing = map.get(p.producto_id);
      if (existing) { existing.promos.push(p); } else { map.set(p.producto_id, { nombre: p.producto_nombre || `ID ${p.producto_id}`, promos: [p] }); }
    });
    return Array.from(map.entries());
  }, [promosVigentes]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Combos y Promociones</h1>
        <p className="text-zinc-500 mt-1">Gestiona combos de productos y promociones por cantidad</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => { setTab("combos"); setSearch(""); }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${tab === "combos" ? "bg-orange-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>
          <Layers className="w-4 h-4" />Combos
        </button>
        <button onClick={() => { setTab("promociones"); setSearch(""); }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${tab === "promociones" ? "bg-orange-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>
          <Tag className="w-4 h-4" />Promociones
        </button>
      </div>

      {tab === "combos" ? (
        <>
          {/* ═══ COMBOS ═══ */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Buscar combos..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="flex gap-2">
              <a href="/api/combos-pdf" target="_blank"
                className="bg-zinc-900 text-zinc-400 hover:bg-zinc-800 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />Catálogo PDF
              </a>
              <button onClick={() => { resetComboForm(); setShowComboModal(true); }}
                className="bg-orange-500 text-zinc-950 px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />Nuevo Combo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {combosVigentes.map((combo) => {
              const m = calcComboMetrics(combo.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })), combo.precio_combo);
              const mc = getMarginColor(m.margenPct);
              return (
                <div key={combo.id} className={`bg-zinc-900 border rounded-2xl p-5 ${combo.activa === 1 ? "border-zinc-800" : "border-zinc-800/50 opacity-60"}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{combo.nombre || "Combo sin nombre"}</h3>
                      {combo.fecha_expiracion && <p className="text-xs text-zinc-500 mt-1">Expira: {new Date(combo.fecha_expiracion).toLocaleDateString()}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${combo.activa === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}>
                      {combo.activa === 1 ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-2xl font-black text-orange-400">{formatCurrency(combo.precio_combo)}</span>
                    {m.totalRegular > combo.precio_combo && (
                      <span className="text-sm text-zinc-500 line-through">{formatCurrency(m.totalRegular)}</span>
                    )}
                    {m.ahorroClientePct > 0 && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">-{m.ahorroClientePct.toFixed(0)}%</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {combo.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm text-zinc-400">
                        <span>{item.cantidad}x {item.producto_nombre}</span>
                        <span className="text-zinc-600">{formatCurrency((item.precio_venta || 0) * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className={`w-3.5 h-3.5 ${mc.text}`} />
                    <span className={`text-xs font-semibold ${mc.text}`}>Margen: {formatCurrency(m.margenGanancia)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${mc.bg} ${mc.text}`}>{m.margenPct.toFixed(1)}%</span>
                  </div>

                  <div className="flex gap-1.5 pt-3 border-t border-zinc-800">
                    <button onClick={() => handleCloneCombo(combo)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded-lg text-sm transition-colors" title="Clonar"><Copy className="w-4 h-4 mx-auto" /></button>
                    <button onClick={() => handleEditCombo(combo)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded-lg text-sm transition-colors" title="Editar"><Edit className="w-4 h-4 mx-auto" /></button>
                    <button onClick={() => handleToggleCombo(combo.id)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded-lg text-sm transition-colors" title="Activar/Desactivar"><Power className="w-4 h-4 mx-auto" /></button>
                    <button onClick={() => handleDeleteCombo(combo.id)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-2 rounded-lg text-sm transition-colors" title="Eliminar"><Trash2 className="w-4 h-4 mx-auto" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {combosVigentes.length === 0 && <div className="text-center py-12 text-zinc-500">No hay combos activos</div>}

          {combosExpirados.length > 0 && (
            <div className="mt-8">
              <button onClick={() => setShowExpiradasCombos(!showExpiradasCombos)}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-300 mb-4">
                {showExpiradasCombos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Combos expirados ({combosExpirados.length})
              </button>
              {showExpiradasCombos && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                  {combosExpirados.map((combo) => (
                    <div key={combo.id} className="bg-zinc-900 border border-red-500/20 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold">{combo.nombre || "Combo sin nombre"}</h3>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Expirado</span>
                      </div>
                      <div className="text-xl font-bold text-orange-400/50 mb-3">{formatCurrency(combo.precio_combo)}</div>
                      <div className="flex gap-1.5 pt-3 border-t border-zinc-800">
                        <button onClick={() => handleReactivarCombo(combo.id)} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5" /> Reactivar
                        </button>
                        <button onClick={() => handleDeleteCombo(combo.id)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-2 rounded-lg text-xs transition-colors">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ═══ PROMOCIONES ═══ */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Buscar por producto..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="flex gap-2">
              <a href="/api/promociones-pdf" target="_blank"
                className="bg-zinc-900 text-zinc-400 hover:bg-zinc-800 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />PDF
              </a>
              <a href="/api/promociones-csv" target="_blank"
                className="bg-zinc-900 text-zinc-400 hover:bg-zinc-800 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />CSV
              </a>
              <button onClick={() => { resetPromoForm(); setShowPromoModal(true); }}
                className="bg-orange-500 text-zinc-950 px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />Nueva Promoción
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                placeholder="Buscar promociones por producto..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>

          <div className="space-y-4">
            {promosAgrupadas.filter(([_, { nombre }]) => nombre.toLowerCase().includes(promoSearch.toLowerCase())).map(([prodId, { nombre, promos }]) => (
              <div key={prodId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10"><Package className="w-4 h-4 text-orange-400" /></div>
                    <div>
                      <h3 className="font-semibold">{nombre}</h3>
                      <p className="text-xs text-zinc-500">{promos.length} tramo{promos.length !== 1 ? "s" : ""} de promoción</p>
                    </div>
                  </div>
                  <button onClick={() => { resetPromoForm(); setPromoForm((f) => ({ ...f, producto_id: prodId.toString() })); setShowPromoModal(true); }}
                    className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" />Agregar tramo
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/50 text-xs text-zinc-500 uppercase">
                      <th className="text-left px-6 py-2">Cant. mínima</th>
                      <th className="text-left px-6 py-2">Precio promo</th>
                      <th className="text-center px-6 py-2">Ahorro</th>
                      <th className="text-center px-6 py-2">Estado</th>
                      <th className="text-right px-6 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.sort((a, b) => a.cantidad_minima - b.cantidad_minima).map((promo) => (
                      <tr key={promo.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                        <td className="px-6 py-3 font-medium">{promo.cantidad_minima}+ unidades</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            {promo.precio_original && promo.precio_original > promo.precio_promocional && (
                              <span className="text-xs text-zinc-500 line-through">{formatCurrency(promo.precio_original)}</span>
                            )}
                            <span className="text-orange-400 font-semibold">{formatCurrency(promo.precio_promocional)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {promo.ahorro_pct && promo.ahorro_pct > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              -{promo.ahorro_pct}%
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${promo.activa === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}>
                            {promo.activa === 1 ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => handleEditPromo(promo)} className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleTogglePromo(promo.id)} className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-colors" title="Toggle"><Power className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeletePromo(promo.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {promosAgrupadas.length === 0 && <div className="text-center py-12 text-zinc-500">No hay promociones vigentes</div>}

          {promosExpiradas.length > 0 && (
            <div className="mt-8">
              <button onClick={() => setShowExpiradas(!showExpiradas)}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-300 mb-4">
                {showExpiradas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Promociones expiradas ({promosExpiradas.length})
              </button>
              {showExpiradas && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden opacity-60">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                        <th className="text-left px-6 py-2">Producto</th>
                        <th className="text-left px-6 py-2">Cant. mín</th>
                        <th className="text-left px-6 py-2">Precio</th>
                        <th className="text-center px-6 py-2">Ahorro</th>
                        <th className="text-right px-6 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promosExpiradas.map((p) => (
                        <tr key={p.id} className="border-b border-zinc-800/30">
                          <td className="px-6 py-3">{p.producto_nombre}</td>
                          <td className="px-6 py-3">{p.cantidad_minima}+</td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col">
                              {p.precio_original && p.precio_original > p.precio_promocional && (
                                <span className="text-xs text-zinc-500 line-through">{formatCurrency(p.precio_original)}</span>
                              )}
                              <span className="text-orange-400/50">{formatCurrency(p.precio_promocional)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {p.ahorro_pct && p.ahorro_pct > 0 && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-700 text-zinc-400">
                                -{p.ahorro_pct}%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleReactivarPromo(p.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeletePromo(p.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ COMBO MODAL ═══ */}
      {showComboModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCombo ? (editingCombo.id > 0 ? "Editar Combo" : "Clonar Combo") : "Nuevo Combo"}</h2>
              <button onClick={() => setShowComboModal(false)} className="text-zinc-400 hover:text-zinc-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre del combo</label>
                <input type="text" value={comboForm.nombre} onChange={(e) => setComboForm({ ...comboForm, nombre: e.target.value })}
                  placeholder="Ej: Pack Vuelta al Cole" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Precio del combo</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="number" step="0.01" value={comboForm.precio_combo} onChange={(e) => setComboForm({ ...comboForm, precio_combo: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Vigencia (horas)</label>
                  <input type="number" value={comboForm.fecha_expiracion} onChange={(e) => setComboForm({ ...comboForm, fecha_expiracion: e.target.value })}
                    placeholder="Opcional" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Agregar productos</label>
                <ProductSearch productos={productos} onSelect={addComboItem} placeholder="Buscar y agregar producto..." />
              </div>

              {comboForm.items.length > 0 && (
                <div className="bg-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                        <th className="text-left px-4 py-2">Producto</th>
                        <th className="text-center px-4 py-2 w-24">Cant.</th>
                        <th className="text-right px-4 py-2 w-28">Regular</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {comboForm.items.map((item, index) => {
                        const prod = productos.find((p) => p.id === item.producto_id);
                        return (
                          <tr key={index} className="border-b border-zinc-700/50">
                            <td className="px-4 py-2 text-sm">{prod?.nombre || "—"}</td>
                            <td className="px-4 py-2 text-center">
                              <input type="number" min="1" value={item.cantidad} onChange={(e) => updateComboItem(index, "cantidad", parseInt(e.target.value) || 1)}
                                className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-zinc-400">{formatCurrency((prod?.precio_venta || 0) * item.cantidad)}</td>
                            <td className="px-2 py-2">
                              <button onClick={() => removeComboItem(index)} className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {comboForm.items.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio regular</p>
                      <p className="font-bold text-zinc-300">{formatCurrency(formMetrics.totalRegular)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio oferta</p>
                      <p className="font-bold text-orange-400">{formatCurrency(parseFloat(comboForm.precio_combo) || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ahorro cliente</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-emerald-400">{formatCurrency(formMetrics.ahorroCliente)}</p>
                        {formMetrics.ahorroClientePct > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">{formMetrics.ahorroClientePct.toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Costo estimado</p>
                      <p className="font-bold text-red-400">{formatCurrency(formMetrics.totalCosto)}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ingreso local</p>
                      <p className="font-bold text-orange-400">{formatCurrency(parseFloat(comboForm.precio_combo) || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ganancia bruta</p>
                      {(() => { const mc = getMarginColor(formMetrics.margenPct); return (
                        <div className="flex items-center gap-1.5">
                          <p className={`font-bold ${mc.text}`}>{formatCurrency(formMetrics.margenGanancia)}</p>
                        </div>
                      ); })()}
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Rentabilidad</p>
                      <p className="font-bold text-blue-400">{formMetrics.rentabilidad.toFixed(1)}%</p>
                    </div>
                  </div>
                  {/* Alertas visuales */}
                  {formMetrics.margenPct < 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-red-400 font-medium">Estás perdiendo dinero con este combo</p>
                    </div>
                  )}
                  {formMetrics.margenPct >= 0 && formMetrics.margenPct < 15 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <p className="text-sm text-amber-400 font-medium">Margen bajo ({formMetrics.margenPct.toFixed(1)}%). Considerá ajustar el precio.</p>
                    </div>
                  )}
                  {formMetrics.ahorroClientePct > 40 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-blue-400 font-medium">Ahorro para el cliente muy alto. Podrías ajustar el precio.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="activa" checked={comboForm.activa} onChange={(e) => setComboForm({ ...comboForm, activa: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500" />
                <label htmlFor="activa" className="text-sm text-zinc-400">Combo activo</label>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-2">
              <button onClick={handleSaveCombo} disabled={comboForm.items.length === 0 || !comboForm.precio_combo}
                className="flex-1 bg-orange-500 text-zinc-950 px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {editingCombo && editingCombo.id > 0 ? "Actualizar" : "Guardar"}
              </button>
              <button onClick={() => setShowComboModal(false)} className="flex-1 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-medium hover:bg-zinc-700 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROMO MODAL ═══ */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingPromo ? "Editar Promoción" : "Nueva Promoción"}</h2>
              <button onClick={() => setShowPromoModal(false)} className="text-zinc-400 hover:text-zinc-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Producto</label>
                {editingPromo ? (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-300">
                    {productos.find((p) => p.id === editingPromo.producto_id)?.nombre || `Producto #${editingPromo.producto_id}`}
                  </div>
                ) : (
                  <ProductSearch productos={productos} onSelect={(id) => setPromoForm({ ...promoForm, producto_id: id.toString() })} placeholder="Buscar producto..." />
                )}
                {promoForm.producto_id && !editingPromo && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{productos.find((p) => p.id === parseInt(promoForm.producto_id))?.nombre}</span>
                    <button onClick={() => setPromoForm({ ...promoForm, producto_id: "" })} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cantidad mínima</label>
                  <input type="number" min="1" value={promoForm.cantidad_minima} onChange={(e) => setPromoForm({ ...promoForm, cantidad_minima: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Precio promocional</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="number" step="0.01" value={promoForm.precio_promocional} onChange={(e) => setPromoForm({ ...promoForm, precio_promocional: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Vigencia (horas)</label>
                <input type="number" value={promoForm.fecha_expiracion} onChange={(e) => setPromoForm({ ...promoForm, fecha_expiracion: e.target.value })}
                  placeholder="Opcional" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* ── Simulador Promoción ── */}
              {promoFormMetrics && (
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio unitario original</p>
                      <p className="font-bold text-zinc-300">{formatCurrency(promoFormMetrics.precioOriginal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio unitario promo</p>
                      <p className="font-bold text-orange-400">{formatCurrency(promoFormMetrics.precioUnitarioPromo)}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio regular total</p>
                      <p className="font-bold text-zinc-300">{formatCurrency(promoFormMetrics.totalRegular)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Precio oferta total</p>
                      <p className="font-bold text-orange-400">{formatCurrency(promoFormMetrics.precioOfertaTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ahorro cliente</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-emerald-400">{formatCurrency(promoFormMetrics.ahorroCliente)}</p>
                        {promoFormMetrics.ahorroClientePct > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">{promoFormMetrics.ahorroClientePct.toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Costo estimado</p>
                      <p className="font-bold text-red-400">{formatCurrency(promoFormMetrics.totalCosto)}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ingreso local</p>
                      <p className="font-bold text-orange-400">{formatCurrency(promoFormMetrics.precioOfertaTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Ganancia bruta</p>
                      {(() => { const mc = getMarginColor(promoFormMetrics.margenPct); return (
                        <div className="flex items-center gap-1.5">
                          <p className={`font-bold ${mc.text}`}>{formatCurrency(promoFormMetrics.margenGanancia)}</p>
                        </div>
                      ); })()}
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Rentabilidad</p>
                      <p className="font-bold text-blue-400">{promoFormMetrics.rentabilidad.toFixed(1)}%</p>
                    </div>
                  </div>
                  {/* Alertas visuales */}
                  {promoFormMetrics.margenPct < 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-red-400 font-medium">Estás perdiendo dinero con esta promoción</p>
                    </div>
                  )}
                  {promoFormMetrics.margenPct >= 0 && promoFormMetrics.margenPct < 15 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <p className="text-sm text-amber-400 font-medium">Margen bajo ({promoFormMetrics.margenPct.toFixed(1)}%). Considerá ajustar el precio.</p>
                    </div>
                  )}
                  {promoFormMetrics.ahorroClientePct > 40 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-blue-400 font-medium">Ahorro para el cliente muy alto. Podrías ajustar el precio.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="promoActiva" checked={promoForm.activa} onChange={(e) => setPromoForm({ ...promoForm, activa: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500" />
                <label htmlFor="promoActiva" className="text-sm text-zinc-400">Promoción activa</label>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-2">
              <button onClick={handleSavePromo} disabled={!promoForm.producto_id || !promoForm.cantidad_minima || !promoForm.precio_promocional}
                className="flex-1 bg-orange-500 text-zinc-950 px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {editingPromo ? "Actualizar" : "Guardar"}
              </button>
              <button onClick={() => setShowPromoModal(false)} className="flex-1 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl font-medium hover:bg-zinc-700 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
