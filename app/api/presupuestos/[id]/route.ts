import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id },
    include: {
      cliente: true,
      items: { include: { repuesto: { select: { descripcion: true, numeroParte: true } } } },
      orden: { select: { id: true, numero: true, tipoEquipo: true, modelo: true, numeroSerie: true, descripcionProblema: true, presupuestoAbonado: true, marca: { select: { nombre: true } } } },
    },
  });

  if (!presupuesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [cRows, pRows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Cliente" WHERE id = $1`, presupuesto.clienteId),
    prisma.$queryRawUnsafe<any[]>(`SELECT "observacionesCliente" FROM "Presupuesto" WHERE id = $1`, id),
  ]);
  const clienteRaw = cRows[0] ?? {};
  const observacionesCliente = pRows[0]?.observacionesCliente ?? null;

  return NextResponse.json({ ...presupuesto, cliente: { ...presupuesto.cliente, ...clienteRaw }, observacionesCliente });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Actualización completa (modo edición)
  if (body.fullUpdate) {
    const { validezDias, descuento, notas, observacionesCliente, subtotal, total, items } = body;
    await prisma.presupuesto.update({
      where: { id },
      data: { validezDias, descuento, subtotal, total, notas: notas || null },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "Presupuesto" SET "observacionesCliente" = $1 WHERE id = $2`,
      observacionesCliente || null, id
    );
    await prisma.presupuestoItem.deleteMany({ where: { presupuestoId: id } });
    await prisma.presupuestoItem.createMany({
      data: (items as any[]).map((item: any) => ({
        presupuestoId: id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioTotal: item.cantidad * item.precioUnitario,
        repuestoId: item.repuestoId || null,
      })),
    });
    return NextResponse.json({ ok: true });
  }

  // Solo observacionesCliente
  if (body.observacionesCliente !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Presupuesto" SET "observacionesCliente" = $1 WHERE id = $2`,
      body.observacionesCliente || null, id
    );
    return NextResponse.json({ ok: true });
  }

  // Solo estado
  const presupuesto = await prisma.presupuesto.update({
    where: { id },
    data: { estado: body.estado as any },
  });

  return NextResponse.json(presupuesto);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Desvincular la orden antes de eliminar
  await prisma.$executeRawUnsafe(`UPDATE "OrdenTrabajo" SET "presupuestoId" = NULL WHERE "presupuestoId" = $1`, id);

  // Eliminar ítems y presupuesto
  await prisma.presupuestoItem.deleteMany({ where: { presupuestoId: id } });
  await prisma.presupuesto.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
