import { db } from "@/db";
import { promociones_combo, promociones_combo_items, productos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";

export async function GET() {
  const combos = await db
    .select()
    .from(promociones_combo)
    .where(eq(promociones_combo.activa, 1))
    .orderBy(sql`id DESC`);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Header
  function drawHeader() {
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, pageW, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Librería DEL NORTE", pageW / 2, 16, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Catálogo de Combos y Ofertas Especiales", pageW / 2, 28, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  function drawFooter(pageNum: number) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${pageNum} - Generado el ${new Date().toLocaleDateString("es-AR")}`,
      pageW / 2,
      290,
      { align: "center" }
    );
  }

  drawHeader();
  let y = 48;
  let page = 1;

  if (combos.length === 0) {
    doc.setFontSize(12);
    doc.text("No hay combos activos disponibles en este momento.", pageW / 2, y + 20, { align: "center" });
  } else {
    for (const combo of combos) {
      // Get items
      const items = await db
        .select({
          nombre: sql<string>`tipo || ' ' || marca || ' ' || descripcion`,
          cantidad: promociones_combo_items.cantidad,
        })
        .from(promociones_combo_items)
        .innerJoin(productos, eq(productos.id, promociones_combo_items.producto_id))
        .where(eq(promociones_combo_items.combo_id, combo.id));

      // Estimate height
      const itemsHeight = items.length * 7;
      const cardHeight = 12 + itemsHeight + 14 + (combo.fecha_expiracion ? 6 : 0) + 10;

      if (y + cardHeight > 275) {
        drawFooter(page);
        doc.addPage();
        page++;
        drawHeader();
        y = 48;
      }

      // Combo name
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text((combo.nombre || "Combo").toUpperCase(), margin, y);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 8;

      // Items
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      for (const item of items) {
        doc.text(`  - ${item.cantidad}x ${item.nombre}`, margin + 5, y);
        y += 7;
      }

      y += 3;

      // Price
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(39, 174, 96);
      const precio = combo.precio_combo.toLocaleString("es-AR", { minimumFractionDigits: 2 });
      doc.text(`PRECIO FINAL: $${precio}`, pageW - margin, y, { align: "right" });
      y += 6;

      // Expiration
      if (combo.fecha_expiracion) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text(`Válido hasta: ${new Date(combo.fecha_expiracion).toLocaleDateString("es-AR")}`, pageW - margin, y, { align: "right" });
        y += 6;
      }

      y += 10;
    }
  }

  // Contact footer
  if (y > 255) {
    drawFooter(page);
    doc.addPage();
    page++;
    drawHeader();
    y = 48;
  }

  y += 5;
  doc.setFillColor(231, 245, 237);
  doc.roundedRect(margin, y, contentW, 12, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(44, 62, 80);
  doc.text("WhatsApp: 3704502575  |  Instagram: @delnorte_libreria", pageW / 2, y + 8, { align: "center" });

  drawFooter(page);

  const pdfBytes = doc.output("arraybuffer");

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=Combos_Del_Norte.pdf",
    },
  });
}
