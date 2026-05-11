import { db } from "@/db";
import { cuentas_corrientes, movimientos_cuenta_corriente, clientes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

function nowSqliteLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(" ");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_id, monto, descripcion, tipo_movimiento } = body;

    if (!cliente_id || !monto || monto <= 0) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos" },
        { status: 400 }
      );
    }

    // Obtener información actual del cliente
    const [cliente] = await db
      .select({
          saldo_actual: cuentas_corrientes.saldo_actual,
          limite_credito: clientes.limite_credito,
        })
      .from(clientes)
      .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
      .where(eq(clientes.id, cliente_id))
      .limit(1);

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const saldoActual = cliente.saldo_actual || 0;
    const nuevoSaldo = saldoActual - monto;

    const result = db.transaction((tx) => {
      // Actualizar o crear cuenta corriente
      const existingCCRows = tx
        .select({ id: cuentas_corrientes.id })
        .from(cuentas_corrientes)
        .where(eq(cuentas_corrientes.cliente_id, cliente_id))
        .all();

      if (existingCCRows.length > 0) {
        tx
          .update(cuentas_corrientes)
          .set({ 
            saldo_actual: nuevoSaldo,
            fecha_ultimo_movimiento: nowSqliteLocal(),
          })
          .where(eq(cuentas_corrientes.cliente_id, cliente_id))
          .run();
      } else {
        tx
          .insert(cuentas_corrientes)
          .values({
            cliente_id,
            saldo_actual: nuevoSaldo,
            fecha_ultimo_movimiento: nowSqliteLocal(),
          })
          .run();
      }

      // Registrar movimiento
      tx
        .insert(movimientos_cuenta_corriente)
        .values({
          cliente_id,
          tipo_movimiento: tipo_movimiento || "pago",
          monto,
          descripcion: descripcion || `Pago manual`,
          fecha: nowSqliteLocal(),
        })
        .run();

      // Actualizar puntos si es un pago (cada $100 = 1 punto)
      if (tipo_movimiento === "pago" && monto >= 100) {
        const puntosSumar = Math.floor(monto / 100);
        tx
          .update(clientes)
          .set({ puntos: sql`COALESCE(${clientes.puntos}, 0) + ${puntosSumar}` })
          .where(eq(clientes.id, cliente_id))
          .run();
      }

      return { success: true, nuevoSaldo };
    });

    return NextResponse.json(
      { 
        success: true, 
        mensaje: `Pago de ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)} registrado correctamente`,
        nuevoSaldo: result.nuevoSaldo 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en registro de pago:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Error al registrar pago" 
      },
      { status: 500 }
    );
  }
}
