import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClienteForm } from "@/components/ClienteForm";

export default function CreateClientePage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-zinc-400">Agregar un cliente al padrón</p>
        </div>
      </div>

      <ClienteForm isEdit={false} />
    </div>
  );
}
