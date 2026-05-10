import { db } from "@/db";
import { clientes } from "@/db/schema";
import { and, like, or, asc, count } from "drizzle-orm";
import { Search, Plus, Edit2, UserRound, PackageSearch } from "lucide-react";
import Link from "next/link";
import { ClienteActions } from "@/components/ClienteActions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const NIVEL_COLORS: Record<string, string> = {
  Bronce: "bg-amber-700/20 text-amber-500",
  Plata:  "bg-zinc-400/20 text-zinc-300",
  Oro:    "bg-yellow-500/20 text-yellow-400",
  Diamante: "bg-cyan-500/20 text-cyan-400",
};

export default async function ClientesPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = resolved.q || "";
  const currentPage = parseInt(resolved.page || "1");
  const itemsPerPage = 50;
  const offset = (currentPage - 1) * itemsPerPage;

  const words = query.trim().split(/\s+/).filter(Boolean);
  const conditions = words.map((word) =>
    or(
      like(clientes.nombre, `%${word}%`),
      like(clientes.dni, `%${word}%`),
      like(clientes.telefono, `%${word}%`),
      like(clientes.barrio, `%${word}%`)
    )
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(clientes)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const data = await db
    .select()
    .from(clientes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(clientes.nombre))
    .limit(itemsPerPage)
    .offset(offset);

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-zinc-400">Gestión del padrón de clientes.</p>
        </div>
        <Link
          href="/clientes/create"
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Buscador */}
        <div className="p-4 border-b border-zinc-800">
          <form method="GET" className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, DNI, teléfono o barrio..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium"
            />
          </form>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">DNI</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4">Barrio</th>
                <th className="px-6 py-4 text-center">Nivel</th>
                <th className="px-6 py-4 text-center">Pts</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-600">
                      <PackageSearch className="w-12 h-12 opacity-20" />
                      <p className="font-medium">No se encontraron clientes.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center shrink-0">
                          <UserRound className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{item.nombre}</p>
                          {item.descuento_activo === 1 && (
                            <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                              Descuento activo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-zinc-400">{item.dni}</td>
                    <td className="px-6 py-4 text-zinc-300">{item.telefono}</td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">{item.barrio}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${NIVEL_COLORS[item.nivel ?? "Bronce"] ?? NIVEL_COLORS.Bronce}`}>
                        {item.nivel ?? "Bronce"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-zinc-300">{item.puntos ?? 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/clientes/${item.id}/edit`}
                          className="p-2 rounded-lg text-zinc-500 hover:bg-purple-500/10 hover:text-purple-400 transition-all border border-transparent hover:border-purple-500/20"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <ClienteActions
                          clienteId={item.id}
                          clienteNombre={item.nombre}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                Mostrando {data.length} de {total} clientes
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/clientes?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm transition-all"
                  >
                    Anterior
                  </Link>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                    else p = currentPage - 2 + i;
                    return (
                      <Link
                        key={p}
                        href={`/clientes?q=${encodeURIComponent(query)}&page=${p}`}
                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                          p === currentPage
                            ? "bg-purple-500 text-white font-bold"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>
                {currentPage < totalPages && (
                  <Link
                    href={`/clientes?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm transition-all"
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
