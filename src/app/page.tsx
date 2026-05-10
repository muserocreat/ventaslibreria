import { db } from '@/db';
import { productos, clientes, ventas } from '@/db/schema';
import { count, sql } from 'drizzle-orm';
import { Users, TrendingUp, Package, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/formatter';
import { POS } from '@/components/POS';
import { getProductosByIdsAction } from '@/lib/ventaActions';

const QUICK_PRODUCT_IDS = [192, 266];

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [productCount] = await db.select({ value: count() }).from(productos);
  const [puntosTotal] = await db.select({ value: sql<number>`COALESCE(SUM(puntos), 0)` }).from(clientes);
  const [clienteCount] = await db.select({ value: count() }).from(clientes);
  const [ventasMes]    = await db.select({
    value: sql<number>`COALESCE(SUM(${ventas.total}), 0)`,
  }).from(ventas).where(sql`date(${ventas.fecha}) >= date('now', 'start of month')`);
  const quickProducts = await getProductosByIdsAction(QUICK_PRODUCT_IDS);

  const stats = [
    { name: 'Productos Totales',    value: productCount.value,            icon: Package,    color: 'text-blue-500' },
    { name: 'Puntos Otorgados',     value: puntosTotal.value || 0,        icon: Star,       color: 'text-amber-400' },
    { name: 'Clientes Registrados', value: clienteCount.value,            icon: Users,      color: 'text-purple-500' },
    { name: 'Ventas este Mes',      value: formatCurrency(ventasMes.value || 0), icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Libreria Dashboard</h1>
        <p className="text-zinc-400">Migración en progreso desde el sistema Panel.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Actual</span>
            </div>
            <p className="text-sm font-medium text-zinc-400">{stat.name}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <POS quickProducts={quickProducts} />
    </div>
  );
}
