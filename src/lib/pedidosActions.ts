"use server";

import { db } from "@/db";
import { pedidos, clientes, ventas } from "@/db/schema";
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

async function enviarNotificacionWhatsApp(numero: string, mensaje: string) {
  try {
    // Limpiar número (asumiendo formato local Argentina)
    let num = numero.replace(/\D/g, "");
    if (num.length === 10) num = "549" + num;
    
    await fetch("http://localhost:3000/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: num, mensaje }),
    });
  } catch (error) {
    console.error("Error al enviar WhatsApp:", error);
  }
}


interface PedidoItem {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface CreatePedidoData {
  cliente_id: number;
  detalles: string;
  productos: PedidoItem[];
  total: number;
  adelanto: number;
  fecha_estimada_entrega?: string;
  notificar_whatsapp?: boolean;
}

export async function createPedidoAction(data: CreatePedidoData) {
  try {
    // Generar código automático
    const codigo = `PED-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
    
    // Calcular saldo
    const saldo = data.total - data.adelanto;

    const result = db.transaction((tx) => {
      // Insertar pedido
      const [pedido] = tx
        .insert(pedidos)
        .values({
          codigo,
          cliente_id: data.cliente_id,
          detalles: data.detalles,
          productos_json: JSON.stringify(data.productos),
          total: data.total,
          adelanto: data.adelanto,
          saldo,
          estado: "Recibido",
          fecha: nowSqliteLocal(),
          fecha_estimada_entrega: data.fecha_estimada_entrega || null,
          venta_generada: 0,
          notificar_whatsapp: data.notificar_whatsapp ? 1 : 0,
        })
        .returning({ id: pedidos.id })
        .all();

      // Si hay adelanto, registrar venta
      if (data.adelanto > 0) {
        tx.insert(ventas).values({
          cliente_id: data.cliente_id || 0,
          total: data.adelanto,
          fecha: nowSqliteLocal(),
          pedido_id: pedido.id,
          tipo: "Adelanto",
        }).run();
      }

      return pedido;
    });

    revalidatePath("/pedidos");
    revalidatePath("/ventas");
    
      if (data.notificar_whatsapp && data.cliente_id) {
        const [cli] = await db.select({ nombre: clientes.nombre, telefono: clientes.telefono }).from(clientes).where(eq(clientes.id, data.cliente_id));
        if (cli && cli.telefono) {
          const msg = `¡Hola ${cli.nombre}! Recibimos tu pedido ${codigo}.\nTotal: $${data.total}\nAdelanto: $${data.adelanto}\nSaldo: $${saldo}\n¡Gracias!`;
          await enviarNotificacionWhatsApp(cli.telefono, msg);
        }
      }

      return { success: true, pedidoId: result.id, codigo };
    } catch (error) {
    console.error("Error en createPedidoAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al crear pedido" 
    };
  }
}

export async function cambiarEstadoPedidoAction(pedidoId: number, nuevoEstado: string) {
  try {
    await db
      .update(pedidos)
      .set({ estado: nuevoEstado })
      .where(eq(pedidos.id, pedidoId));

    // Notificar si pasa a Terminado
    if (nuevoEstado === "Terminado") {
      const [p] = await db
        .select({ 
          notificar: pedidos.notificar_whatsapp, 
          codigo: pedidos.codigo,
          cliente_id: pedidos.cliente_id,
          total: pedidos.total,
          adelanto: pedidos.adelanto
        })
        .from(pedidos)
        .where(eq(pedidos.id, pedidoId));
      
      if (p && p.notificar && p.cliente_id) {
        const [cli] = await db.select().from(clientes).where(eq(clientes.id, p.cliente_id));
        if (cli && cli.telefono) {
          const saldo = (p.total || 0) - (p.adelanto || 0);
          const msg = `¡Hola ${cli.nombre}! Tu pedido ${p.codigo} ya está listo para retirar.\nSaldo a abonar: $${saldo}\n¡Te esperamos!`;
          await enviarNotificacionWhatsApp(cli.telefono, msg);
        }
      }
    }

    revalidatePath("/pedidos");
    
    return { success: true };
  } catch (error) {
    console.error("Error en cambiarEstadoPedidoAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al cambiar estado" 
    };
  }
}

export async function generarVentaDesdePedidoAction(pedidoId: number) {
  try {
    const result = db.transaction((tx) => {
      // Obtener pedido
      const [pedido] = tx
        .select({
          id: pedidos.id,
          cliente_id: pedidos.cliente_id,
          total: pedidos.total,
          adelanto: pedidos.adelanto,
          codigo: pedidos.codigo,
          detalles: pedidos.detalles,
          productos_json: pedidos.productos_json,
          notificar_whatsapp: pedidos.notificar_whatsapp,
        })
        .from(pedidos)
        .where(eq(pedidos.id, pedidoId))
        .all();

      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      const saldo = (pedido.total || 0) - (pedido.adelanto || 0);

      // Si hay saldo pendiente, generar venta
      if (saldo > 0) {
        tx.insert(ventas).values({
          cliente_id: pedido.cliente_id || 0,
          total: saldo,
          fecha: nowSqliteLocal(),
          pedido_id: pedido.id,
          tipo: "Saldo",
        }).run();

        // Otorgar puntos al cliente (1 punto cada $100)
        if (pedido.cliente_id && pedido.cliente_id !== 0) {
          const puntosGanados = Math.floor(saldo / 100);
          if (puntosGanados > 0) {
            tx
              .update(clientes)
              .set({ puntos: sql`COALESCE(${clientes.puntos}, 0) + ${puntosGanados}` })
              .where(eq(clientes.id, pedido.cliente_id))
              .run();
          }
        }
      }

      // Actualizar estado del pedido
      tx
        .update(pedidos)
        .set({ estado: "Venta Generada", venta_generada: 1 })
        .where(eq(pedidos.id, pedidoId))
        .run();

      return { pedido, saldo };
    });

    revalidatePath("/pedidos");
    revalidatePath("/ventas");
    revalidatePath("/cuentas-corrientes");

    return { success: true, saldo: result.saldo };
  } catch (error) {
    console.error("Error en generarVentaDesdePedidoAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al generar venta" 
    };
  }
}

export async function getPedidosPorFechaAction(fecha: string) {
  try {
    const pedidosList = await db
      .select({
        id: pedidos.id,
        codigo: pedidos.codigo,
        cliente_id: pedidos.cliente_id,
        cliente_nombre: clientes.nombre,
        detalles: pedidos.detalles,
        total: pedidos.total,
        adelanto: pedidos.adelanto,
        estado: pedidos.estado,
        fecha: pedidos.fecha,
        fecha_estimada_entrega: pedidos.fecha_estimada_entrega,
        venta_generada: pedidos.venta_generada,
      })
      .from(pedidos)
      .leftJoin(clientes, eq(pedidos.cliente_id, clientes.id))
      .where(sql`DATE(${pedidos.fecha}) = ${fecha}`)
      .orderBy(pedidos.fecha);

    return pedidosList;
  } catch (error) {
    console.error("Error en getPedidosPorFechaAction:", error);
    return [];
  }
}
