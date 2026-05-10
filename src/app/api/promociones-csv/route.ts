import { db } from "@/db";
import { promociones, productos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const promos = await db
    .select()
    .from(promociones)
    .where(eq(promociones.activa, 1));

  // Get product names for each promo
  const promosWithNames = await Promise.all(
    promos.map(async (promo) => {
      const [prod] = await db
        .select({
          nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
          precio_venta_minorista: productos.precio_venta_minorista,
        })
        .from(productos)
        .where(eq(productos.id, promo.producto_id))
        .limit(1);
      
      const precioOriginal = prod?.precio_venta_minorista || 0;
      const ahorroPct = precioOriginal > 0
        ? Math.round(((precioOriginal - promo.precio_promocional) / precioOriginal) * 100)
        : 0;

      return {
        ...promo,
        producto: prod?.nombre || `Producto #${promo.producto_id}`,
        precio_original: precioOriginal,
        ahorro_pct: ahorroPct,
      };
    })
  );

  // Generate CSV
  const headers = ["Producto", "Cantidad Mínima", "Precio Original", "Precio Promocional", "Ahorro %", "Estado", "Fecha Expiración"];
  const rows = promosWithNames.map(p => [
    p.producto,
    p.cantidad_minima,
    p.precio_original,
    p.precio_promocional,
    `${p.ahorro_pct}%`,
    p.activa === 1 ? "Activa" : "Inactiva",
    p.fecha_expiracion || "Sin expiración",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=promociones.csv",
    },
  });
}
