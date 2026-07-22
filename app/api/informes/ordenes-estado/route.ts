import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const tecnicoId = searchParams.get("tecnicoId") || undefined;

  const where: any = {};
  if (desde) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), gte: new Date(desde) };
  if (hasta) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), lte: new Date(hasta + "T23:59:59") };
  if (tecnicoId) where.tecnicoId = tecnicoId;

  const ordenes = await prisma.ordenTrabajo.groupBy({
    by: ["estado"],
    where,
    _count: { id: true },
  });

  const total = ordenes.reduce((s, r) => s + r._count.id, 0);
  const rows = ordenes
    .map(r => ({ estado: r.estado, cantidad: r._count.id, porcentaje: total ? Math.round((r._count.id / total) * 100) : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return NextResponse.json({ rows, total });
}
