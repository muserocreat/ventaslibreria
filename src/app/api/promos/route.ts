import { db } from "@/db";
import { promociones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const promos = await db
    .select({
      producto_id: promociones.producto_id,
      cantidad_minima: promociones.cantidad_minima,
      precio_promocional: promociones.precio_promocional,
    })
    .from(promociones)
    .where(eq(promociones.activa, 1));

  return NextResponse.json(promos);
}
