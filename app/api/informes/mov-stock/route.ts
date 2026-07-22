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

  const movimientos = await prisma.movimientoStock.findMany({
    where,
    include: {
      repuesto: { select: { descripcion: true, numeroParte: true, categoria: true } },
      user: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });

  const rows = movimientos.map(m => ({
    fecha: m.fecha,
    tipo: m.tipo,
    descripcion: m.repuesto.descripcion,
    numeroParte: m.repuesto.numeroParte,
    categoria: m.repuesto.categoria,
    cantidad: m.cantidad,
    precioUnitario: Number(m.precioUnitario ?? 0),
    total: m.cantidad * Number(m.precioUnitario ?? 0),
    usuario: m.user?.nombre ?? "—",
    notas: m.notas,
  }));

  const totalEntradas = rows.filter(r => r.tipo === "ENTRADA").reduce((s, r) => s + r.cantidad, 0);
  const totalSalidas = rows.filter(r => r.tipo === "SALIDA").reduce((s, r) => s + r.cantidad, 0);

  return NextResponse.json({ rows, totalEntradas, totalSalidas });
}
