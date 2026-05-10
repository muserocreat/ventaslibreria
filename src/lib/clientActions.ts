"use server";

import { db } from "@/db";
import { clientes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCliente(formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const data = {
      nombre: (formData.get("nombre") as string)?.trim(),
      telefono: (formData.get("telefono") as string)?.trim(),
      dni: (formData.get("dni") as string)?.trim(),
      barrio: (formData.get("barrio") as string)?.trim(),
      observaciones: (formData.get("observaciones") as string)?.trim() || null,
    };

    if (!data.nombre) return { success: false, error: "El nombre es obligatorio" };
    if (!data.telefono) return { success: false, error: "El teléfono es obligatorio" };
    if (!data.dni) return { success: false, error: "El DNI es obligatorio" };
    if (!data.barrio) return { success: false, error: "El barrio es obligatorio" };

    await db.insert(clientes).values(data);

    revalidatePath("/clientes");
    return { success: true, message: "Cliente creado correctamente" };
  } catch (error) {
    console.error("Error en createCliente:", error);
    return { success: false, error: "Error al crear el cliente" };
  }
}

export async function updateCliente(id: number, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const data = {
      nombre: (formData.get("nombre") as string)?.trim(),
      telefono: (formData.get("telefono") as string)?.trim(),
      dni: (formData.get("dni") as string)?.trim(),
      barrio: (formData.get("barrio") as string)?.trim(),
      observaciones: (formData.get("observaciones") as string)?.trim() || null,
      nivel: formData.get("nivel") as string,
      descuento_activo: formData.get("descuento_activo") === "1" ? 1 : 0,
    };

    if (!data.nombre) return { success: false, error: "El nombre es obligatorio" };
    if (!data.telefono) return { success: false, error: "El teléfono es obligatorio" };
    if (!data.dni) return { success: false, error: "El DNI es obligatorio" };
    if (!data.barrio) return { success: false, error: "El barrio es obligatorio" };

    const [existing] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, id));
    if (!existing) return { success: false, error: "Cliente no encontrado" };

    await db.update(clientes).set(data).where(eq(clientes.id, id));

    revalidatePath("/clientes");
    return { success: true, message: "Cliente actualizado correctamente" };
  } catch (error) {
    console.error("Error en updateCliente:", error);
    return { success: false, error: "Error al actualizar el cliente" };
  }
}

export async function deleteCliente(id: number): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const [existing] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, id));
    if (!existing) return { success: false, error: "Cliente no encontrado" };

    await db.delete(clientes).where(eq(clientes.id, id));

    revalidatePath("/clientes");
    return { success: true, message: "Cliente eliminado correctamente" };
  } catch (error: unknown) {
    console.error("Error en deleteCliente:", error);
    const sqlError = error as { code?: string };
    if (sqlError.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return { success: false, error: "No se puede eliminar: el cliente tiene ventas asociadas." };
    }
    return { success: false, error: "Error inesperado al eliminar el cliente" };
  }
}
