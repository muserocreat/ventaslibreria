"use server";

import { db } from "@/db";
import {
  productos,
  promociones_combo,
  promociones_combo_items,
  promociones,
} from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────

export type ComboItem = {
  id: number;
  combo_id: number;
  producto_id: number;
  cantidad: number;
  producto_nombre?: string;
  precio_venta?: number;
  precio_costo?: number;
};

export type Combo = {
  id: number;
  nombre: string | null;
  precio_combo: number;
  activa: number | null;
  fecha_expiracion: string | null;
  creado_en: string | null;
  items: ComboItem[];
  cant_items: number;
  expirado: boolean;
};

export type Promocion = {
  id: number;
  producto_id: number;
  producto_nombre?: string;
  cantidad_minima: number;
  precio_promocional: number;
  precio_original?: number;
  ahorro_pct?: number;
  activa: number | null;
  fecha_expiracion: string | null;
  expirado: boolean;
};

// ── Combos ────────────────────────────────────────────────────────

export async function getCombosAction(): Promise<Combo[]> {
  const combos = await db
    .select({
      id: promociones_combo.id,
      nombre: promociones_combo.nombre,
      precio_combo: promociones_combo.precio_combo,
      activa: promociones_combo.activa,
      fecha_expiracion: promociones_combo.fecha_expiracion,
      creado_en: promociones_combo.creado_en,
    })
    .from(promociones_combo)
    .orderBy(desc(promociones_combo.activa), desc(promociones_combo.id));

  const ahora = new Date().toISOString();

  const result: Combo[] = [];
  for (const combo of combos) {
    const items = await db
      .select({
        id: promociones_combo_items.id,
        combo_id: promociones_combo_items.combo_id,
        producto_id: promociones_combo_items.producto_id,
        cantidad: promociones_combo_items.cantidad,
      })
      .from(promociones_combo_items)
      .where(eq(promociones_combo_items.combo_id, combo.id));

    const itemsConInfo: ComboItem[] = [];
    for (const item of items) {
      const prod = await db
        .select({
          nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
          precio_venta: productos.precio_venta_minorista,
          precio_costo: productos.precio_costo,
        })
        .from(productos)
        .where(eq(productos.id, item.producto_id))
        .limit(1);

      itemsConInfo.push({
        ...item,
        producto_nombre: prod[0]?.nombre,
        precio_venta: prod[0]?.precio_venta ?? 0,
        precio_costo: prod[0]?.precio_costo ?? 0,
      });
    }

    const expirado = combo.fecha_expiracion
      ? new Date(combo.fecha_expiracion) < new Date(ahora)
      : false;

    result.push({
      ...combo,
      items: itemsConInfo,
      cant_items: items.length,
      expirado,
    });
  }

  return result;
}

export async function getComboByIdAction(id: number): Promise<Combo | null> {
  const [combo] = await db
    .select()
    .from(promociones_combo)
    .where(eq(promociones_combo.id, id))
    .limit(1);

  if (!combo) return null;

  const items = await db
    .select({
      id: promociones_combo_items.id,
      combo_id: promociones_combo_items.combo_id,
      producto_id: promociones_combo_items.producto_id,
      cantidad: promociones_combo_items.cantidad,
    })
    .from(promociones_combo_items)
    .where(eq(promociones_combo_items.combo_id, combo.id));

  const itemsConInfo: ComboItem[] = [];
  for (const item of items) {
    const prod = await db
      .select({
        nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
        precio_venta: productos.precio_venta_minorista,
        precio_costo: productos.precio_costo,
      })
      .from(productos)
      .where(eq(productos.id, item.producto_id))
      .limit(1);

    itemsConInfo.push({
      ...item,
      producto_nombre: prod[0]?.nombre,
      precio_venta: prod[0]?.precio_venta ?? 0,
      precio_costo: prod[0]?.precio_costo ?? 0,
    });
  }

  const ahora = new Date().toISOString();
  const expirado = combo.fecha_expiracion
    ? new Date(combo.fecha_expiracion) < new Date(ahora)
    : false;

  return {
    ...combo,
    items: itemsConInfo,
    cant_items: items.length,
    expirado,
  };
}

export async function createComboAction(data: {
  nombre: string;
  precio_combo: number;
  activa: boolean;
  fecha_expiracion: string | null;
  items: { producto_id: number; cantidad: number }[];
}): Promise<{ success: boolean; error?: string; combo_id?: number }> {
  try {
    // Calcular fecha de expiración si se especifican horas
    let fechaExpiracion: string | null = null;
    if (data.fecha_expiracion) {
      const horas = parseInt(data.fecha_expiracion);
      if (!isNaN(horas) && horas > 0) {
        const fecha = new Date();
        fecha.setHours(fecha.getHours() + horas);
        fechaExpiracion = fecha.toISOString();
      }
    }

    const comboId = db.transaction((tx) => {
      const inserted = tx
        .insert(promociones_combo)
        .values({
          nombre: data.nombre,
          precio_combo: data.precio_combo,
          activa: data.activa ? 1 : 0,
          fecha_expiracion: fechaExpiracion,
        })
        .returning({ id: promociones_combo.id })
        .get();

      for (const item of data.items) {
        tx.insert(promociones_combo_items).values({
          combo_id: inserted.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        }).run();
      }

      return inserted.id;
    });

    return { success: true, combo_id: comboId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateComboAction(
  id: number,
  data: {
    nombre: string;
    precio_combo: number;
    activa: boolean;
    fecha_expiracion: string | null;
    items: { producto_id: number; cantidad: number }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Calcular fecha de expiración si se especifican horas
    let fechaExpiracion: string | null = null;
    if (data.fecha_expiracion) {
      const horas = parseInt(data.fecha_expiracion);
      if (!isNaN(horas) && horas > 0) {
        const fecha = new Date();
        fecha.setHours(fecha.getHours() + horas);
        fechaExpiracion = fecha.toISOString();
      }
    }

    db.transaction((tx) => {
      tx
        .update(promociones_combo)
        .set({
          nombre: data.nombre,
          precio_combo: data.precio_combo,
          activa: data.activa ? 1 : 0,
          fecha_expiracion: fechaExpiracion,
        })
        .where(eq(promociones_combo.id, id))
        .run();

      tx
        .delete(promociones_combo_items)
        .where(eq(promociones_combo_items.combo_id, id))
        .run();

      for (const item of data.items) {
        tx.insert(promociones_combo_items).values({
          combo_id: id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        }).run();
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteComboAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    db.transaction((tx) => {
      tx
        .delete(promociones_combo_items)
        .where(eq(promociones_combo_items.combo_id, id))
        .run();
      tx.delete(promociones_combo).where(eq(promociones_combo.id, id)).run();
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function toggleComboAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const [combo] = await db
      .select({ activa: promociones_combo.activa })
      .from(promociones_combo)
      .where(eq(promociones_combo.id, id))
      .limit(1);

    if (!combo) return { success: false, error: "Combo no encontrado" };

    await db
      .update(promociones_combo)
      .set({ activa: combo.activa ? 0 : 1 })
      .where(eq(promociones_combo.id, id));

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ── Promociones (tramos por producto) ─────────────────────────────

export async function getPromocionesAction(): Promise<Promocion[]> {
  const promos = await db
    .select({
      id: promociones.id,
      producto_id: promociones.producto_id,
      cantidad_minima: promociones.cantidad_minima,
      precio_promocional: promociones.precio_promocional,
      activa: promociones.activa,
      fecha_expiracion: promociones.fecha_expiracion,
    })
    .from(promociones)
    .orderBy(desc(promociones.activa), promociones.producto_id, promociones.cantidad_minima);

  const ahora = new Date().toISOString();

  const result: Promocion[] = [];
  for (const promo of promos) {
    const prod = await db
      .select({
        nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
        precio_venta_minorista: productos.precio_venta_minorista,
      })
      .from(productos)
      .where(eq(productos.id, promo.producto_id))
      .limit(1);

    const precioOriginal = prod[0]?.precio_venta_minorista || 0;
    const ahorroPct = precioOriginal > 0
      ? Math.round(((precioOriginal - promo.precio_promocional) / precioOriginal) * 100)
      : 0;

    const expirado = promo.fecha_expiracion
      ? new Date(promo.fecha_expiracion) < new Date(ahora)
      : false;

    result.push({
      ...promo,
      producto_nombre: prod[0]?.nombre,
      precio_original: precioOriginal,
      ahorro_pct: ahorroPct,
      expirado,
    });
  }

  return result;
}

export async function getPromocionesByProductoAction(
  producto_id: number
): Promise<Promocion[]> {
  const promos = await db
    .select({
      id: promociones.id,
      producto_id: promociones.producto_id,
      cantidad_minima: promociones.cantidad_minima,
      precio_promocional: promociones.precio_promocional,
      activa: promociones.activa,
      fecha_expiracion: promociones.fecha_expiracion,
    })
    .from(promociones)
    .where(eq(promociones.producto_id, producto_id))
    .orderBy(promociones.cantidad_minima);

  const ahora = new Date().toISOString();

  const result: Promocion[] = [];
  for (const promo of promos) {
    const expirado = promo.fecha_expiracion
      ? new Date(promo.fecha_expiracion) < new Date(ahora)
      : false;

    result.push({ ...promo, expirado });
  }

  return result;
}

export async function createPromocionAction(data: {
  producto_id: number;
  cantidad_minima: number;
  precio_promocional: number;
  activa: boolean;
  fecha_expiracion: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Validación: cantidad mínima debe ser al menos 2
    if (data.cantidad_minima < 2) {
      return { success: false, error: "La cantidad mínima debe ser al menos 2" };
    }

    // Obtener precio original del producto
    const [producto] = await db
      .select({ precio_venta_minorista: productos.precio_venta_minorista })
      .from(productos)
      .where(eq(productos.id, data.producto_id))
      .limit(1);

    if (!producto) {
      return { success: false, error: "Producto no encontrado" };
    }

    const precioOriginal = producto.precio_venta_minorista || 0;

    // Validación: precio promocional no puede ser mayor al original
    if (data.precio_promocional > precioOriginal) {
      return { success: false, error: `El precio promocional ($${data.precio_promocional}) no puede ser mayor al precio original ($${precioOriginal})` };
    }

    // Calcular fecha de expiración si se especifican horas
    let fechaExpiracion: string | null = null;
    if (data.fecha_expiracion) {
      const horas = parseInt(data.fecha_expiracion);
      if (!isNaN(horas) && horas > 0) {
        const fecha = new Date();
        fecha.setHours(fecha.getHours() + horas);
        fechaExpiracion = fecha.toISOString();
      }
    }

    await db.insert(promociones).values({
      producto_id: data.producto_id,
      cantidad_minima: data.cantidad_minima,
      precio_promocional: data.precio_promocional,
      activa: data.activa ? 1 : 0,
      fecha_expiracion: fechaExpiracion,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updatePromocionAction(
  id: number,
  data: {
    cantidad_minima: number;
    precio_promocional: number;
    activa: boolean;
    fecha_expiracion: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validación: cantidad mínima debe ser al menos 2
    if (data.cantidad_minima < 2) {
      return { success: false, error: "La cantidad mínima debe ser al menos 2" };
    }

    // Obtener producto_id de la promoción y precio original del producto
    const [promo] = await db
      .select({ producto_id: promociones.producto_id })
      .from(promociones)
      .where(eq(promociones.id, id))
      .limit(1);

    if (!promo) {
      return { success: false, error: "Promoción no encontrada" };
    }

    const [producto] = await db
      .select({ precio_venta_minorista: productos.precio_venta_minorista })
      .from(productos)
      .where(eq(productos.id, promo.producto_id))
      .limit(1);

    if (!producto) {
      return { success: false, error: "Producto no encontrado" };
    }

    const precioOriginal = producto.precio_venta_minorista || 0;

    // Validación: precio promocional no puede ser mayor al original
    if (data.precio_promocional > precioOriginal) {
      return { success: false, error: `El precio promocional ($${data.precio_promocional}) no puede ser mayor al precio original ($${precioOriginal})` };
    }

    // Calcular fecha de expiración si se especifican horas
    let fechaExpiracion: string | null = null;
    if (data.fecha_expiracion) {
      const horas = parseInt(data.fecha_expiracion);
      if (!isNaN(horas) && horas > 0) {
        const fecha = new Date();
        fecha.setHours(fecha.getHours() + horas);
        fechaExpiracion = fecha.toISOString();
      }
    }

    await db
      .update(promociones)
      .set({
        cantidad_minima: data.cantidad_minima,
        precio_promocional: data.precio_promocional,
        activa: data.activa ? 1 : 0,
        fecha_expiracion: fechaExpiracion,
      })
      .where(eq(promociones.id, id));

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePromocionAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(promociones).where(eq(promociones.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function togglePromocionAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const [promo] = await db
      .select({ activa: promociones.activa })
      .from(promociones)
      .where(eq(promociones.id, id))
      .limit(1);

    if (!promo) return { success: false, error: "Promoción no encontrada" };

    await db
      .update(promociones)
      .set({ activa: promo.activa ? 0 : 1 })
      .where(eq(promociones.id, id));

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function reactivarPromocionAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(promociones)
      .set({ fecha_expiracion: null })
      .where(eq(promociones.id, id));

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function reactivarComboAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(promociones_combo)
      .set({ fecha_expiracion: null })
      .where(eq(promociones_combo.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ── Lógica de precio promocional (equivalente a promocion_utils.php) ──

export async function obtenerPrecioPromocional(
  producto_id: number,
  cantidad: number,
  cliente_puntos: number = 0,
  cliente_descuento_manual: boolean = false,
): Promise<number | null> {
  if (cliente_puntos > 3000 || cliente_descuento_manual) {
    // Cliente con descuento activo: mejor promo disponible
    const promos = await db
      .select({
        cantidad_minima: promociones.cantidad_minima,
        precio_promocional: promociones.precio_promocional,
      })
      .from(promociones)
      .where(
        and(
          eq(promociones.producto_id, producto_id),
          eq(promociones.activa, 1),
        )
      )
      .orderBy(promociones.cantidad_minima);

    if (promos.length > 1) return promos[1].precio_promocional;
    if (promos.length === 1) return promos[0].precio_promocional;
  } else {
    // Cliente normal: mejor tramo que califica por cantidad
    const [promo] = await db
      .select({
        precio_promocional: promociones.precio_promocional,
      })
      .from(promociones)
      .where(
        and(
          eq(promociones.producto_id, producto_id),
          eq(promociones.activa, 1),
          sql`${promociones.cantidad_minima} <= ${cantidad}`,
        )
      )
      .orderBy(desc(promociones.cantidad_minima))
      .limit(1);

    if (promo) return promo.precio_promocional;
  }

  return null;
}

// ── Productos (para selects) ───────────────────────────────────────

export async function getProductosCatalogoAction(search?: string): Promise<
  { id: number; nombre: string; precio_venta: number | null; precio_costo: number | null }[]
> {
  if (search) {
    return await db
      .select({
        id: productos.id,
        nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
        precio_venta: productos.precio_venta_minorista,
        precio_costo: productos.precio_costo,
      })
      .from(productos)
      .where(
        and(
          eq(productos.activo, 1),
          sql`(tipo || ' ' || marca || ' ' || descripcion LIKE ${'%' + search + '%'} OR codigo_barras LIKE ${'%' + search + '%'})`
        )
      )
      .orderBy(productos.descripcion)
      .limit(200);
  }

  return await db
    .select({
      id: productos.id,
      nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
      precio_venta: productos.precio_venta_minorista,
      precio_costo: productos.precio_costo,
    })
    .from(productos)
    .where(eq(productos.activo, 1))
    .orderBy(productos.descripcion)
    .limit(200);
}
