import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: any = {};
  if (desde) where.fecha = { ...(where.fecha ?? {}), gte: new Date(desde) };
  if (hasta) where.fecha = { ...(where.fecha ?? {}), lte: new Date(hasta + "T23:59:59") };

  const presupuestos = await prisma.presupuesto.groupBy({
    by: ["estado"],
    where,
    _count: { id: true },
    _sum: { total: true },
  });

  const total = presupuestos.reduce((s, r) => s + r._count.id, 0);
  const rows = presupuestos.map(r => ({
    estado: r.estado,
    cantidad: r._count.id,
    monto: Number(r._sum.total ?? 0),
    porcentaje: total ? Math.round((r._count.id / total) * 100) : 0,
  })).sort((a, b) => b.cantidad - a.cantidad);

  return NextResponse.json({ rows, total });
}
