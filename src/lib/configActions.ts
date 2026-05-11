"use server";

import { db } from "@/db";
import { configuraciones, obligaciones_fijas, pagos_obligaciones, gastos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function nowSqliteLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(" ");
}

export interface ConfiguracionItem {
  id: number;
  clave: string;
  valor: string;
  descripcion: string | null;
  categoria: string | null;
  tipo: string | null;
  actualizado_en: string | null;
}

export async function getConfiguracionesAction(categoria?: string): Promise<ConfiguracionItem[]> {
  const result = await db
    .select()
    .from(configuraciones)
    .where(categoria ? eq(configuraciones.categoria, categoria) : sql`1=1`)
    .orderBy(configuraciones.categoria, configuraciones.clave);

  return result;
}

export async function getConfiguracionAction(clave: string): Promise<string | null> {
  const [config] = await db
    .select({ valor: configuraciones.valor })
    .from(configuraciones)
    .where(eq(configuraciones.clave, clave));

  return config?.valor || null;
}

export async function getConfiguracionNumeroAction(clave: string): Promise<number> {
  const valor = await getConfiguracionAction(clave);
  return valor ? parseFloat(valor) : 0;
}

export async function actualizarConfiguracionAction(clave: string, valor: string) {
  try {
    const [existing] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.clave, clave));

    if (existing) {
      await db
        .update(configuraciones)
        .set({ 
          valor,
          actualizado_en: nowSqliteLocal()
        })
        .where(eq(configuraciones.clave, clave));
    } else {
      await db.insert(configuraciones).values({
        clave,
        valor,
        actualizado_en: nowSqliteLocal(),
      });
    }

    revalidatePath("/configuraciones");
    revalidatePath("/reportes");

    return { success: true };
  } catch (error) {
    console.error("Error en actualizarConfiguracionAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al actualizar configuración" 
    };
  }
}

export async function crearConfiguracionAction(data: {
  clave: string;
  valor: string;
  descripcion?: string;
  categoria?: string;
  tipo?: string;
}) {
  try {
    await db.insert(configuraciones).values({
      clave: data.clave,
      valor: data.valor,
      descripcion: data.descripcion || null,
      categoria: data.categoria || "general",
      tipo: data.tipo || "texto",
      actualizado_en: nowSqliteLocal(),
    });

    revalidatePath("/configuraciones");
    
    return { success: true };
  } catch (error) {
    console.error("Error en crearConfiguracionAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al crear configuración" 
    };
  }
}

export async function eliminarConfiguracionAction(clave: string) {
  try {
    await db
      .delete(configuraciones)
      .where(eq(configuraciones.clave, clave));

    revalidatePath("/configuraciones");
    
    return { success: true };
  } catch (error) {
    console.error("Error en eliminarConfiguracionAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al eliminar configuración" 
    };
  }
}

// Configuraciones por defecto del sistema
export async function inicializarConfiguracionesDefectoAction() {
  const configs = [
    // Distribución de fondos
    { clave: "distribucion_reinversion_pct", valor: "70", descripcion: "Porcentaje para reinversión", categoria: "distribucion", tipo: "numero" },
    { clave: "distribucion_fondo_pct", valor: "30", descripcion: "Porcentaje para fondo de emergencia", categoria: "distribucion", tipo: "numero" },
    
    // Ciclo operativo
    { clave: "ciclo_inicio_dia", valor: "10", descripcion: "Día de inicio del ciclo (10 de cada mes)", categoria: "ciclo", tipo: "numero" },
    { clave: "ciclo_fin_dia", valor: "9", descripcion: "Día de fin del ciclo (9 del mes siguiente)", categoria: "ciclo", tipo: "numero" },
    
    // Puntos de fidelidad
    { clave: "puntos_por_pesos", valor: "100", descripcion: "Pesos necesarios para ganar 1 punto", categoria: "puntos", tipo: "numero" },
    { clave: "puntos_valor", valor: "10", descripcion: "Valor en pesos de cada punto", categoria: "puntos", tipo: "numero" },
    
    // Límites
    { clave: "limite_credito_default", valor: "10000", descripcion: "Límite de crédito por defecto para nuevos clientes", categoria: "limites", tipo: "numero" },
    
    // Notificaciones
    { clave: "notificar_pedidos_listos", valor: "true", descripcion: "Enviar WhatsApp cuando pedido esté listo", categoria: "notificaciones", tipo: "booleano" },
  ];

  for (const config of configs) {
    const [existing] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.clave, config.clave));

    if (!existing) {
      await db.insert(configuraciones).values({
        ...config,
        actualizado_en: nowSqliteLocal(),
      });
    }
  }

  return { success: true };
}

// ── Obligaciones Fijas ─────────────────────────────────────────────

export interface ObligacionFijaItem {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  monto_estimado: number | null;
  vencimiento_dia: number | null;
  activa: number | null;
  fecha_creacion: string | null;
}

export async function getObligacionesFijasAction(): Promise<ObligacionFijaItem[]> {
  const result = await db.select().from(obligaciones_fijas).orderBy(obligaciones_fijas.vencimiento_dia);
  return result;
}

export async function actualizarObligacionFijaAction(id: number, data: {
  nombre?: string;
  descripcion?: string;
  monto_estimado?: number;
  vencimiento_dia?: number;
  activa?: number;
}) {
  try {
    await db
      .update(obligaciones_fijas)
      .set(data)
      .where(eq(obligaciones_fijas.id, id));

    revalidatePath("/reportes");
    revalidatePath("/configuraciones");

    return { success: true };
  } catch (error) {
    console.error("Error en actualizarObligacionFijaAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar obligación"
    };
  }
}

export async function crearObligacionFijaAction(data: {
  nombre: string;
  descripcion?: string;
  monto_estimado: number;
  vencimiento_dia: number;
  activa?: number;
}) {
  try {
    await db.insert(obligaciones_fijas).values({
      ...data,
      activa: data.activa ?? 1,
      fecha_creacion: nowSqliteLocal(),
    });

    revalidatePath("/reportes");
    revalidatePath("/configuraciones");

    return { success: true };
  } catch (error) {
    console.error("Error en crearObligacionFijaAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear obligación"
    };
  }
}

export async function eliminarObligacionFijaAction(id: number) {
  try {
    await db
      .delete(obligaciones_fijas)
      .where(eq(obligaciones_fijas.id, id));

    revalidatePath("/reportes");
    revalidatePath("/configuraciones");

    return { success: true };
  } catch (error) {
    console.error("Error en eliminarObligacionFijaAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar obligación"
    };
  }
}

export async function registrarPagoObligacionAction(obligacionId: number, monto: number) {
  try {
    // Obtener información de la obligación
    const [obligacion] = await db
      .select()
      .from(obligaciones_fijas)
      .where(eq(obligaciones_fijas.id, obligacionId));

    if (!obligacion) {
      return { success: false, error: "Obligación no encontrada" };
    }

    // Insertar pago en pagos_obligaciones
    await db.insert(pagos_obligaciones).values({
      obligacion_id: obligacionId,
      fecha_pago: nowSqliteLocal(),
      monto_pagado: monto,
      periodo_financiero: sql`(SELECT strftime('%Y-%m', date('now','localtime')))`,
    });

    // Insertar automáticamente en gastos para control completo
    // excluir_distribucion=1 para evitar doble conteo (ya se cuenta como costo fijo diario)
    await db.insert(gastos).values({
      descripcion: obligacion.nombre || `Obligación #${obligacionId}`,
      monto: monto,
      fecha: nowSqliteLocal(),
      categoria: 1, // Operativos
      medio_pago: null,
      excluir_distribucion: 1, // Excluir de distribución diaria (ya cuenta como costo fijo)
    });

    revalidatePath("/reportes");

    return { success: true };
  } catch (error) {
    console.error("Error en registrarPagoObligacionAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar pago"
    };
  }
}
