import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "cliente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clienteId = (session.user as any).id as string;
  const { id, accion } = await req.json();

  if (!id || !["APROBADO", "RECHAZADO"].includes(accion)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const pres = await prisma.presupuesto.findFirst({
    where: { id, clienteId, estado: "PENDIENTE" },
  });

  if (!pres) {
    return NextResponse.json({ error: "No encontrado o ya procesado" }, { status: 404 });
  }

  await prisma.presupuesto.update({
    where: { id },
    data: { estado: accion },
  });

  return NextResponse.json({ ok: true });
}
