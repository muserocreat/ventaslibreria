import { db } from "@/db";
import { productos } from "@/db/schema";
import { and, like, or, asc, count } from "drizzle-orm";
import { 
  Search, 
  Edit2, 
  Plus,
  PackageSearch
} from "lucide-react";
import { formatCurrency } from "@/lib/formatter";
import Link from "next/link";
import { ProductActions } from "@/components/ProductActions";

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";
  const currentPage = parseInt(resolvedParams.page || "1");
  const itemsPerPage = 50;
  const offset = (currentPage - 1) * itemsPerPage;
  
  // Lógica de búsqueda flexible (AND multi-palabra)
  const words = query.trim().split(/\s+/).filter(Boolean);
  const conditions = words.map(word => 
    or(
      like(productos.tipo, `%${word}%`),
      like(productos.marca, `%${word}%`),
      like(productos.descripcion, `%${word}%`),
      like(productos.codigo_barras, `%${word}%`),
      like(productos.familia, `%${word}%`),
      like(productos.rubro, `%${word}%`)
    )
  );

  // Obtener el total de registros para paginación
  const totalCount = await db.select({ count: count() })
    .from(productos)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const data = await db.select()
    .from(productos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(productos.tipo), asc(productos.marca))
    .limit(itemsPerPage)
    .offset(offset);

  const totalPages = Math.ceil(totalCount[0].count / itemsPerPage);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario de Productos</h1>
          <p className="text-zinc-400">Gestión de stock, precios y catálogo.</p>
        </div>
        <Link 
          href="/productos/create"
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800">
          <form method="GET" className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Buscar por código, nombre o marca..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Nombre / Descripción</th>
                <th className="px-6 py-4">Precio (Minorista)</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-600">
                      <PackageSearch className="w-12 h-12 opacity-20" />
                      <p className="font-medium">No se encontraron productos que coincidan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className={`hover:bg-zinc-800/30 transition-colors group ${item.activo === 0 ? 'opacity-40' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                        {item.codigo_barras || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">
                          {item.tipo} {item.marca}
                        </span>
                        {item.activo === 0 && (
                          <span className="text-[10px] font-bold uppercase bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">Anulado</span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {item.descripcion}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-500">
                      {formatCurrency(item.precio_venta_minorista || 0)}
                    </td>
                    <td className="px-6 py-4 relative">
                      <div className="flex items-center justify-center gap-4 relative z-10 pointer-events-auto">
                        <Link 
                          href={`/productos/${item.id}/edit`}
                          className="p-2 rounded-lg text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all shadow-sm border border-transparent hover:border-emerald-500/20" 
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <ProductActions 
                          productId={Number(item.id)} 
                          productName={`${item.tipo} ${item.marca}`} 
                          isActive={item.activo} 
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                Mostrando {data.length} de {totalCount[0].count} productos
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link 
                    href={`/productos?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all text-sm"
                  >
                    Anterior
                  </Link>
                )}
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Link
                        key={pageNum}
                        href={`/productos?q=${encodeURIComponent(query)}&page=${pageNum}`}
                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                          pageNum === currentPage
                            ? "bg-emerald-500 text-zinc-950 font-bold"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>
                
                {currentPage < totalPages && (
                  <Link 
                    href={`/productos?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all text-sm"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
