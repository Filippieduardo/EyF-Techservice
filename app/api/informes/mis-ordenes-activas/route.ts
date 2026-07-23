import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as any).id as string;

    const rows = await (prisma as any).$queryRawUnsafe(`
      SELECT
        o.id,
        o.numero,
        o.estado,
        o."fechaIngreso",
        o."tipoEquipo",
        o.modelo,
        c.nombre AS "clienteNombre",
        m.nombre AS "marcaNombre",
        COALESCE((
          SELECT MAX(h."createdAt") FROM "HistorialEstado" h WHERE h."ordenId" = o.id
        ), o."fechaIngreso") AS "ultimoMovimiento",
        EXTRACT(DAY FROM NOW() - COALESCE((
          SELECT MAX(h."createdAt") FROM "HistorialEstado" h WHERE h."ordenId" = o.id
        ), o."fechaIngreso"))::int AS "diasSinMovimiento"
      FROM "OrdenTrabajo" o
      JOIN "Cliente" c ON c.id = o."clienteId"
      LEFT JOIN "Marca" m ON m.id = o."marcaId"
      WHERE o."tecnicoId" = '${userId}'
        AND o.estado NOT IN ('TERMINADO', 'ENTREGADO', 'CANCELADO', 'NO_REPARABLE')
      ORDER BY "diasSinMovimiento" DESC
    `);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("mis-ordenes-activas error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", rows: [] }, { status: 500 });
  }
}
