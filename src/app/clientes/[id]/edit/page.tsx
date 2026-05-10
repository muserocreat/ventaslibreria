import { db } from "@/db";
import { clientes, cuentas_corrientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, CreditCard } from "lucide-react";
import Link from "next/link";
import { ClienteForm } from "@/components/ClienteForm";
import { ClienteActions } from "@/components/ClienteActions";
import { formatCurrency } from "@/lib/formatter";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClientePage({ params }: Props) {
  const id = parseInt((await params).id);
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));

  if (!cliente) notFound();

  const [cuenta] = await db
    .select()
    .from(cuentas_corrientes)
    .where(eq(cuentas_corrientes.cliente_id, id));

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/clientes"
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-zinc-400">Modificando: {cliente.nombre}</p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Puntos</p>
            <p className="text-xl font-bold text-zinc-100">{cliente.puntos ?? 0}</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Cta. Corriente</p>
            <p className={`text-xl font-bold ${(cuenta?.saldo_actual ?? 0) < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatCurrency(cuenta?.saldo_actual ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <ClienteForm cliente={cliente} isEdit={true} />

      {/* Zona de peligro */}
      <div className="mt-10 pt-8 border-t border-zinc-900">
        <h3 className="text-red-500/50 text-sm font-bold uppercase tracking-wider mb-4">Zona de Peligro</h3>
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-zinc-100 font-bold">Eliminar Cliente</h4>
            <p className="text-zinc-500 text-sm">Esta acción es irreversible si no tiene ventas asociadas.</p>
          </div>
          <ClienteActions clienteId={cliente.id} clienteNombre={cliente.nombre} />
        </div>
      </div>
    </div>
  );
}
