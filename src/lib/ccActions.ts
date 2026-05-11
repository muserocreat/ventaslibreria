"use server";

import { db } from "@/db";
import { cuentas_corrientes, movimientos_cuenta_corriente, clientes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteMovimientoCCAction(movimientoId: number) {
  try {
    const result = db.transaction((tx) => {
      // 1. Obtener el movimiento
      const [mov] = tx
        .select()
        .from(movimientos_cuenta_corriente)
        .where(eq(movimientos_cuenta_corriente.id, movimientoId))
        .all();

      if (!mov) throw new Error("Movimiento no encontrado");

      // 2. Calcular impacto en el saldo
      // Si fue una venta (suma al saldo deudor), borrarla resta al saldo.
      // Si fue un pago (resta al saldo deudor), borrarlo suma al saldo.
      const delta = mov.tipo_movimiento === "venta" ? -(mov.monto || 0) : (mov.monto || 0);

      // 3. Actualizar saldo en cuenta corriente
      tx
        .update(cuentas_corrientes)
        .set({
          saldo_actual: sql`${cuentas_corrientes.saldo_actual} + ${delta}`,
        })
        .where(eq(cuentas_corrientes.cliente_id, mov.cliente_id!))
        .run();

      // 4. Si fue un pago, restar los puntos que se otorgaron (1 punto cada $100)
      if (mov.tipo_movimiento === "pago" && (mov.monto || 0) >= 100) {
        const puntosRestar = Math.floor((mov.monto || 0) / 100);
        tx
          .update(clientes)
          .set({ puntos: sql`COALESCE(${clientes.puntos}, 0) - ${puntosRestar}` })
          .where(eq(clientes.id, mov.cliente_id!))
          .run();
      }

      // 5. Eliminar el movimiento
      tx.delete(movimientos_cuenta_corriente).where(eq(movimientos_cuenta_corriente.id, movimientoId)).run();

      return { success: true, clienteId: mov.cliente_id };
    });

    revalidatePath("/cuentas-corrientes");
    revalidatePath(`/cuentas-corrientes/${result.clienteId}`);
    return { success: true };
  } catch (error) {
    console.error("Error en deleteMovimientoCCAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar" };
  }
}

export async function updateMovimientoCCAction(id: number, data: { monto: number; descripcion: string }) {
  try {
    const result = db.transaction((tx) => {
      const [mov] = tx
        .select()
        .from(movimientos_cuenta_corriente)
        .where(eq(movimientos_cuenta_corriente.id, id))
        .all();

      if (!mov) throw new Error("Movimiento no encontrado");

      const montoAnterior = mov.monto || 0;
      const montoNuevo = data.monto;
      const diferenciaMonto = montoNuevo - montoAnterior;

      // El impacto depende del tipo:
      // Si es venta: aumento en monto = aumento en saldo deudor.
      // Si es pago: aumento en monto = disminución en saldo deudor.
      const deltaSaldo = mov.tipo_movimiento === "venta" ? diferenciaMonto : -diferenciaMonto;

      // Actualizar saldo
      tx
        .update(cuentas_corrientes)
        .set({
          saldo_actual: sql`${cuentas_corrientes.saldo_actual} + ${deltaSaldo}`,
        })
        .where(eq(cuentas_corrientes.cliente_id, mov.cliente_id!))
        .run();

      // Actualizar puntos si es un pago
      if (mov.tipo_movimiento === "pago") {
        const puntosAnteriores = Math.floor(montoAnterior / 100);
        const puntosNuevos = Math.floor(montoNuevo / 100);
        const deltaPuntos = puntosNuevos - puntosAnteriores;

        if (deltaPuntos !== 0) {
          tx
            .update(clientes)
            .set({ puntos: sql`COALESCE(${clientes.puntos}, 0) + ${deltaPuntos}` })
            .where(eq(clientes.id, mov.cliente_id!))
            .run();
        }
      }

      // Actualizar movimiento
      tx
        .update(movimientos_cuenta_corriente)
        .set({
          monto: montoNuevo,
          descripcion: data.descripcion,
        })
        .where(eq(movimientos_cuenta_corriente.id, id))
        .run();

      return { success: true, clienteId: mov.cliente_id };
    });

    revalidatePath("/cuentas-corrientes");
    revalidatePath(`/cuentas-corrientes/${result.clienteId}`);
    return { success: true };
  } catch (error) {
    console.error("Error en updateMovimientoCCAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}
