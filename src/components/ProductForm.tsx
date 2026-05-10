"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, createProduct } from "@/lib/actions";
import { 
  Save, 
  AlertTriangle,
  CheckCircle
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

export function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);

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

        {/* Sección: Precios */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-blue-500 rounded" />
            <h2 className="text-lg font-semibold text-zinc-100">Precios</h2>
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
            <h2 className="text-lg font-semibold text-zinc-100">Inventario</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Stock
              </label>
              <input 
                type="number" 
                name="stock"
                min="0"
                defaultValue={product?.stock?.toString() ?? ''}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="0"
              />
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
