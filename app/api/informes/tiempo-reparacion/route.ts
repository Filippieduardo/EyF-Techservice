import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: any = { estado: { in: ["TERMINADO", "ENTREGADO"] } };
  if (desde) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), gte: new Date(desde) };
  if (hasta) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), lte: new Date(hasta + "T23:59:59") };

  const ordenes = await prisma.ordenTrabajo.findMany({
    where,
    select: {
      fechaIngreso: true,
      fechaCambioEstado: true,
      costoTecnico: true,
      tecnico: { select: { id: true, nombre: true } },
    },
  });

  const map = new Map<string, { nombre: string; dias: number[]; monto: number }>();
  for (const o of ordenes) {
    const key = o.tecnico?.id ?? "sin-asignar";
    const nombre = o.tecnico?.nombre ?? "Sin asignar";
    if (!map.has(key)) map.set(key, { nombre, dias: [], monto: 0 });
    const entry = map.get(key)!;
    if (o.fechaCambioEstado) {
      const dias = Math.round((new Date(o.fechaCambioEstado).getTime() - new Date(o.fechaIngreso).getTime()) / 86400000);
      entry.dias.push(dias);
    }
    entry.monto += Number(o.costoTecnico ?? 0);
  }

  const rows = Array.from(map.entries()).map(([, v]) => ({
    tecnico: v.nombre,
    cantidad: v.dias.length,
    promedioDias: v.dias.length ? Math.round(v.dias.reduce((a, b) => a + b, 0) / v.dias.length) : 0,
    monto: v.monto,
  })).sort((a, b) => b.cantidad - a.cantidad);

  return NextResponse.json({ rows });
}
