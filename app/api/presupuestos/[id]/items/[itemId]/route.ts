import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, itemId } = await params;

  const item = await prisma.presupuestoItem.findFirst({
    where: { id: itemId, presupuestoId: id },
  });
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.presupuestoItem.delete({ where: { id: itemId } });

  // Recalcular subtotal y total del presupuesto
  const items = await prisma.presupuestoItem.findMany({ where: { presupuestoId: id } });
  const subtotal = items.reduce((acc, i) => acc + Number(i.precioTotal), 0);
  const pres = await prisma.presupuesto.findUnique({ where: { id }, select: { descuento: true } });
  const total = subtotal - Number(pres?.descuento ?? 0);

  await prisma.presupuesto.update({ where: { id }, data: { subtotal, total } });

  return NextResponse.json({ ok: true });
}
