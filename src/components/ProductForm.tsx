"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, createProduct } from "@/lib/actions";
import { getVariantesByProductoAction } from "@/lib/productActions";
import { 
  Save, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Layers
} from "lucide-react";

interface ProductFormProps {
  product?: {
    id: number;
    tipo: string | null;
    marca: string | null;
    descripcion: string | null;
    precio_costo: number | null;
    precio_venta_minorista: number | null;
    precio_venta_mayorista: number | null;
    stock: number | null;
    codigo_barras: string | null;
    familia: string | null;
    rubro: string | null;
  };
  isEdit?: boolean;
}

type Variante = {
  id?: number;
  nombre: string;
  precio_venta: number | null;
  stock: number;
  codigo_barras: string | null;
};

export function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);

  useEffect(() => {
    if (isEdit && product) {
      getVariantesByProductoAction(product.id).then(setVariantes);
    }
  }, [isEdit, product]);

  const addVariante = () => {
    setVariantes([...variantes, { nombre: "", precio_venta: null, stock: 0, codigo_barras: "" }]);
  };

  const removeVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index));
  };

  const updateVariante = (index: number, field: keyof Variante, value: any) => {
    const newVariantes = [...variantes];
    newVariantes[index] = { ...newVariantes[index], [field]: value };
    setVariantes(newVariantes);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);

    // Añadir variantes como JSON
    formData.append("variantes", JSON.stringify(variantes));

    try {
      let result;
      if (isEdit && product) {
        result = await updateProduct(product.id, formData);
      } else {
        result = await createProduct(formData);
      }

      if (result.success) {
        setMessage(result.message || "Operación exitosa");
        setTimeout(() => {
          router.push("/productos");
        }, 1500);
      } else {
        setMessage(result.error || "Error en la operación");
      }
    } catch {
      setMessage("Error de conexión al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-8"
      >
        {/* Sección: Información Básica */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-emerald-500 rounded" />
            <h2 className="text-lg font-semibold text-zinc-100">Información Básica</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="tipo"
                defaultValue={product?.tipo ?? ''}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="Ej: Cuaderno, Lapicera, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Marca <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="marca"
                defaultValue={product?.marca ?? ''}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="Ej: Bic, Faber-Castell, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Código de Barras
              </label>
              <input 
                type="text" 
                name="codigo_barras"
                defaultValue={product?.codigo_barras ?? ''}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                placeholder="Ej: 7791234567890"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Familia
              </label>
              <input 
                type="text" 
                name="familia"
                defaultValue={product?.familia ?? ''}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="Ej: Papelería, Artículos de oficina"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descripción
              </label>
              <textarea 
                name="descripcion"
                defaultValue={product?.descripcion ?? ''}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                placeholder="Descripción detallada del producto"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Rubro
              </label>
              <input 
                type="text" 
                name="rubro"
                defaultValue={product?.rubro ?? ''}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="Ej: Librería, Escolar"
              />
            </div>
          </div>
        </section>

        {/* Sección: Variantes */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-zinc-100">Variantes</h2>
            </div>
            <button 
              type="button" 
              onClick={addVariante}
              className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-2 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Variante
            </button>
          </div>

          <div className="space-y-4">
            {variantes.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-500 text-sm italic">No hay variantes definidas para este producto.</p>
              </div>
            ) : (
              variantes.map((v, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 relative group animate-in fade-in slide-in-from-left-2">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Nombre / Atributo</label>
                    <input 
                      type="text" 
                      value={v.nombre}
                      onChange={(e) => updateVariante(index, "nombre", e.target.value)}
                      placeholder="Ej: Rojo, 100ml, XL..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Precio (Opcional)</label>
                    <input 
                      type="number" 
                      value={v.precio_venta ?? ''}
                      onChange={(e) => updateVariante(index, "precio_venta", parseFloat(e.target.value) || null)}
                      placeholder="Usa base"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Stock</label>
                    <input 
                      type="number" 
                      value={v.stock}
                      onChange={(e) => updateVariante(index, "stock", parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="button" 
                      onClick={() => removeVariante(index)}
                      className="w-full bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg py-2 hover:bg-red-500/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Sección: Precios */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-blue-500 rounded" />
            <h2 className="text-lg font-semibold text-zinc-100">Precios Base</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Precio Costo
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input 
                  type="number" 
                  name="precio_costo"
                  step="any"
                  min="0"
                  defaultValue={product?.precio_costo?.toString() ?? ''}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Precio Venta Minorista <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input 
                  type="number" 
                  name="precio_venta_minorista"
                  step="any"
                  min="0.01"
                  required
                  defaultValue={product?.precio_venta_minorista?.toString() ?? ''}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Precio Venta Mayorista
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input 
                  type="number" 
                  name="precio_venta_mayorista"
                  step="any"
                  min="0"
                  defaultValue={product?.precio_venta_mayorista?.toString() ?? ''}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sección: Stock */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-purple-500 rounded" />
            <h2 className="text-lg font-semibold text-zinc-100">Inventario Base</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Stock Total
              </label>
              <input 
                type="number" 
                name="stock"
                min="0"
                defaultValue={product?.stock?.toString() ?? ''}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="0"
              />
              <p className="text-[10px] text-zinc-500 mt-2 italic">Nota: Si usas variantes, el stock se puede manejar por separado.</p>
            </div>
          </div>
        </section>

        {/* Botones de Acción */}
        <div className="flex items-center gap-4 justify-end">
          <button 
            type="button"
            onClick={() => router.push("/productos")}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Mensaje Emergente */}
      {message && (
        <div className={`fixed bottom-4 right-4 z-[9999] bg-zinc-950 border rounded-2xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-right ${
          message.includes('correctamente') 
            ? 'border-emerald-500/50 shadow-emerald-500/10' 
            : 'border-orange-500/50 shadow-orange-500/10'
        }`}>
          <div className="flex items-start gap-3">
            {message.includes('correctamente') ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            )}
            <div>
              <p className="text-sm text-zinc-200 font-medium leading-relaxed">{message}</p>
              <button onClick={() => setMessage(null)} className="text-xs text-zinc-500 hover:text-zinc-100 mt-2 font-bold uppercase tracking-wider">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

