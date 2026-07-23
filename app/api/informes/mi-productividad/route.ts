import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const userId = (session.user as any).id as string;

    const conditions: string[] = [`o."tecnicoId" = '${userId}'`];
    if (desde) conditions.push(`o."fechaIngreso" >= '${desde}T00:00:00'`);
    if (hasta) conditions.push(`o."fechaIngreso" <= '${hasta}T23:59:59'`);

    const where = `WHERE ${conditions.join(" AND ")}`;

    const resumen = await (prisma as any).$queryRawUnsafe(`
      SELECT
        COUNT(o.id)::int AS "totalOrdenes",
        COUNT(CASE WHEN o.estado IN ('TERMINADO','ENTREGADO') THEN 1 END)::int AS "terminadas",
        COUNT(CASE WHEN o.estado = 'CANCELADO' THEN 1 END)::int AS "canceladas",
        COUNT(CASE WHEN o.estado = 'NO_REPARABLE' THEN 1 END)::int AS "noReparables",
        ROUND(AVG(CASE WHEN o.estado IN ('TERMINADO','ENTREGADO') AND o."fechaCierre" IS NOT NULL
          THEN EXTRACT(DAY FROM o."fechaCierre" - o."fechaIngreso") END))::int AS "promedioDias",
        COALESCE(SUM(CASE WHEN o.estado IN ('TERMINADO','ENTREGADO') THEN o."costoTecnico" ELSE 0 END), 0) AS "montoTotal"
      FROM "OrdenTrabajo" o
      ${where}
    `);

    const porEstado = await (prisma as any).$queryRawUnsafe(`
      SELECT o.estado, COUNT(o.id)::int AS cantidad
      FROM "OrdenTrabajo" o
      ${where}
      GROUP BY o.estado
      ORDER BY cantidad DESC
    `);

    const s = (resumen as any[])[0] ?? {};

    return NextResponse.json({
      totalOrdenes: s.totalOrdenes ?? 0,
      terminadas: s.terminadas ?? 0,
      canceladas: s.canceladas ?? 0,
      noReparables: s.noReparables ?? 0,
      promedioDias: s.promedioDias ?? 0,
      montoTotal: Number(s.montoTotal ?? 0),
      porEstado: porEstado as any[],
    });
  } catch (e: any) {
    console.error("mi-productividad error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}
