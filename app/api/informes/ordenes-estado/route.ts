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
    const tecnicoId = searchParams.get("tecnicoId") || null;
    const role = (session.user as any).role as string;

    const conditions: string[] = [];
    if (desde) conditions.push(`o."fechaIngreso" >= '${desde}T00:00:00'`);
    if (hasta) conditions.push(`o."fechaIngreso" <= '${hasta}T23:59:59'`);
    if (tecnicoId) conditions.push(`o."tecnicoId" = '${tecnicoId}'`);

    // Técnico: excluir órdenes asignadas a ADMIN
    if (role === "TECNICO") {
      conditions.push(`(o."tecnicoId" IS NULL OR u.role = 'TECNICO')`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await (prisma as any).$queryRawUnsafe(`
      SELECT o.estado, COUNT(o.id)::int AS cantidad
      FROM "OrdenTrabajo" o
      LEFT JOIN "User" u ON u.id = o."tecnicoId"
      ${where}
      GROUP BY o.estado
      ORDER BY cantidad DESC
    `);

    const total = (rows as any[]).reduce((s: number, r: any) => s + r.cantidad, 0);
    const result = (rows as any[]).map((r: any) => ({
      estado: r.estado,
      cantidad: r.cantidad,
      porcentaje: total ? Math.round((r.cantidad / total) * 100) : 0,
    }));

    return NextResponse.json({ rows: result, total });
  } catch (e: any) {
    console.error("ordenes-estado error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", rows: [], total: 0 }, { status: 500 });
  }
}
