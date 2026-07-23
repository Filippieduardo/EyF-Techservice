import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dias = parseInt(req.nextUrl.searchParams.get("dias") ?? "7");
  const corte = new Date(Date.now() - dias * 86400000);

  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { estado: { notIn: ["TERMINADO", "ENTREGADO", "CANCELADO", "NO_REPARABLE"] } },
    include: {
      cliente: { select: { nombre: true } },
      tecnico: { select: { nombre: true } },
      historial: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { fechaIngreso: "asc" },
  });

  const rows = ordenes
    .filter(o => {
      const ultima = o.historial[0]?.createdAt ?? o.fechaIngreso;
      return new Date(ultima) < corte;
    })
    .map(o => {
      const ultima = o.historial[0]?.createdAt ?? o.fechaIngreso;
      const diasSin = Math.floor((Date.now() - new Date(ultima).getTime()) / 86400000);
      return {
        numero: o.numero,
        cliente: o.cliente.nombre,
        estado: o.estado,
        tecnico: o.tecnico?.nombre ?? "—",
        fechaIngreso: o.fechaIngreso,
        ultimoMovimiento: ultima,
        diasSinMovimiento: diasSin,
      };
    });

  return NextResponse.json({ rows, dias });
}
