import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Fechas requeridas" }, { status: 400 });
  }

  // Usar offset Argentina UTC-3 para que el rango cubra el día calendario local completo
  const fechaDesde = new Date(`${desde}T00:00:00-03:00`);
  const fechaHasta = new Date(`${hasta}T23:59:59-03:00`);

  const raw = await prisma.ordenTrabajo.findMany({
    where: {
      fechaIngreso: { gte: fechaDesde, lte: fechaHasta },
      costoTecnico: { not: null },
    },
    include: {
      cliente: { select: { nombre: true } },
      marca:   { select: { nombre: true } },
      tecnico: { select: { nombre: true } },
    },
    orderBy: { fechaIngreso: "asc" },
  });

  // Filtrar costoTecnico > 0 en JS para evitar quirks de Prisma 7
  const ordenes = (raw as any[]).filter((o) => Number(o.costoTecnico) > 0);

  const empresa = await prisma.empresa.findFirst();

  return NextResponse.json({ ordenes, empresa });
}
