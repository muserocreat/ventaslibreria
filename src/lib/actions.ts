"use server";

import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function parsePrice(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 0;
  const normalized = value.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function updateProduct(id: number, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const data = {
      tipo: formData.get("tipo") as string,
      marca: formData.get("marca") as string,
      descripcion: formData.get("descripcion") as string,
      precio_costo: parsePrice(formData.get("precio_costo")),
      precio_venta_minorista: parsePrice(formData.get("precio_venta_minorista")),
      precio_venta_mayorista: parsePrice(formData.get("precio_venta_mayorista")),
      stock: parseInt(formData.get("stock") as string) || 0,
      codigo_barras: formData.get("codigo_barras") as string,
      familia: formData.get("familia") as string,
      rubro: formData.get("rubro") as string,
    };

    // Validaciones básicas
    if (!data.tipo || !data.marca) {
      return { success: false, error: "Tipo y marca son obligatorios" };
    }

    if (data.precio_venta_minorista <= 0) {
      return { success: false, error: "El precio de venta minorista debe ser mayor a 0" };
    }

    if (data.stock < 0) {
      return { success: false, error: "El stock no puede ser negativo" };
    }

    // Verificar que el producto existe
    const [existingProduct] = await db.select({ id: productos.id })
      .from(productos)
      .where(eq(productos.id, id));

    if (!existingProduct) {
      return { success: false, error: "Producto no encontrado" };
    }

    await db.update(productos)
      .set(data)
      .where(eq(productos.id, id));

    revalidatePath("/productos");
    return { success: true, message: "Producto actualizado correctamente" };
  } catch (error) {
    console.error("Error en updateProduct:", error);
    return { success: false, error: "Error al actualizar el producto" };
  }
}

export async function toggleProduct(id: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Obtener el estado actual
    const [product] = await db.select({ activo: productos.activo })
      .from(productos)
      .where(eq(productos.id, id));

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    // Alternar: si estaba activo (1) pasa a inactivo (0) y viceversa
    const nuevoEstado = product.activo === 1 ? 0 : 1;
    await db.update(productos)
      .set({ activo: nuevoEstado })
      .where(eq(productos.id, id));

    revalidatePath("/productos");
    
    const mensaje = nuevoEstado === 1 ? "Producto activado correctamente" : "Producto anulado correctamente";
    return { success: true, message: mensaje };
  } catch (error) {
    console.error("Error en toggleProduct:", error);
    return { success: false, error: "Error al cambiar el estado del producto" };
  }
}

export async function createProduct(formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const data = {
      tipo: formData.get("tipo") as string,
      marca: formData.get("marca") as string,
      descripcion: formData.get("descripcion") as string,
      precio_costo: parsePrice(formData.get("precio_costo")),
      precio_venta_minorista: parsePrice(formData.get("precio_venta_minorista")),
      precio_venta_mayorista: parsePrice(formData.get("precio_venta_mayorista")),
      stock: parseInt(formData.get("stock") as string) || 0,
      codigo_barras: formData.get("codigo_barras") as string,
      familia: formData.get("familia") as string,
      rubro: formData.get("rubro") as string,
    };

    // Validaciones básicas
    if (!data.tipo || !data.marca) {
      return { success: false, error: "Tipo y marca son obligatorios" };
    }

    if (data.precio_venta_minorista <= 0) {
      return { success: false, error: "El precio de venta minorista debe ser mayor a 0" };
    }

    if (data.stock < 0) {
      return { success: false, error: "El stock no puede ser negativo" };
    }

    await db.insert(productos).values(data);

    revalidatePath("/productos");
    return { success: true, message: "Producto creado correctamente" };
  } catch (error) {
    console.error("Error en createProduct:", error);
    return { success: false, error: "Error al crear el producto" };
  }
}

export async function deleteProduct(id: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Verificar que el producto existe
    const [product] = await db.select({ id: productos.id })
      .from(productos)
      .where(eq(productos.id, id));

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    await db.delete(productos)
      .where(eq(productos.id, id));

    revalidatePath("/productos");
    return { success: true, message: "Producto eliminado correctamente" };
  } catch (error: unknown) {
    console.error("Error en deleteProduct:", error);
    const sqlError = error as { code?: string };
    if (sqlError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      // El producto tiene ventas u otras referencias asociadas
      // Lo anulamos en su lugar
      try {
        await db.update(productos)
          .set({ activo: 0 })
          .where(eq(productos.id, id));
        
        revalidatePath("/productos");
        return { 
          success: false, 
          error: "No se puede eliminar: tiene ventas asociadas. Se ha anulado en su lugar." 
        };
      } catch (updateError) {
        console.error("Error al anular producto:", updateError);
        return { success: false, error: "Error al procesar la eliminación del producto" };
      }
    }
    return { success: false, error: "Error inesperado al intentar eliminar el producto" };
  }
}
