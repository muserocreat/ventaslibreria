import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/ProductForm";
import { ProductActions } from "@/components/ProductActions";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductoPage({ params }: Props) {
  const id = parseInt((await params).id);
  const [product] = await db.select().from(productos).where(eq(productos.id, id));

  if (!product) {
    notFound();
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-zinc-400">Modificando: {product.tipo} {product.marca} {product.descripcion}</p>
        </div>
      </div>

      <ProductForm product={product} isEdit={true} />

      {/* Acciones de Peligro */}
      <div className="mt-12 pt-8 border-t border-zinc-900">
        <h3 className="text-red-500/50 text-sm font-bold uppercase tracking-wider mb-4">Zona de Peligro</h3>
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-zinc-100 font-bold">Eliminar o Anular Producto</h4>
            <p className="text-zinc-500 text-sm">Esta acción puede ser irreversible si se elimina el producto permanentemente.</p>
          </div>
          <div className="flex gap-3">
             <ProductActions 
               productId={product.id} 
               productName={`${product.tipo} ${product.marca}`} 
               isActive={product.activo} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}
