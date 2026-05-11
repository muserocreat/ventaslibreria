import { db } from "@/db";
import { clientes, cuentas_corrientes, movimientos_cuenta_corriente } from "@/db/schema";
import { eq, sql, desc, like, or } from "drizzle-orm";
import { Search, Plus, Eye, AlertTriangle, TrendingUp, TrendingDown, UserRound } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatter";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function CuentasCorrientesPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = resolved.q || "";
  const currentPage = parseInt(resolved.page || "1");
  const itemsPerPage = 20;
  const offset = (currentPage - 1) * itemsPerPage;

  // Obtener clientes con información de cuenta corriente
  const clientesConCC = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      barrio: clientes.barrio,
      limite_credito: clientes.limite_credito,
      bloqueado_cc: clientes.bloqueado_cc,
      saldo_actual: sql<number>`COALESCE(${cuentas_corrientes.saldo_actual}, 0)`,
      fecha_ultimo_movimiento: cuentas_corrientes.fecha_ultimo_movimiento,
    })
    .from(clientes)
    .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
    .where(
      query.trim()
        ? or(
            like(clientes.nombre, `%${query}%`),
            like(clientes.telefono, `%${query}%`),
            like(clientes.barrio, `%${query}%`)
          )
        : undefined
    )
    .orderBy(desc(cuentas_corrientes.fecha_ultimo_movimiento))
    .limit(itemsPerPage)
    .offset(offset);

  // Obtener total para paginación
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clientes)
    .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
    .where(
      query.trim()
        ? or(
            like(clientes.nombre, `%${query}%`),
            like(clientes.telefono, `%${query}%`),
            like(clientes.barrio, `%${query}%`)
          )
        : undefined
    );

  const totalPages = Math.ceil((totalCountResult[0]?.count || 0) / itemsPerPage);

  // Calcular estadísticas
  const stats = await db
    .select({
      total_deuda: sql<number>`SUM(CASE WHEN ${cuentas_corrientes.saldo_actual} > 0 THEN ${cuentas_corrientes.saldo_actual} ELSE 0 END)`,
      total_favor: sql<number>`SUM(CASE WHEN ${cuentas_corrientes.saldo_actual} < 0 THEN ABS(${cuentas_corrientes.saldo_actual}) ELSE 0 END)`,
      clientes_deudores: sql<number>`COUNT(CASE WHEN ${cuentas_corrientes.saldo_actual} > 0 THEN 1 END)`,
      clientes_acreedores: sql<number>`COUNT(CASE WHEN ${cuentas_corrientes.saldo_actual} < 0 THEN 1 END)`,
    })
    .from(cuentas_corrientes);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cuentas Corrientes</h1>
            <p className="text-zinc-400">Gestión de saldos deudores y acreedores</p>
          </div>
          <Link
            href="/clientes/create"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Link>
        </div>
      </header>

      {/* Estadísticas */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-red-400" />
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Saldo Deudor</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(stats[0]?.total_deuda || 0)}</p>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 text-green-400" />
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Saldo a Favor</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(stats[0]?.total_favor || 0)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <UserRound className="w-8 h-8 text-orange-400" />
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Activos</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Clientes Deudores</p>
          <p className="text-2xl font-bold text-orange-400">{stats[0]?.clientes_deudores || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <UserRound className="w-8 h-8 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Activos</span>
          </div>
          <p className="text-sm font-medium text-zinc-400">Clientes Acreedores</p>
          <p className="text-2xl font-bold text-emerald-400">{stats[0]?.clientes_acreedores || 0}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            name="q"
            placeholder="Buscar por nombre, teléfono o barrio..."
            defaultValue={query}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-11 pr-11 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-zinc-800 text-xs text-zinc-500 font-bold uppercase tracking-wider">
          {clientesConCC.length} cliente{clientesConCC.length !== 1 ? "s" : ""}
        </div>
        <div className="divide-y divide-zinc-800/60">
          {clientesConCC.map((cliente) => {
            const saldo = cliente.saldo_actual || 0;
            const limite = cliente.limite_credito || 10000;
            const disponible = limite - saldo;
            const porcentajeUsado = (saldo / limite) * 100;
            
            return (
              <div
                key={cliente.id}
                className="px-4 py-3 hover:bg-zinc-800/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{cliente.nombre}</p>
                        <p className="text-xs text-zinc-500">{cliente.telefono} · {cliente.barrio}</p>
                      </div>
                      {cliente.bloqueado_cc ? (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                          Bloqueado
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Saldo</p>
                      <p className={`text-sm font-bold ${
                        saldo > 0 ? 'text-red-400' : saldo < 0 ? 'text-green-400' : 'text-zinc-300'
                      }`}>
                        {formatCurrency(saldo)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Límite</p>
                      <p className="text-sm font-bold text-zinc-300">{formatCurrency(limite)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Disponible</p>
                      <p className={`text-sm font-bold ${
                        disponible > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(disponible)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Barra de progreso */}
                      <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            porcentajeUsado > 90 ? 'bg-red-500' : 
                            porcentajeUsado > 70 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
                        />
                      </div>
                      {porcentajeUsado > 90 && (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <Link
                      href={`/cuentas-corrientes/${cliente.id}`}
                      className="p-2 text-zinc-400 hover:text-orange-400 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={`?page=${page}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-orange-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {page}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
