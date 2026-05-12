"use server";

import { db } from "@/db";
import { productos, variantes_producto } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type VarianteData = {
  id?: number;
  nombre: string;
  precio_venta?: number | null;
  stock?: number;
  codigo_barras?: string | null;
};

export async function saveVariantesAction(productoId: number, variantes: VarianteData[]) {
  try {
    // 1. Obtener variantes actuales
    const actuales = await db.select().from(variantes_producto).where(eq(variantes_producto.producto_id, productoId));
    const actualesIds = actuales.map(v => v.id);
    
    // 2. Identificar variantes a eliminar (las que no están en el nuevo array)
    const nuevasIds = variantes.filter(v => v.id).map(v => v.id as number);
    const eliminarIds = actualesIds.filter(id => !nuevasIds.includes(id));

    db.transaction((tx) => {
      // Eliminar
      if (eliminarIds.length > 0) {
        for (const id of eliminarIds) {
          tx.delete(variantes_producto).where(eq(variantes_producto.id, id)).run();
        }
      }

      // Upsert
      for (const v of variantes) {
        if (v.id) {
          // Actualizar
          tx.update(variantes_producto)
            .set({
              nombre: v.nombre,
              precio_venta: v.precio_venta,
              stock: v.stock || 0,
              codigo_barras: v.codigo_barras
            })
            .where(eq(variantes_producto.id, v.id))
            .run();
        } else {
          // Insertar
          tx.insert(variantes_producto)
            .values({
              producto_id: productoId,
              nombre: v.nombre,
              precio_venta: v.precio_venta,
              stock: v.stock || 0,
              codigo_barras: v.codigo_barras
            })
            .run();
        }
      }
    });

    revalidatePath("/productos");
    revalidatePath(`/productos/${productoId}/edit`);
    return { success: true, message: "Variantes actualizadas correctamente" };
  } catch (error: any) {
    console.error("Error al guardar variantes:", error);
    return { success: false, error: error.message };
  }
}

export async function getVariantesByProductoAction(productoId: number) {
  try {
    return await db.select().from(variantes_producto).where(eq(variantes_producto.producto_id, productoId));
  } catch (error) {
    console.error("Error al obtener variantes:", error);
    return [];
  }
}
