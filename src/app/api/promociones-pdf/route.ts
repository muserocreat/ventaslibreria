import { db } from "@/db";
import { promociones, productos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";

export async function GET() {
  try {
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
          })
          .from(productos)
          .where(eq(productos.id, promo.producto_id))
          .limit(1);
        return {
          ...promo,
          producto: prod?.nombre || `Producto #${promo.producto_id}`,
        };
      })
    );

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;

    // Header
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Promociones Vigentes", pageW / 2, 18, { align: "center" });

    let y = 38;

    // Table header
    doc.setFillColor(224, 247, 250);
    doc.rect(margin, y, contentW, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Producto", margin + 3, y + 7);
    doc.text("Cantidad Mínima", margin + 100, y + 7, { align: "center" });
    doc.text("Precio Promocional", margin + 155, y + 7, { align: "center" });

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentW, 10);
    y += 10;

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    for (const promo of promosWithNames) {
      if (y > 272) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${doc.getNumberOfPages()}`, pageW / 2, 290, { align: "center" });
        doc.addPage();
        y = 20;

        // Repeat header on new page
        doc.setFillColor(224, 247, 250);
        doc.rect(margin, y, contentW, 10, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text("Producto", margin + 3, y + 7);
        doc.text("Cantidad Mínima", margin + 100, y + 7, { align: "center" });
        doc.text("Precio Promocional", margin + 155, y + 7, { align: "center" });
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, contentW, 10);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }

      doc.setTextColor(33, 33, 33);
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentW, 9);

      doc.text(promo.producto.substring(0, 50), margin + 3, y + 6);
      doc.text(String(promo.cantidad_minima), margin + 100, y + 6, { align: "center" });
      doc.text(`$${promo.precio_promocional.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, margin + 155, y + 6, { align: "center" });

      y += 9;
    }

    if (promosWithNames.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("No hay promociones activas.", pageW / 2, y + 15, { align: "center" });
    }

    // Contact
    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 150, 243);
    doc.text("WhatsApp: 3704502575   |   Instagram: @delnorte_libreria", pageW / 2, y, { align: "center" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, pageW / 2, 290, { align: "center" });

    const pdfBytes = doc.output("arraybuffer");

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=promociones.pdf",
      },
    });
  } catch (error) {
    console.error("Error en promociones-pdf:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
