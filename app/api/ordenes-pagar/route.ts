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

  const role = (session.user as any).role as string;
  const userId = (session.user as any).id as string;

  const whereBase: any = {
    fechaIngreso: { gte: fechaDesde, lte: fechaHasta },
    costoTecnico: { not: null },
  };

  // Técnico solo ve sus órdenes con estado TERMINADO
  if (role === "TECNICO") {
    whereBase.tecnicoId = userId;
    whereBase.estado = "TERMINADO";
  }

  const raw = await prisma.ordenTrabajo.findMany({
    where: whereBase,
    include: {
      cliente: { select: { nombre: true } },
      marca:   { select: { nombre: true } },
      tecnico: { select: { nombre: true } },
      historial: { select: { estado: true } },
    },
    orderBy: { fechaIngreso: "asc" },
  });

  // Filtrar costoTecnico > 0 en JS para evitar quirks de Prisma 7
  let ordenes = (raw as any[]).filter((o) => Number(o.costoTecnico) > 0);

  // Técnico: excluir órdenes que tengan RMA, CANCELADO o NO_REPARABLE en su historial
  if (role === "TECNICO") {
    const estadosExcluidos = new Set(["RMA", "CANCELADO", "NO_REPARABLE"]);
    ordenes = ordenes.filter((o) =>
      !(o.historial as any[]).some((h) => estadosExcluidos.has(h.estado))
    );
  }

  // Quitar historial del resultado final
  ordenes = ordenes.map(({ historial: _, ...rest }) => rest);

  const empresa = await prisma.empresa.findFirst();

  return NextResponse.json({ ordenes, empresa });
}
