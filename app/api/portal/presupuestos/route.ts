import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).type !== "cliente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clienteId = (session.user as any).id as string;

  const [presupuestos, clienteRows] = await Promise.all([
    prisma.presupuesto.findMany({
      where: { clienteId },
      orderBy: { fecha: "desc" },
      include: {
        items: { select: { descripcion: true, cantidad: true, precioUnitario: true, precioTotal: true } },
        orden: { select: { numero: true, modelo: true, marca: { select: { nombre: true } } } },
      },
    }),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT nombre, "condicionIva", telefono, direccion, "dniCuit" FROM "Cliente" WHERE id = $1`, clienteId
    ),
  ]);

  const clienteData = clienteRows[0] ?? {};

  return NextResponse.json(presupuestos.map(p => ({
    ...p,
    clienteNombre: clienteData.nombre ?? "",
    clienteCondicionIva: clienteData.condicionIva ?? "CONS. FINAL",
    clienteTelefono: clienteData.telefono ?? null,
    clienteDireccion: clienteData.direccion ?? null,
    clienteDniCuit: clienteData.dniCuit ?? null,
  })));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "cliente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clienteId = (session.user as any).id as string;
  const { id, accion } = await req.json();

  if (!["APROBADO", "RECHAZADO"].includes(accion)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const pres = await prisma.presupuesto.findFirst({
    where: { id, clienteId, estado: "PENDIENTE" },
  });

  if (!pres) {
    return NextResponse.json({ error: "No encontrado o ya respondido" }, { status: 404 });
  }

  const updated = await prisma.presupuesto.update({
    where: { id },
    data: { estado: accion as any },
  });

  return NextResponse.json(updated);
}
