import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).type !== "cliente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clienteId = (session.user as any).id as string;

  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    include: {
      marca: { select: { nombre: true } },
      historial: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { estado: true, nota: true, createdAt: true },
      },
    },
  });

  const ordenesPublicas = ordenes.map((o) => ({
    id: o.id,
    numero: o.numero,
    estado: o.estado,
    tipoEquipo: o.tipoEquipo,
    modelo: o.modelo,
    marca: o.marca?.nombre ?? null,
    fechaIngreso: o.fechaIngreso,
    fechaEstimada: o.fechaEstimada,
    observacionesCliente: o.observacionesCliente,
    historial: o.historial,
    presupuestoId: o.presupuestoId,
  }));

  return NextResponse.json(ordenesPublicas);
}
