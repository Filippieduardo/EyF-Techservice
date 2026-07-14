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
      const cutY = 418;
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
  doc.rect(L, y, W, 36).stroke(BLACK);

  // Logo empresa
  const logoFile = empresa?.logoPath
    ? path.join(process.cwd(), "public", empresa.logoPath)
    : path.join(process.cwd(), "public", "logo.jpeg");
  try { doc.image(logoFile, L + 4, y + 4, { width: 28, height: 28 }); } catch {}

  const empNombre = empresa?.nombre ?? "EyF TechService";
  doc.font(BOLD).fontSize(13).fillColor(BLACK).text(empNombre, L + 36, y + 5, { width: 260, lineBreak: false });
  doc.font(REG).fontSize(7).fillColor(DGRAY).text(empresa?.domicilio ?? "", L + 36, y + 20, { width: 260 });

  const waIcon = path.join(process.cwd(), "public", "icons", "WHATSAPP.png");
  try { doc.image(waIcon, R - 148, y + 7, { width: 22, height: 22 }); } catch {}
  const tel  = empresa?.telefono  ? `Tel: ${empresa.telefono}` : "";
  const whap = empresa?.whatsapp  ? `WA: ${empresa.whatsapp}`  : "";
  doc.font(REG).fontSize(7).fillColor(DGRAY)
     .text(tel,  R - 123, y + 8,  { width: 121 })
     .text(whap, R - 123, y + 18, { width: 121 });
  y += 36;

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

  // Problema
  const problema = (orden.descripcionProblema ?? "").trim();
  const probH = Math.max(28, doc.heightOfString(problema || " ", { width: W - 60, fontSize: 8 }) + 10);
  doc.rect(L, y, W, probH).stroke("#cccccc");
  doc.font(BOLD).fontSize(8).fillColor(BLACK).text("Problema:", L + 4, y + 4);
  if (problema) doc.font(REG).fontSize(8).text(problema, L + 58, y + 4, { width: W - 64 });
  y += probH;

  // Trabajo Realizado
  const trabajo = (orden.trabajoRealizado ?? "").trim();
  const traH = Math.max(32, doc.heightOfString(trabajo || " ", { width: W - 90, fontSize: 8 }) + 10);
  doc.rect(L, y, W, traH).stroke("#cccccc");
  doc.font(BOLD).fontSize(8).fillColor(BLACK).text("Trabajo\nRealizado:", L + 4, y + 4);
  if (trabajo) doc.font(REG).fontSize(8).text(trabajo, L + 90, y + 4, { width: W - 96 });
  y += traH;

  // ── FOOTER ────────────────────────────────────────────────────────────
  if (tipo === "CLIENTE") {
    const garantiaBody =
      "- Deficiencias en la instalación eléctrica en el domicilio del usuario, tales como cortocircuitos, excesos o caídas de tensión, tormentas, etc.\n" +
      "- Inundaciones, incendios, golpes o accidentes de cualquier naturaleza.  - Uso no conforme a lo especificado en el manual de instrucciones.\n" +
      "- Fallas no especificadas en la órden de trabajo y ajenas a la reparación actual.\n" +
      "La presente garantía dejará de tener validez cuando:\n" +
      "- Personal no autorizado haya revisado o reparado el equipo luego de ser retirado.  - Si hubiera dañado, alterado o retirado la faja de garantía.\n" +
      "LA PRESENTE GARANTÍA CADUCA A LOS 30 (treinta) DÍAS DE RETIRADO EL EQUIPAMIENTO\n" +
      "MUY IMPORTANTE: Si el equipo no fuese retirado dentro de los 90 (Noventa) días del Ingreso, se considerará abandonado, " +
      "facultando a EyF TechService a disponer del mismo, desistiendo EL CLIENTE de realizar cualquier tipo de reclamo o solicitar indemnización alguna.\n" +
      "En la fecha, y en un todo de acuerdo con lo antedicho, EL CLIENTE firma la presente Orden, dando así su total consentimiento.";

    const bodyH = doc.heightOfString(garantiaBody, { width: W - 8, fontSize: 8.8 }) + 36;
    const boxH  = 14 + bodyH;
    doc.rect(L, y, W, boxH).stroke(BLACK);

    // Fila superior: etiqueta | importe+estado
    const half = W / 2;
    doc.rect(L, y, half, 14).fill(LGRAY).stroke("#cccccc");
    doc.rect(L + half, y, half, 14).fill(BLACK);
    doc.font(BOLD).fontSize(7.5).fillColor(BLACK)
       .text("La presente garantía no ampara desperfectos por:", L + 4, y + 3, { width: half - 8, lineBreak: false });
    const estadoLabel = (orden.estado ?? "").replace(/_/g, " ");
    doc.font(BOLD).fontSize(8).fillColor("#ffffff")
       .text(`Importe $: ${fmtMonto(orden.costoTecnico)}     Estado: ${estadoLabel}`,
             L + half + 4, y + 3, { width: half - 8 });
    y += 14;

    doc.font(REG).fontSize(8.8).fillColor(BLACK)
       .text(garantiaBody, L + 4, y + 2, { width: W - 8 });
    y += bodyH + 4;
  } else {
    const importanteTexto =
      "Si el equipo no fuese retirado dentro de los 90 (Noventa) días del Ingreso, se considerará abandonado, facultando a EyF TechService " +
      "a disponer del mismo, desistiendo EL CLIENTE, de realizar cualquier tipo de reclamo o solicitar indemnización alguna.\n" +
      "En la fecha, y en un todo de acuerdo con lo antedicho, EL CLIENTE, firma la presente Orden, dando así su total consentimiento.";
    const impH = doc.heightOfString(importanteTexto, { width: W - 8, fontSize: 9 }) + 20;
    doc.rect(L, y, W, impH).stroke(BLACK);
    doc.font(BOLD).fontSize(7.5).fillColor(BLACK).text("MUY IMPORTANTE :", L + 4, y + 4);
    doc.font(REG).fontSize(9).text(importanteTexto, L + 4, y + 15, { width: W - 8 });
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
    const [orden, empresa] = await Promise.all([
      prisma.ordenTrabajo.findUnique({
        where: { id },
        include: {
          cliente: true,
          marca: { select: { id: true, nombre: true } },
          presupuesto: { select: { total: true } },
        },
      }),
      prisma.empresa.findFirst(),
    ]);

    if (!orden) return new NextResponse("No encontrada", { status: 404 });

    const buffer = await buildPdf(orden, empresa);

    return new NextResponse(buffer, {
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
