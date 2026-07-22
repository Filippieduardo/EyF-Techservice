import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: any = { tipo: "SALIDA" };
  if (desde) where.fecha = { ...(where.fecha ?? {}), gte: new Date(desde) };
  if (hasta) where.fecha = { ...(where.fecha ?? {}), lte: new Date(hasta + "T23:59:59") };

  const movimientos = await prisma.movimientoStock.findMany({
    where,
    include: { repuesto: { select: { descripcion: true, numeroParte: true, categoria: true } } },
  });

  const map = new Map<string, { descripcion: string; numeroParte: string | null; categoria: string; cantidad: number; movimientos: number }>();
  for (const m of movimientos) {
    const key = m.repuestoId;
    if (!map.has(key)) map.set(key, { descripcion: m.repuesto.descripcion, numeroParte: m.repuesto.numeroParte, categoria: m.repuesto.categoria, cantidad: 0, movimientos: 0 });
    const e = map.get(key)!;
    e.cantidad += m.cantidad;
    e.movimientos++;
  }

  const rows = Array.from(map.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 20);

  return NextResponse.json({ rows });
}
