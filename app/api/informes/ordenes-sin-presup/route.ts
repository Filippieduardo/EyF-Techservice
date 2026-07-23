import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: any = { presupuestoId: null, diagnostico: { not: null } };
  if (desde) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), gte: new Date(desde) };
  if (hasta) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), lte: new Date(hasta + "T23:59:59") };

  const ordenes = await prisma.ordenTrabajo.findMany({
    where,
    select: {
      numero: true,
      estado: true,
      fechaIngreso: true,
      diagnostico: true,
      cliente: { select: { nombre: true } },
      tecnico: { select: { nombre: true } },
    },
    orderBy: { fechaIngreso: "desc" },
  });

  const rows = ordenes.map(o => ({
    numero: o.numero,
    cliente: o.cliente.nombre,
    estado: o.estado,
    tecnico: o.tecnico?.nombre ?? "—",
    fechaIngreso: o.fechaIngreso,
    diagnostico: o.diagnostico,
  }));

  return NextResponse.json({ rows });
}
