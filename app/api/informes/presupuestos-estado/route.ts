import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const conditions: string[] = [];
    if (desde) conditions.push(`p."fecha" >= '${desde}T00:00:00'`);
    if (hasta) conditions.push(`p."fecha" <= '${hasta}T23:59:59'`);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await (prisma as any).$queryRawUnsafe(`
      SELECT
        p.id,
        p.numero,
        p.fecha,
        p.estado,
        p.total,
        p."validezDias",
        c.nombre AS "clienteNombre",
        o.numero AS "ordenNumero"
      FROM "Presupuesto" p
      JOIN "Cliente" c ON c.id = p."clienteId"
      LEFT JOIN "OrdenTrabajo" o ON o."presupuestoId" = p.id
      ${where}
      ORDER BY p.estado, p.fecha DESC
    `);

    const resumen = await (prisma as any).$queryRawUnsafe(`
      SELECT
        p.estado,
        COUNT(p.id)::int AS cantidad,
        COALESCE(SUM(p.total), 0) AS total
      FROM "Presupuesto" p
      ${where}
      GROUP BY p.estado
      ORDER BY p.estado
    `);

    return NextResponse.json({
      rows: (rows as any[]).map(r => ({ ...r, total: Number(r.total) })),
      resumen: (resumen as any[]).map(r => ({ ...r, total: Number(r.total) })),
    });
  } catch (e: any) {
    console.error("presupuestos-estado error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", rows: [], resumen: [] }, { status: 500 });
  }
}
