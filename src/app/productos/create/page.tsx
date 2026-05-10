import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/ProductForm";

export default function CreateProductoPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/productos" 
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
          <p className="text-zinc-400">Agregar un nuevo producto al inventario</p>
        </div>
      </div>

      <ProductForm isEdit={false} />
    </div>
  );
}
