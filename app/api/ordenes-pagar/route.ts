import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json({ error: "Fechas requeridas" }, { status: 400 });
    }

    const role = (session.user as any).role as string;
    const userId = (session.user as any).id as string;

    const fechaDesde = `${desde}T00:00:00.000-03:00`;
    const fechaHasta = `${hasta}T23:59:59.999-03:00`;

    const tecnicoFilter = role === "TECNICO" ? `AND o."tecnicoId" = '${userId}'` : "";

    const rows = await (prisma as any).$queryRawUnsafe(`
      SELECT
        o.id,
        o.numero,
        o."fechaIngreso",
        o.estado,
        o."tipoEquipo",
        o.modelo,
        o."costoTecnico",
        o."presupuestoAbonado",
        o."trabajoRealizado",
        o."diagnostico",
        c.nombre AS "clienteNombre",
        m.nombre AS "marcaNombre",
        u.id     AS "tecnicoId",
        u.nombre AS "tecnicoNombre",
        u.role   AS "tecnicoRole"
      FROM "OrdenTrabajo" o
      JOIN "Cliente" c ON c.id = o."clienteId"
      LEFT JOIN "Marca" m ON m.id = o."marcaId"
      LEFT JOIN "User" u ON u.id = o."tecnicoId"
      WHERE o."fechaIngreso" >= '${fechaDesde}'
        AND o."fechaIngreso" <= '${fechaHasta}'
        AND o.estado = 'TERMINADO'
        AND o."costoTecnico" IS NOT NULL
        AND o."costoTecnico" > 0
        ${tecnicoFilter}
      ORDER BY o."fechaIngreso" ASC
    `);

    const ordenes = (rows as any[]).map((r) => ({
      id: r.id,
      numero: r.numero,
      fechaIngreso: r.fechaIngreso,
      estado: r.estado,
      tipoEquipo: r.tipoEquipo,
      modelo: r.modelo,
      costoTecnico: Number(r.costoTecnico ?? 0),
      presupuestoAbonado: Number(r.presupuestoAbonado ?? 0),
      trabajoRealizado: r.trabajoRealizado,
      diagnostico: r.diagnostico,
      cliente: { nombre: r.clienteNombre },
      marca: r.marcaNombre ? { nombre: r.marcaNombre } : null,
      tecnico: r.tecnicoId ? { id: r.tecnicoId, nombre: r.tecnicoNombre, role: r.tecnicoRole } : null,
    }));

    const empresa = await prisma.empresa.findFirst();

    return NextResponse.json({ ordenes, empresa });
  } catch (e: any) {
    console.error("ordenes-pagar error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", ordenes: [], empresa: null }, { status: 500 });
  }
}
