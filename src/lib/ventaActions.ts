"use server";

import { db } from "@/db";
import {
  productos,
  clientes,
  ventas,
  detalle_venta,
  cuentas_corrientes,
  movimientos_cuenta_corriente,
  variantes_producto,
} from "@/db/schema";
import { like, or, eq, isNull, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obtenerPrecioPromocional } from "@/lib/combosActions";
import { formatCurrency } from "@/lib/formatter";

export type ProductoResult = {
  id: number;
  tipo: string | null;
  marca: string | null;
  descripcion: string | null;
  precio_venta_minorista: number | null;
  precio_venta_mayorista: number | null;
  codigo_barras: string | null;
  stock: number | null;
  variantes?: Array<{
    id: number;
    nombre: string;
    precio_venta: number | null;
    stock: number;
    codigo_barras: string | null;
  }>;
};

export type ClienteResult = {
  id: number;
  nombre: string;
  telefono: string;
  barrio: string;
  limite_credito?: number;
  saldo_cc?: number;
};

export type CartItem = {
  producto_id: number;
  variante_id?: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  esPromocional?: boolean;
  precio_venta_minorista?: number;
  precioManual?: boolean;
  precioBaseVariante?: number;
};

export type CreateVentaData = {
  cliente_id: number;
  metodo_pago: string;
  descuento: number;
  items: CartItem[];
  entrega?: number;
};

export type CreateVentaResult = {
  success: boolean;
  ventaId?: number;
  mensaje?: string;
  error?: string;
};

function nowSqliteLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(" ");
}

export async function getProductosByIdsAction(ids: number[]): Promise<ProductoResult[]> {
  if (!ids.length) return [];

  const results: ProductoResult[] = [];
  for (const id of ids) {
    const [row] = await db
      .select({
        id: productos.id,
        tipo: productos.tipo,
        marca: productos.marca,
        descripcion: productos.descripcion,
        precio_venta_minorista: productos.precio_venta_minorista,
        precio_venta_mayorista: productos.precio_venta_mayorista,
        codigo_barras: productos.codigo_barras,
        stock: productos.stock,
      })
      .from(productos)
      .where(eq(productos.id, id))
      .limit(1);

    if (row) results.push(row);
  }

  return results;
}

export async function searchProductosAction(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) return [];

  const words = query.trim().split(/\s+/).filter(Boolean);
  
  // 1. Buscar productos que coincidan
  const productConditions = words.map(word => 
    or(
      like(productos.tipo, `%${word}%`),
      like(productos.marca, `%${word}%`),
      like(productos.descripcion, `%${word}%`),
      like(productos.codigo_barras, `%${word}%`),
      like(productos.familia, `%${word}%`),
      like(productos.rubro, `%${word}%`)
    )
  );

  const prods = await db
    .select()
    .from(productos)
    .where(
      and(
        or(isNull(productos.activo), eq(productos.activo, 1)),
        ...productConditions
      )
    )
    .limit(30);

  // 2. Buscar variantes que coincidan por código de barras o nombre
  const variantConditions = words.map(word => 
    or(
      like(variantes_producto.nombre, `%${word}%`),
      like(variantes_producto.codigo_barras, `%${word}%`)
    )
  );

  const variantsMatched = await db
    .select({
      producto_id: variantes_producto.producto_id
    })
    .from(variantes_producto)
    .where(and(...variantConditions))
    .limit(30);

  const extraProductIds = [...new Set(variantsMatched.map(v => v.producto_id))];
  
  // Si encontramos variantes pero sus productos no están en la lista original, los traemos
  const currentProdIds = prods.map(p => p.id);
  const missingProdIds = extraProductIds.filter(id => !currentProdIds.includes(id));
  
  if (missingProdIds.length > 0) {
    const extraProds = await db
      .select()
      .from(productos)
      .where(inArray(productos.id, missingProdIds));
    prods.push(...extraProds);
  }

  if (prods.length === 0) return [];

  // 3. Obtener todas las variantes de los productos encontrados (Optimizado: 1 sola query)
  const allVariants = await db
    .select()
    .from(variantes_producto)
    .where(inArray(variantes_producto.producto_id, prods.map(p => p.id)));

  // 4. Mapear
  return prods.map(p => ({
    ...p,
    variantes: allVariants.filter(v => v.producto_id === p.id)
  }));
}

import { inArray } from "drizzle-orm";

export async function ensureClienteAnonimoAction(): Promise<number> {
  const [existing] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.dni, "ANON"))
    .limit(1);

  if (existing) return existing.id;

  const [inserted] = await db
    .insert(clientes)
    .values({
      nombre: "Cliente Anónimo",
      telefono: "",
      dni: "ANON",
      barrio: "",
      puntos: 0,
      nivel: "Bronce",
      descuento_activo: 0,
    })
    .returning({ id: clientes.id });

  return inserted.id;
}

export async function getPrecioPromocionalForClientAction(
  producto_id: number,
  cantidad: number,
  cliente_id: number | null
): Promise<{ precio: number | null; esPromocional: boolean }> {
  let cliente_puntos = 0;
  let descuento_manual = false;

  if (cliente_id) {
    const [cliente] = await db
      .select({ puntos: clientes.puntos, descuento_activo: clientes.descuento_activo })
      .from(clientes)
      .where(eq(clientes.id, cliente_id))
      .limit(1);
    
    if (cliente) {
      cliente_puntos = cliente.puntos || 0;
      descuento_manual = cliente.descuento_activo === 1;
    }
  }

  const precioPromocional = await obtenerPrecioPromocional(
    producto_id,
    cantidad,
    cliente_puntos,
    descuento_manual
  );

  return {
    precio: precioPromocional,
    esPromocional: precioPromocional !== null,
  };
}

export async function searchClientesAction(query: string): Promise<ClienteResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  return db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      barrio: clientes.barrio,
      limite_credito: clientes.limite_credito,
      saldo_cc: cuentas_corrientes.saldo_actual,
    })
    .from(clientes)
    .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
    .where(
      or(
        like(clientes.nombre, `%${q}%`),
        like(clientes.dni, `%${q}%`),
        like(clientes.telefono, `%${q}%`)
      )
    )
    .limit(8) as Promise<ClienteResult[]>;
}

export async function createVentaAction(data: CreateVentaData): Promise<CreateVentaResult> {
  try {
    if (!data.items.length) return { success: false, error: "El carrito está vacío" };

    const items = data.items.map((item) => ({
      ...item,
      cantidad: Math.max(1, Math.floor(Number(item.cantidad) || 0)),
      precio: Math.max(0, Number(item.precio) || 0),
    }));

    if (items.some((item) => item.precio <= 0)) {
      return { success: false, error: "Hay productos con precio inválido" };
    }

    const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
    const descuento = Math.max(0, Math.min(Number(data.descuento) || 0, subtotal));
    const total = Math.max(0, subtotal - descuento);

    const [clienteInfo] = await db
      .select({ dni: clientes.dni })
      .from(clientes)
      .where(eq(clientes.id, data.cliente_id))
      .limit(1);

    if (!clienteInfo) {
      return { success: false, error: "Cliente no encontrado" };
    }

    const esAnonimo = clienteInfo.dni === "ANON";

    if (data.metodo_pago === "Cuenta Corriente" && esAnonimo) {
      return { success: false, error: "Para Cuenta Corriente debe seleccionar un cliente válido" };
    }

    // Validar límite de crédito para cuenta corriente
    if (data.metodo_pago === "Cuenta Corriente") {
      const [clienteCC] = await db
        .select({
          limite_credito: clientes.limite_credito,
          saldo_actual: cuentas_corrientes.saldo_actual,
        })
        .from(clientes)
        .leftJoin(cuentas_corrientes, eq(clientes.id, cuentas_corrientes.cliente_id))
        .where(eq(clientes.id, data.cliente_id))
        .limit(1);

      const limiteCredito = clienteCC?.limite_credito || 10000;
      const saldoActual = clienteCC?.saldo_actual || 0;
      const nuevoSaldo = saldoActual + total;

      if (nuevoSaldo > limiteCredito) {
        return { 
          success: false, 
          error: `Límite de crédito excedido. Límite: ${formatCurrency(limiteCredito)}, Saldo actual: ${formatCurrency(saldoActual)}, Intenta agregar: ${formatCurrency(total)}` 
        };
      }
    }

    const ventaId = db.transaction((tx) => {
      const fecha = nowSqliteLocal();
      const productosVenta = items.map((item) => {
        const producto = tx
          .select({
            id: productos.id,
            stock: productos.stock,
            activo: productos.activo,
            precio_costo: productos.precio_costo,
          })
          .from(productos)
          .where(eq(productos.id, item.producto_id))
          .limit(1)
          .get();

        if (!producto || producto.activo === 0) {
          throw new Error(`Producto no disponible: ${item.nombre}`);
        }

        // Permitir ventas con stock 0 o negativo
        return { ...item, precio_costo: producto.precio_costo };
      });

      const newVenta = tx
        .insert(ventas)
        .values({
          cliente_id: data.cliente_id,
          total,
          fecha,
          metodo_pago: data.metodo_pago,
          descuento,
          tipo: "venta",
        })
        .returning({ id: ventas.id })
        .get();

      tx.insert(detalle_venta).values(
        productosVenta.map((item) => ({
          venta_id: newVenta.id,
          producto_id: item.producto_id,
          variante_id: item.variante_id, // Nuevo campo
          cantidad: item.cantidad,
          subtotal: item.cantidad * item.precio,
          nombre_producto: item.nombre,
          precio_venta_historico: item.precio,
          precio_costo_historico: item.precio_costo ?? 0,
          tipo_linea: "producto",
        }))
      ).run();

      for (const item of productosVenta) {
        if (item.variante_id) {
          tx.update(variantes_producto)
            .set({ stock: sql`${variantes_producto.stock} - ${item.cantidad}` })
            .where(eq(variantes_producto.id, item.variante_id))
            .run();
        } else {
          tx.update(productos)
            .set({ stock: sql`${productos.stock} - ${item.cantidad}` })
            .where(and(eq(productos.id, item.producto_id), sql`${productos.stock} IS NOT NULL`))
            .run();
        }
      }

      if (data.metodo_pago === "Cuenta Corriente") {
        const entrega = data.entrega || 0;
        const montoDeuda = total - entrega;

        const cuenta = tx
          .select({ id: cuentas_corrientes.id })
          .from(cuentas_corrientes)
          .where(eq(cuentas_corrientes.cliente_id, data.cliente_id))
          .limit(1)
          .get();

        if (cuenta) {
          tx
            .update(cuentas_corrientes)
            .set({
              saldo_actual: sql`COALESCE(${cuentas_corrientes.saldo_actual}, 0) + ${montoDeuda}`,
              fecha_ultimo_movimiento: fecha,
            })
            .where(eq(cuentas_corrientes.id, cuenta.id))
            .run();
        } else {
          tx.insert(cuentas_corrientes).values({
            cliente_id: data.cliente_id,
            saldo_actual: montoDeuda,
            fecha_ultimo_movimiento: fecha,
          }).run();
        }

        // Registrar movimiento de Venta (por el total)
        tx.insert(movimientos_cuenta_corriente).values({
          cliente_id: data.cliente_id,
          tipo_movimiento: "venta",
          monto: total,
          descripcion: `Venta #${newVenta.id}`,
          fecha,
          detalles: JSON.stringify(
            productosVenta.map(({ producto_id, nombre, cantidad, precio }) => ({
              producto_id,
              nombre,
              cantidad,
              precio,
            }))
          ),
        }).run();

        // Si hubo entrega, registrar el movimiento de Pago (adelanto)
        if (entrega > 0) {
          tx.insert(movimientos_cuenta_corriente).values({
            cliente_id: data.cliente_id,
            tipo_movimiento: "pago",
            monto: entrega,
            descripcion: `Adelanto Venta #${newVenta.id}`,
            fecha,
          }).run();
        }
      }

      const puntosSumar = Math.floor(total / 100);
      if (puntosSumar > 0 && !esAnonimo) {
        tx
          .update(clientes)
          .set({ puntos: sql`COALESCE(${clientes.puntos}, 0) + ${puntosSumar}` })
          .where(eq(clientes.id, data.cliente_id))
          .run();
      }

      if (!esAnonimo) {
        const clienteActual = tx
          .select({ puntos: clientes.puntos })
          .from(clientes)
          .where(eq(clientes.id, data.cliente_id))
          .limit(1)
          .get();

        if (clienteActual) {
          const puntosTotales = clienteActual.puntos || 0;
          let nuevoNivel = "Bronce";
          if (puntosTotales >= 6000) nuevoNivel = "Platino";
          else if (puntosTotales >= 3000) nuevoNivel = "Oro";
          else if (puntosTotales >= 1000) nuevoNivel = "Plata";

          tx
            .update(clientes)
            .set({ nivel: nuevoNivel })
            .where(eq(clientes.id, data.cliente_id))
            .run();
        }
      }

      return newVenta.id;
    });

    revalidatePath("/");
    revalidatePath("/ventas");
    revalidatePath("/productos");
    revalidatePath("/clientes");

    const mensaje = data.metodo_pago === "Cuenta Corriente" 
      ? `Venta #${ventaId} registrada en cuenta corriente por ${formatCurrency(total)}`
      : `Venta #${ventaId} registrada correctamente`;

    return { success: true, ventaId, mensaje };
  } catch (error) {
    console.error("Error en createVentaAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar la venta",
    };
  }
}

export async function anularVentaAction(ventaId: number) {
  try {
    const venta = db.select().from(ventas).where(eq(ventas.id, ventaId)).get();
    if (!venta) throw new Error("Venta no encontrada");
    if (venta.estado === 'anulado') throw new Error("La venta ya está anulada");

    const detalles = db.select().from(detalle_venta).where(eq(detalle_venta.venta_id, ventaId)).all();

    db.transaction((tx) => {
      // 1. Marcar venta como anulada
      tx.update(ventas).set({ estado: 'anulado' }).where(eq(ventas.id, ventaId)).run();

      // 2. Restaurar stock de productos y variantes
      for (const item of detalles) {
        if (item.producto_id) {
          tx.update(productos)
            .set({ stock: sql`${productos.stock} + ${item.cantidad}` })
            .where(eq(productos.id, item.producto_id))
            .run();
        }
        if (item.variante_id) {
          tx.update(variantes_producto)
            .set({ stock: sql`${variantes_producto.stock} + ${item.cantidad}` })
            .where(eq(variantes_producto.id, item.variante_id))
            .run();
        }
      }

      // 3. Si fue Cuenta Corriente, revertir deuda
      if (venta.metodo_pago === 'Cuenta Corriente' && venta.cliente_id) {
        tx.update(cuentas_corrientes)
          .set({ saldo_actual: sql`${cuentas_corrientes.saldo_actual} - ${venta.total}` })
          .where(eq(cuentas_corrientes.cliente_id, venta.cliente_id))
          .run();

        tx.insert(movimientos_cuenta_corriente).values({
          cliente_id: venta.cliente_id,
          tipo_movimiento: 'ajuste',
          monto: venta.total,
          descripcion: `ANULACIÓN Venta #${venta.id}`,
          fecha: nowSqliteLocal(),
        }).run();
      }

      // 4. Revertir puntos de fidelidad (si no es anónimo)
      const puntosRestar = Math.floor((venta.total || 0) / 100);
      if (puntosRestar > 0 && venta.cliente_id) {
        tx.update(clientes)
          .set({ puntos: sql`MAX(0, COALESCE(${clientes.puntos}, 0) - ${puntosRestar})` })
          .where(eq(clientes.id, venta.cliente_id))
          .run();
      }
    });

    revalidatePath("/ventas");
    revalidatePath("/productos");
    revalidatePath("/clientes");
    revalidatePath("/cuentas-corrientes");
    
    return { success: true, mensaje: "Venta anulada correctamente" };
  } catch (error: any) {
    console.error("Error al anular venta:", error);
    return { success: false, error: error.message };
  }
}
