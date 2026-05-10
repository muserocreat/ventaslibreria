"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const execFileAsync = promisify(execFile);
const PROVEEDOR_URL = "https://www.libreriamayorista.com.ar/uploads/casa_paso.xls";
const DEFAULT_MARGIN_MINORISTA = 30;
const DEFAULT_MARGIN_MAYORISTA_DELTA = 10;

type ProveedorItem = {
  codigo: string;
  nombre: string;
  precioCosto: number;
};

export type PrecioCambio = {
  productoId: number;
  codigo: string;
  nombre: string;
  proveedorNombre: string;
  costoActual: number;
  costoProveedor: number;
  costoAplicado: number;
  minoristaActual: number;
  mayoristaActual: number;
  minoristaNuevo: number;
  mayoristaNuevo: number;
  diferencia: number;
  accion: "sube" | "baja" | "igual";
};

export type PreciosPreviewState = {
  ok: boolean;
  error?: string;
  generatedAt?: string;
  proveedorFilas?: number;
  productosComparados?: number;
  cambios?: PrecioCambio[];
};

export type AplicarPreciosResult = {
  ok: boolean;
  error?: string;
  actualizados?: number;
};

function toNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function roundUpToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}

function calcularPrecioVenta(nuevoCosto: number, costoActual: number, ventaActual: number, mayorista = false) {
  const defaultMargin = mayorista
    ? Math.max(DEFAULT_MARGIN_MINORISTA - DEFAULT_MARGIN_MAYORISTA_DELTA, 0)
    : DEFAULT_MARGIN_MINORISTA;
  const factor = costoActual > 0 && ventaActual > 0
    ? ventaActual / costoActual
    : 1 + defaultMargin / 100;

  return roundUpToHundred(nuevoCosto * factor);
}

async function descargarListaProveedor(): Promise<ProveedorItem[]> {
  const script = `
import io
import json
import requests
import pandas as pd

url = ${JSON.stringify(PROVEEDOR_URL)}
response = requests.get(url, timeout=45)
response.raise_for_status()

df = pd.read_excel(io.BytesIO(response.content), header=None, skiprows=69, usecols=[0, 1, 2])
df.columns = ["codigo", "nombre", "precioCosto"]
df = df.dropna(subset=["codigo", "precioCosto"])
df["codigo"] = df["codigo"].astype(str).str.strip()
df["nombre"] = df["nombre"].fillna("").astype(str).str.strip()
df["precioCosto"] = pd.to_numeric(df["precioCosto"], errors="coerce")
df = df.dropna(subset=["precioCosto"])
df = df[df["codigo"] != ""]

print(json.dumps(df.to_dict("records"), ensure_ascii=False))
`;

  const { stdout } = await execFileAsync("python", ["-c", script], {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });

  return JSON.parse(stdout) as ProveedorItem[];
}

export async function generarPreviewPreciosAction(): Promise<PreciosPreviewState> {
  try {
    const proveedorItems = await descargarListaProveedor();
    const proveedorPorCodigo = new Map<string, ProveedorItem>();

    for (const item of proveedorItems) {
      const current = proveedorPorCodigo.get(item.codigo);
      if (!current || item.precioCosto > current.precioCosto) {
        proveedorPorCodigo.set(item.codigo, item);
      }
    }

    const productosDb = await db
      .select({
        id: productos.id,
        codigo_barras: productos.codigo_barras,
        tipo: productos.tipo,
        marca: productos.marca,
        descripcion: productos.descripcion,
        precio_costo: productos.precio_costo,
        precio_venta_minorista: productos.precio_venta_minorista,
        precio_venta_mayorista: productos.precio_venta_mayorista,
      })
      .from(productos)
      .where(sql`${productos.codigo_barras} IS NOT NULL AND ${productos.codigo_barras} != ''`);

    const cambios = productosDb
      .map((producto): PrecioCambio | null => {
        const codigo = producto.codigo_barras?.trim();
        if (!codigo) return null;

        const proveedor = proveedorPorCodigo.get(codigo);
        if (!proveedor) return null;

        const costoActual = toNumber(producto.precio_costo);
        const costoProveedor = toNumber(proveedor.precioCosto);
        const costoAplicado = Math.max(costoActual, costoProveedor);
        const minoristaActual = toNumber(producto.precio_venta_minorista);
        const mayoristaActual = toNumber(producto.precio_venta_mayorista);
        const diferencia = costoProveedor - costoActual;
        const accion = diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : "igual";

        if (Math.abs(diferencia) <= 50) return null;

        return {
          productoId: producto.id,
          codigo,
          nombre: [producto.tipo, producto.marca, producto.descripcion].filter(Boolean).join(" "),
          proveedorNombre: proveedor.nombre,
          costoActual,
          costoProveedor,
          costoAplicado,
          minoristaActual,
          mayoristaActual,
          minoristaNuevo: calcularPrecioVenta(costoAplicado, costoActual, minoristaActual),
          mayoristaNuevo: calcularPrecioVenta(costoAplicado, costoActual, mayoristaActual, true),
          diferencia,
          accion,
        };
      })
      .filter((item): item is PrecioCambio => item !== null)
      .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      proveedorFilas: proveedorItems.length,
      productosComparados: productosDb.length,
      cambios,
    };
  } catch (error) {
    console.error("Error en generarPreviewPreciosAction:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo generar la actualización",
    };
  }
}

export async function aplicarPreciosAction(cambios: PrecioCambio[]): Promise<AplicarPreciosResult> {
  try {
    const aplicables = cambios.filter((cambio) => cambio.accion === "sube" && cambio.costoProveedor > cambio.costoActual);

    db.transaction((tx) => {
      for (const cambio of aplicables) {
        tx
          .update(productos)
          .set({
            precio_costo: cambio.costoAplicado,
            precio_venta_minorista: cambio.minoristaNuevo,
            precio_venta_mayorista: cambio.mayoristaNuevo,
          })
          .where(eq(productos.id, cambio.productoId))
          .run();
      }
    });

    revalidatePath("/productos");
    revalidatePath("/actualizar-precios");

    return { ok: true, actualizados: aplicables.length };
  } catch (error) {
    console.error("Error en aplicarPreciosAction:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudieron aplicar los precios",
    };
  }
}
