import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const ordenWhere: any = {};
  if (desde) ordenWhere.fechaIngreso = { ...(ordenWhere.fechaIngreso ?? {}), gte: new Date(desde) };
  if (hasta) ordenWhere.fechaIngreso = { ...(ordenWhere.fechaIngreso ?? {}), lte: new Date(hasta + "T23:59:59") };

  const clientes = await prisma.cliente.findMany({
    include: {
      ordenes: {
        where: ordenWhere,
        select: { costoTecnico: true, estado: true },
      },
    },
  });

  const rows = clientes
    .map(c => ({
      nombre: c.nombre,
      email: c.email ?? "—",
      telefono: c.telefono ?? "—",
      cantidadOrdenes: c.ordenes.length,
      ordenesTerminadas: c.ordenes.filter(o => ["TERMINADO", "ENTREGADO"].includes(o.estado)).length,
      montoTotal: c.ordenes.reduce((s, o) => s + Number(o.costoTecnico ?? 0), 0),
    }))
    .filter(c => c.cantidadOrdenes > 0)
    .sort((a, b) => b.cantidadOrdenes - a.cantidadOrdenes);

  return NextResponse.json({ rows });
}
