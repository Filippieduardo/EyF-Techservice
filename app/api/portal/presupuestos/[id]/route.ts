import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "cliente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clienteId = (session.user as any).id as string;
  const { id } = await params;

  const pres = await prisma.presupuesto.findFirst({
    where: { id, clienteId },
    include: {
      items: { select: { descripcion: true, cantidad: true, precioUnitario: true, precioTotal: true } },
      orden: { select: { numero: true, modelo: true, marca: { select: { nombre: true } } } },
    },
  });

  if (!pres) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [clienteRows, obsRows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      `SELECT nombre, "condicionIva", telefono, direccion, "dniCuit" FROM "Cliente" WHERE id = $1`, clienteId
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT "observacionesCliente" FROM "Presupuesto" WHERE id = $1`, id
    ),
  ]);

  const c = clienteRows[0] ?? {};
  return NextResponse.json({
    ...pres,
    clienteNombre: c.nombre ?? "",
    clienteCondicionIva: c.condicionIva ?? "CONS. FINAL",
    clienteTelefono: c.telefono ?? null,
    clienteDireccion: c.direccion ?? null,
    clienteDniCuit: c.dniCuit ?? null,
    observacionesCliente: obsRows[0]?.observacionesCliente ?? null,
  });
}
