import { db } from "@/db";
import { ventas, clientes } from "@/db/schema";
import { and, like, eq, sql, count, desc, type SQL } from "drizzle-orm";
import { Search, TrendingUp, ShoppingCart, Banknote, CreditCard, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatter";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; page?: string; metodo?: string; periodo?: string }>;
}

const METODO_COLORS: Record<string, string> = {
  Efectivo: "bg-emerald-500/15 text-emerald-400",
  Transferencia: "bg-blue-500/15 text-blue-400",
  Tarjeta: "bg-purple-500/15 text-purple-400",
  "Cuenta Corriente": "bg-orange-500/15 text-orange-400",
};

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "todo", label: "Todo" },
];

function periodoWhere(periodo: string): SQL | undefined {
  switch (periodo) {
    case "hoy":
      return sql`date(${ventas.fecha}) = date('now', 'localtime')`;
    case "semana":
      return sql`date(${ventas.fecha}) >= date('now', 'localtime', '-7 days')`;
    case "mes":
      return sql`date(${ventas.fecha}) >= date('now', 'localtime', 'start of month')`;
    default:
      return undefined;
  }
}

export default async function VentasPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = resolved.q || "";
  const metodo = resolved.metodo || "";
  const periodo = resolved.periodo || "hoy";
  const currentPage = parseInt(resolved.page || "1");
  const itemsPerPage = 50;
  const offset = (currentPage - 1) * itemsPerPage;

  const periodoCondition = periodoWhere(periodo);
  const whereConditions: SQL[] = [];

  if (metodo) whereConditions.push(eq(ventas.metodo_pago, metodo));
  if (periodoCondition) whereConditions.push(periodoCondition);
  if (query.trim()) whereConditions.push(like(clientes.nombre, `%${query.trim()}%`));

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.cliente_id, clientes.id))
    .where(whereClause);

  const data = await db
    .select({
      id: ventas.id,
      total: ventas.total,
      fecha: ventas.fecha,
      metodo_pago: ventas.metodo_pago,
      descuento: ventas.descuento,
      cliente_id: ventas.cliente_id,
      nombre: clientes.nombre,
    })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.cliente_id, clientes.id))
    .where(whereClause)
    .orderBy(desc(ventas.fecha))
    .limit(itemsPerPage)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const [stats] = await db
    .select({
      cantidad: count(),
      monto: sql<number>`COALESCE(SUM(${ventas.total}), 0)`,
    })
    .from(ventas)
    .where(periodoCondition);

  const [historico] = await db.select({ total: count() }).from(ventas);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = { q: query, metodo, periodo, ...overrides };
    const qs = Object.entries(p)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    return `/ventas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
        <p className="text-zinc-400">Historial y análisis de ventas.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full uppercase font-bold">
              {PERIODOS.find((p) => p.value === periodo)?.label}
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Cantidad</p>
          <p className="text-2xl font-bold text-zinc-100">{stats.cantidad}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Recaudado</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.monto)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Banknote className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Ticket promedio</p>
          <p className="text-2xl font-bold text-zinc-100">
            {stats.cantidad > 0 ? formatCurrency(stats.monto / stats.cantidad) : "$0"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Total histórico</p>
          <p className="text-2xl font-bold text-zinc-100">{historico.total}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-3">
          <form method="GET" className="relative group flex-1">
            <input type="hidden" name="metodo" value={metodo} />
            <input type="hidden" name="periodo" value={periodo} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por cliente..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm"
            />
          </form>

          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <Link
                key={p.value}
                href={buildUrl({ periodo: p.value, page: "1" })}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                  periodo === p.value
                    ? "bg-orange-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-1.5">
            {["", "Efectivo", "Transferencia", "Tarjeta", "Cuenta Corriente"].map((m) => (
              <Link
                key={m || "todos"}
                href={buildUrl({ metodo: m, page: "1" })}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  metodo === m
                    ? "bg-zinc-100 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {m || "Todos"}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 font-medium">
                    No se encontraron ventas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                data.map((v) => {
                  const fechaDate = v.fecha ? new Date(v.fecha) : null;
                  const fechaStr = fechaDate
                    ? fechaDate.toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";

                  return (
                    <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          #{v.id}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-zinc-400">{fechaStr}</td>
                      <td className="px-6 py-3 font-medium text-zinc-200">
                        {v.nombre ?? "Cliente Anónimo"}
                      </td>
                      <td className="px-6 py-3">
                        {v.metodo_pago ? (
                          <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${METODO_COLORS[v.metodo_pago] ?? "bg-zinc-700 text-zinc-300"}`}>
                            {v.metodo_pago}
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">
                        {formatCurrency(v.total)}
                        {(v.descuento ?? 0) > 0 && (
                          <span className="ml-1 text-[10px] text-orange-400 font-normal">
                            (-{formatCurrency(v.descuento ?? 0)})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Link
                          href={`/ventas/${v.id}`}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400 transition-all border border-transparent hover:border-orange-500/20"
                          title="Ver detalle"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Mostrando {data.length} de {totalCount} ventas
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={buildUrl({ page: String(currentPage - 1) })}
                  className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm"
                >
                  Anterior
                </Link>
              )}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (currentPage <= 3) p = i + 1;
                  else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = currentPage - 2 + i;

                  return (
                    <Link
                      key={p}
                      href={buildUrl({ page: String(p) })}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        p === currentPage
                          ? "bg-orange-500 text-zinc-950 font-bold"
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
                  href={buildUrl({ page: String(currentPage + 1) })}
                  className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
