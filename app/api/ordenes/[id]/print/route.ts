import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

// Forzar Node.js runtime (pdfkit no funciona en Edge)
export const runtime = "nodejs";

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMonto(n: number | null | undefined) {
  if (n == null) return "0.00";
  return Number(n).toFixed(2);
}

function buildPdf(orden: any, empresa: any): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require("pdfkit") as any;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: { Title: `Orden ${orden.numero}` },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      drawCopy(doc, orden, empresa, 10, "CLIENTE");

      // Línea de corte
      const cutY = 420;
      doc.save();
      doc.dash(3, { space: 3 });
      doc.moveTo(28, cutY).lineTo(567, cutY).lineWidth(0.5).strokeColor("#888888").stroke();
      doc.restore();
      doc.font("Helvetica").fontSize(8).fillColor("#888888").text("- - -  ✂  - - -", 240, cutY - 5, { lineBreak: false });

      drawCopy(doc, orden, empresa, cutY + 8, "EMPRESA");
    } catch (err) {
      reject(err);
    }

    doc.end();
  });
}

function drawCopy(doc: any, orden: any, empresa: any, offsetY: number, tipo: "CLIENTE" | "EMPRESA") {
  const L = 28;
  const R = 567;
  const W = R - L;
  const BOLD = "Helvetica-Bold";
  const REG  = "Helvetica";
  const BLACK = "#000000";
  const LGRAY = "#f2f2f2";
  const DGRAY = "#444444";

  let y = offsetY;

  // ── ENCABEZADO ────────────────────────────────────────────────────────
  doc.rect(L, y, W, 46).stroke(BLACK);

  // Logo empresa
  const logoFile = empresa?.logoPath
    ? path.join(process.cwd(), "public", empresa.logoPath)
    : path.join(process.cwd(), "public", "logo.jpeg");
  try { doc.image(logoFile, L + 4, y + 4, { width: 36, height: 36 }); } catch {}

  const empNombre = empresa?.nombre ?? "EyF TechService";
  doc.font(BOLD).fontSize(13).fillColor(BLACK).text(empNombre, L + 44, y + 5, { width: 260, lineBreak: false });
  doc.font(REG).fontSize(7).fillColor(DGRAY)
     .text(empresa?.domicilio ?? "", L + 44, y + 20, { width: 260, lineBreak: false });
  if (empresa?.telefono) {
    doc.font(REG).fontSize(7).fillColor(DGRAY)
       .text(empresa.telefono, L + 44, y + 31, { width: 260, lineBreak: false });
  }

  const waIcon = path.join(process.cwd(), "public", "icons", "WHATSAPP.png");
  try { doc.image(waIcon, R - 148, y + 11, { width: 22, height: 22 }); } catch {}
  const ventasLabel   = empresa?.whatsapp      ? `Ventas: ${empresa.whatsapp}`         : "";
  const stLabel       = empresa?.telServTecnico ? `S.Tecnico: ${empresa.telServTecnico}` : "";
  doc.font(REG).fontSize(7).fillColor(DGRAY)
     .text(ventasLabel, R - 123, y + 12, { width: 121 })
     .text(stLabel,     R - 123, y + 24, { width: 121 });
  y += 46;

  // ── BARRA ORDEN ───────────────────────────────────────────────────────
  doc.rect(L, y, W, 17).fill(BLACK);
  doc.font(BOLD).fontSize(11).fillColor("#ffffff")
     .text(`Orden Nº ${orden.numero}`, L + 4, y + 3, { width: 140, lineBreak: false });
  doc.font(REG).fontSize(7.5).fillColor("#ffffff")
     .text(`Fecha de INGRESO: ${fmt(orden.fechaIngreso)}`, L + 148, y + 5, { width: 185, lineBreak: false });
  const paraLabel = tipo === "CLIENTE" ? "PARA EL CLIENTE" : "PARA LA EMPRESA";
  doc.font(BOLD).fontSize(11).fillColor("#ffffff")
     .text(paraLabel, R - 145, y + 3, { width: 142, align: "right" });
  y += 17;

  // ── CLIENTE ───────────────────────────────────────────────────────────
  doc.rect(L, y, W, 11).fill(LGRAY).stroke("#cccccc");
  doc.font(BOLD).fontSize(7.5).fillColor(BLACK).text("Información del Cliente:", L + 3, y + 2);
  y += 11;

  doc.rect(L, y, W, 17).stroke("#cccccc");
  doc.font(REG).fontSize(8).fillColor(BLACK)
     .text(`Nombre: ${orden.cliente?.nombre ?? ""}`, L + 4, y + 4, { width: 200, lineBreak: false })
     .text(`DNI/CUIT: ${orden.cliente?.dniCuit ?? ""}`, L + 210, y + 4, { width: 160, lineBreak: false })
     .text(`Teléfono(s): ${orden.cliente?.telefono ?? ""}`, L + 375, y + 4, { width: 183, lineBreak: false });
  y += 17;

  // ── EQUIPAMIENTO ─────────────────────────────────────────────────────
  doc.rect(L, y, W, 11).fill(LGRAY).stroke("#cccccc");
  doc.font(BOLD).fontSize(7.5).fillColor(BLACK).text("Información del Equipamiento:", L + 3, y + 2);
  y += 11;

  doc.rect(L, y, W, 17).stroke("#cccccc");
  const tipoLabel  = (orden.tipoEquipo ?? "").replace(/_/g, " ");
  const marcaLabel = orden.marca?.nombre ?? "";
  const modeloLabel = orden.modelo ?? "";
  const serieLabel  = orden.numeroSerie ?? "";
  doc.font(REG).fontSize(8).fillColor(BLACK)
     .text(`Tipo: ${tipoLabel}`, L + 4, y + 4, { width: 130, lineBreak: false })
     .text(`Marca: ${marcaLabel}`, L + 138, y + 4, { width: 110, lineBreak: false })
     .text(`Modelo: ${modeloLabel}`, L + 252, y + 4, { width: 160, lineBreak: false })
     .text(`Nº Serie: ${serieLabel}`, L + 416, y + 4, { width: 142, lineBreak: false });
  y += 17;

  // ── TÉCNICA ───────────────────────────────────────────────────────────
  doc.rect(L, y, W, 11).fill(LGRAY).stroke("#cccccc");
  doc.font(BOLD).fontSize(7.5).fillColor(BLACK).text("Información Técnica:", L + 3, y + 2);
  y += 11;

  // Problema (expandido: sin Trabajo Realizado)
  const problema = (orden.descripcionProblema ?? "").trim();
  const probH = Math.max(50, doc.heightOfString(problema || " ", { width: W - 60, fontSize: 8 }) + 10);
  doc.rect(L, y, W, probH).stroke("#cccccc");
  doc.font(BOLD).fontSize(8).fillColor(BLACK).text("Problema:", L + 4, y + 4);
  if (problema) doc.font(REG).fontSize(8).text(problema, L + 58, y + 4, { width: W - 64 });
  y += probH;

  // ── FOOTER ────────────────────────────────────────────────────────────
  if (tipo === "CLIENTE") {
    const parte1 =
      "- Deficiencias en la instalación eléctrica en el domicilio del usuario, tales como cortocircuitos, excesos o caídas de tensión, tormentas, etc.\n" +
      "- Inundaciones, incendios, golpes o accidentes de cualquier naturaleza.  - Uso no conforme a lo especificado en el manual de instrucciones.\n" +
      "- Fallas no especificadas en la órden de trabajo y ajenas a la reparación actual.\n" +
      "La presente garantía dejará de tener validez cuando:\n" +
      "- Personal no autorizado haya revisado o reparado el equipo luego de ser retirado.  - Si hubiera dañado, alterado o retirado la faja de garantía.\n";
    const parte2 = "LA PRESENTE GARANTÍA CADUCA A LOS 30 (treinta) DÍAS DE RETIRADO EL EQUIPAMIENTO\n";
    const parte3 = "MUY IMPORTANTE: Si el equipo no fuese retirado dentro de los ";
    const parte4 = "90 (Noventa) días";
    const parte5 =
      " del Ingreso, se considerará abandonado, facultando a EyF TechService a disponer del mismo, desistiendo EL CLIENTE de realizar cualquier tipo de reclamo o solicitar indemnización alguna.\n" +
      "En la fecha, y en un todo de acuerdo con lo antedicho, EL CLIENTE firma la presente Orden, dando así su total consentimiento.";

    const garantiaFull = parte1 + parte2 + parte3 + parte4 + parte5;
    const bodyH = doc.heightOfString(garantiaFull, { width: W - 8, fontSize: 8.8 }) + 36;
    const presAbonado = Number(orden.presupuestoAbonado ?? 0);
    const headerRowH = presAbonado > 0 ? 28 : 18;
    const boxH  = headerRowH + bodyH;
    doc.rect(L, y, W, boxH).stroke(BLACK);

    // Fila superior: etiqueta | estado + presupuesto abonado
    const half = W / 2;
    doc.rect(L, y, half, headerRowH).fill(LGRAY).stroke("#cccccc");
    doc.rect(L + half, y, half, headerRowH).fill(BLACK);
    doc.font(BOLD).fontSize(7.5).fillColor(BLACK)
       .text("La presente garantía no ampara desperfectos por:", L + 4, y + 3, { width: half - 8, lineBreak: false });
    const estadoLabel = (orden.estado ?? "").replace(/_/g, " ");
    doc.font(BOLD).fontSize(8).fillColor("#ffffff")
       .text(`Estado: ${estadoLabel}`, L + half + 4, y + 3, { width: half - 8, lineBreak: false });
    if (presAbonado > 0) {
      doc.font(BOLD).fontSize(8).fillColor("#ffffff")
         .text(`Presupuesto Abonado: $${fmtMonto(presAbonado)}`, L + half + 4, y + 14, { width: half - 8, lineBreak: false });
    }
    y += headerRowH;

    // Cuerpo garantía con negritas intercaladas
    doc.font(REG).fontSize(8.8).fillColor(BLACK)
       .text(parte1, L + 4, y + 2, { width: W - 8, continued: true })
       .font(BOLD).text(parte2, { continued: true })
       .text(parte3, { continued: true })
       .font(BOLD).text(parte4, { continued: true })
       .font(REG).text(parte5, { continued: false });
    y += bodyH + 4;
  } else {
    // Cuadro negro Estado / Presupuesto Abonado (copia empresa)
    const presAbonadoE = Number(orden.presupuestoAbonado ?? 0);
    const hdrHE = presAbonadoE > 0 ? 28 : 18;
    const halfE = W / 2;
    doc.rect(L, y, W, hdrHE).stroke(BLACK);
    doc.rect(L, y, halfE, hdrHE).fill(LGRAY).stroke("#cccccc");
    doc.rect(L + halfE, y, halfE, hdrHE).fill(BLACK);
    doc.font(BOLD).fontSize(7.5).fillColor(BLACK)
       .text("Para uso interno:", L + 4, y + 3, { width: halfE - 8, lineBreak: false });
    const estadoLabelE = (orden.estado ?? "").replace(/_/g, " ");
    doc.font(BOLD).fontSize(8).fillColor("#ffffff")
       .text(`Estado: ${estadoLabelE}`, L + halfE + 4, y + 3, { width: halfE - 8, lineBreak: false });
    if (presAbonadoE > 0) {
      doc.font(BOLD).fontSize(8).fillColor("#ffffff")
         .text(`Presupuesto Abonado: $${fmtMonto(presAbonadoE)}`, L + halfE + 4, y + 14, { width: halfE - 8, lineBreak: false });
    }
    y += hdrHE;

    const imp1 = "Si el equipo no fuese retirado dentro de los ";
    const imp2 = "90 (Noventa) días";
    const imp3 =
      " del Ingreso, se considerará abandonado, facultando a EyF TechService " +
      "a disponer del mismo, desistiendo EL CLIENTE, de realizar cualquier tipo de reclamo o solicitar indemnización alguna.\n" +
      "En la fecha, y en un todo de acuerdo con lo antedicho, EL CLIENTE, firma la presente Orden, dando así su total consentimiento.";
    const importanteTexto = imp1 + imp2 + imp3;
    const impH = doc.heightOfString(importanteTexto, { width: W - 8, fontSize: 9 }) + 20;
    doc.rect(L, y, W, impH).stroke(BLACK);
    doc.font(BOLD).fontSize(7.5).fillColor(BLACK).text("MUY IMPORTANTE :", L + 4, y + 4);
    doc.font(REG).fontSize(9).fillColor(BLACK)
       .text(imp1, L + 4, y + 15, { width: W - 8, continued: true })
       .font(BOLD).text(imp2, { continued: true })
       .font(REG).text(imp3, { continued: false });
    y += impH;
  }

  // ── FIRMA ─────────────────────────────────────────────────────────────
  y += tipo === "CLIENTE" ? 48 : 72;
  const lineLen = 90;
  const c1 = L + 25, c2 = L + W / 2 - 45, c3 = R - 115;
  [c1, c2, c3].forEach((cx) => {
    doc.moveTo(cx, y).lineTo(cx + lineLen, y).lineWidth(0.5).strokeColor(BLACK).stroke();
    doc.font(REG).fontSize(7).fillColor(DGRAY);
  });
  doc.text("Firma del Cliente", c1, y + 2, { width: lineLen, align: "center" });
  doc.text("Aclaración", c2, y + 2, { width: lineLen, align: "center" });
  doc.text("D.N.I.", c3, y + 2, { width: lineLen, align: "center" });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const { id } = await params;
    const [orden, empresaRows] = await Promise.all([
      prisma.ordenTrabajo.findUnique({
        where: { id },
        include: {
          cliente: true,
          marca: { select: { id: true, nombre: true } },
          presupuesto: { select: { total: true } },
        },
      }),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Empresa" LIMIT 1`),
    ]);
    const empresa = empresaRows[0] ?? null;

    if (!orden) return new NextResponse("No encontrada", { status: 404 });

    const buffer = await buildPdf(orden, empresa);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="orden-${orden.numero}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("[PRINT ORDEN ERROR]", err);
    return new NextResponse(`Error generando PDF: ${err?.message ?? err}`, { status: 500 });
  }
}
