"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Plus, Trash2, DollarSign, RefreshCw, Target, Bell, Shield, Users, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";
import { 
  getConfiguracionesAction, 
  actualizarConfiguracionAction, 
  crearConfiguracionAction, 
  eliminarConfiguracionAction,
  inicializarConfiguracionesDefectoAction,
  getObligacionesFijasAction,
  actualizarObligacionFijaAction,
  crearObligacionFijaAction,
  eliminarObligacionFijaAction,
  type ConfiguracionItem,
  type ObligacionFijaItem
} from "@/lib/configActions";

const CATEGORIAS = {
  distribucion: { nombre: "Distribución de Fondos", icon: DollarSign, color: "emerald" },
  ciclo: { nombre: "Ciclo Operativo", icon: RefreshCw, color: "blue" },
  puntos: { nombre: "Puntos de Fidelidad", icon: Target, color: "purple" },
  limites: { nombre: "Límites", icon: Shield, color: "orange" },
  notificaciones: { nombre: "Notificaciones", icon: Bell, color: "yellow" },
  general: { nombre: "General", icon: Settings, color: "zinc" },
};

export default function ConfiguracionesPage() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionItem[]>([]);
  const [obligacionesFijas, setObligacionesFijas] = useState<ObligacionFijaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [nuevaConfig, setNuevaConfig] = useState({ clave: "", valor: "", descripcion: "", categoria: "general", tipo: "texto" });
  const [nuevaObligacion, setNuevaObligacion] = useState({ nombre: "", descripcion: "", monto_estimado: "", vencimiento_dia: "" });
  const [showNuevoForm, setShowNuevoForm] = useState(false);
  const [showNuevaObligacion, setShowNuevaObligacion] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    setLoading(true);
    try {
      const [configs, obligs] = await Promise.all([
        getConfiguracionesAction(),
        getObligacionesFijasAction(),
      ]);
      setConfiguraciones(configs);
      setObligacionesFijas(obligs);
    } catch (error) {
      setToast({ text: "Error al cargar configuraciones", ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleActualizar = async (clave: string, valor: string) => {
    setSaving({ ...saving, [clave]: true });
    try {
      const result = await actualizarConfiguracionAction(clave, valor);
      if (result.success) {
        setToast({ text: "Configuración actualizada", ok: true });
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al actualizar", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    } finally {
      setSaving({ ...saving, [clave]: false });
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await crearConfiguracionAction(nuevaConfig);
      if (result.success) {
        setToast({ text: "Configuración creada", ok: true });
        setNuevaConfig({ clave: "", valor: "", descripcion: "", categoria: "general", tipo: "texto" });
        setShowNuevoForm(false);
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al crear", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    }
  };

  const handleEliminar = async (clave: string) => {
    if (!confirm("¿Eliminar esta configuración?")) return;
    try {
      const result = await eliminarConfiguracionAction(clave);
      if (result.success) {
        setToast({ text: "Configuración eliminada", ok: true });
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al eliminar", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    }
  };

  const handleActualizarObligacion = async (id: number, campo: string, valor: string | number) => {
    setSaving({ ...saving, [`oblig_${id}_${campo}`]: true });
    try {
      const result = await actualizarObligacionFijaAction(id, { [campo]: valor });
      if (result.success) {
        setToast({ text: "Obligación actualizada", ok: true });
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al actualizar", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    } finally {
      setSaving({ ...saving, [`oblig_${id}_${campo}`]: false });
    }
  };

  const handleCrearObligacion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await crearObligacionFijaAction({
        nombre: nuevaObligacion.nombre,
        descripcion: nuevaObligacion.descripcion,
        monto_estimado: parseFloat(nuevaObligacion.monto_estimado),
        vencimiento_dia: parseInt(nuevaObligacion.vencimiento_dia),
      });
      if (result.success) {
        setToast({ text: "Obligación creada", ok: true });
        setNuevaObligacion({ nombre: "", descripcion: "", monto_estimado: "", vencimiento_dia: "" });
        setShowNuevaObligacion(false);
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al crear", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    }
  };

  const handleEliminarObligacion = async (id: number) => {
    if (!confirm("¿Eliminar esta obligación?")) return;
    try {
      const result = await eliminarObligacionFijaAction(id);
      if (result.success) {
        setToast({ text: "Obligación eliminada", ok: true });
        await cargarConfiguraciones();
      } else {
        setToast({ text: result.error || "Error al eliminar", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    }
  };

  const handleInicializarDefecto = async () => {
    try {
      const result = await inicializarConfiguracionesDefectoAction();
      if (result.success) {
        setToast({ text: "Configuraciones por defecto inicializadas", ok: true });
        await cargarConfiguraciones();
      } else {
        setToast({ text: "Error al inicializar", ok: false });
      }
    } catch (error) {
      setToast({ text: "Error de conexión", ok: false });
    }
  };

  // Agrupar por categoría
  const agrupadas = configuraciones.reduce((acc, config) => {
    const cat = config.categoria || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(config);
    return acc;
  }, {} as Record<string, ConfiguracionItem[]>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuraciones</h1>
          <p className="text-zinc-400 mt-2">Gestiona los parámetros del sistema</p>
        </div>
        <button
          onClick={handleInicializarDefecto}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Inicializar Defecto
        </button>
      </div>

      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          toast.ok ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Cargando configuraciones...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORIAS).map(([catKey, catInfo]) => {
            const configs = agrupadas[catKey] || [];
            if (configs.length === 0 && !showNuevoForm) return null;

            const Icon = catInfo.icon;
            const colorClass = `bg-${catInfo.color}-500/15 text-${catInfo.color}-500`;

            return (
              <div key={catKey} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold">{catInfo.nombre}</h2>
                </div>

                <div className="space-y-3">
                  {configs.map((config) => (
                    <div key={config.id} className="flex items-center gap-4 p-4 bg-zinc-950 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-200">{config.descripcion || config.clave}</p>
                        <p className="text-xs text-zinc-500 font-mono">{config.clave}</p>
                      </div>
                      <div className="flex-1">
                        {config.tipo === "numero" ? (
                          <input
                            type="number"
                            step="0.01"
                            value={config.valor}
                            onChange={(e) => handleActualizar(config.clave, e.target.value)}
                            disabled={saving[config.clave]}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        ) : config.tipo === "booleano" ? (
                          <select
                            value={config.valor}
                            onChange={(e) => handleActualizar(config.clave, e.target.value)}
                            disabled={saving[config.clave]}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          >
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={config.valor}
                            onChange={(e) => handleActualizar(config.clave, e.target.value)}
                            disabled={saving[config.clave]}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        )}
                      </div>
                      {config.tipo === "numero" && !isNaN(parseFloat(config.valor)) && (
                        <span className="text-zinc-400 text-sm w-24 text-right">
                          {formatCurrency(parseFloat(config.valor))}
                        </span>
                      )}
                      <button
                        onClick={() => handleEliminar(config.clave)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Nueva configuración */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <button
              onClick={() => setShowNuevoForm(!showNuevoForm)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {showNuevoForm ? "Cancelar" : "Nueva Configuración"}
            </button>

            {showNuevoForm && (
              <form onSubmit={handleCrear} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Clave</label>
                    <input
                      type="text"
                      value={nuevaConfig.clave}
                      onChange={(e) => setNuevaConfig({ ...nuevaConfig, clave: e.target.value })}
                      placeholder="ej: porcentaje_reinversion"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Valor</label>
                    <input
                      type="text"
                      value={nuevaConfig.valor}
                      onChange={(e) => setNuevaConfig({ ...nuevaConfig, valor: e.target.value })}
                      placeholder="Valor de la configuración"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={nuevaConfig.descripcion}
                    onChange={(e) => setNuevaConfig({ ...nuevaConfig, descripcion: e.target.value })}
                    placeholder="Descripción de la configuración"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Categoría</label>
                    <select
                      value={nuevaConfig.categoria}
                      onChange={(e) => setNuevaConfig({ ...nuevaConfig, categoria: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    >
                      {Object.keys(CATEGORIAS).map(cat => (
                        <option key={cat} value={cat}>{CATEGORIAS[cat as keyof typeof CATEGORIAS].nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                    <select
                      value={nuevaConfig.tipo}
                      onChange={(e) => setNuevaConfig({ ...nuevaConfig, tipo: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="texto">Texto</option>
                      <option value="numero">Número</option>
                      <option value="booleano">Booleano</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </button>
              </form>
            )}
          </div>

          {/* Obligaciones Fijas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/15 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
                <h2 className="text-lg font-bold">Obligaciones Fijas del Ciclo</h2>
              </div>
              <button
                onClick={() => setShowNuevaObligacion(!showNuevaObligacion)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {showNuevaObligacion ? "Cancelar" : "Nueva Obligación"}
              </button>
            </div>

            {showNuevaObligacion && (
              <form onSubmit={handleCrearObligacion} className="mt-4 p-4 bg-zinc-950 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre</label>
                    <input
                      type="text"
                      value={nuevaObligacion.nombre}
                      onChange={(e) => setNuevaObligacion({ ...nuevaObligacion, nombre: e.target.value })}
                      placeholder="ej: Alquiler"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Día de vencimiento</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={nuevaObligacion.vencimiento_dia}
                      onChange={(e) => setNuevaObligacion({ ...nuevaObligacion, vencimiento_dia: e.target.value })}
                      placeholder="ej: 10"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={nuevaObligacion.descripcion}
                    onChange={(e) => setNuevaObligacion({ ...nuevaObligacion, descripcion: e.target.value })}
                    placeholder="Descripción opcional"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Monto estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nuevaObligacion.monto_estimado}
                    onChange={(e) => setNuevaObligacion({ ...nuevaObligacion, monto_estimado: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Obligación
                </button>
              </form>
            )}

            <div className="mt-4 space-y-3">
              {obligacionesFijas.map((oblig) => (
                <div key={oblig.id} className={`flex items-center gap-4 p-4 rounded-lg border ${
                  oblig.activa === 1 ? "bg-zinc-950 border-zinc-800" : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
                }`}>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={oblig.nombre || ""}
                      onChange={(e) => handleActualizarObligacion(oblig.id, "nombre", e.target.value)}
                      disabled={saving[`oblig_${oblig.id}_nombre`]}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 font-medium focus:outline-none focus:border-emerald-500/50"
                    />
                    {oblig.descripcion && (
                      <input
                        type="text"
                        value={oblig.descripcion}
                        onChange={(e) => handleActualizarObligacion(oblig.id, "descripcion", e.target.value)}
                        disabled={saving[`oblig_${oblig.id}_descripcion`]}
                        className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    )}
                  </div>
                  <div className="w-32">
                    <label className="text-[10px] text-zinc-500 block mb-1">Vence día</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={oblig.vencimiento_dia || ""}
                      onChange={(e) => handleActualizarObligacion(oblig.id, "vencimiento_dia", parseInt(e.target.value))}
                      disabled={saving[`oblig_${oblig.id}_vencimiento_dia`]}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-center focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-[10px] text-zinc-500 block mb-1">Monto estimado</label>
                    <input
                      type="number"
                      step="0.01"
                      value={oblig.monto_estimado || ""}
                      onChange={(e) => handleActualizarObligacion(oblig.id, "monto_estimado", parseFloat(e.target.value))}
                      disabled={saving[`oblig_${oblig.id}_monto_estimado`]}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-right focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleActualizarObligacion(oblig.id, "activa", oblig.activa === 1 ? 0 : 1)}
                      className={`p-2 rounded-lg transition-colors ${
                        oblig.activa === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                      }`}
                      title={oblig.activa === 1 ? "Desactivar" : "Activar"}
                    >
                      {oblig.activa === 1 ? "✓" : "○"}
                    </button>
                    <button
                      onClick={() => handleEliminarObligacion(oblig.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {obligacionesFijas.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  No hay obligaciones fijas configuradas
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
