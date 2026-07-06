import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const items = await prisma.ordenRepuesto.findMany({
      where: { ordenId: id },
      include: { repuesto: { select: { id: true, descripcion: true, numeroParte: true, stockActual: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { repuestoId, cantidad } = await req.json();
  if (!repuestoId || !cantidad || cantidad < 1) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const userId = (session.user as any).id as string;
  try {
    const repuesto = await prisma.repuesto.findUnique({ where: { id: repuestoId } });
    if (!repuesto) return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    if (repuesto.stockActual < cantidad) {
      return NextResponse.json({ error: `Stock insuficiente (disponible: ${repuesto.stockActual})` }, { status: 400 });
    }
    const orden = await prisma.ordenTrabajo.findUnique({ where: { id }, select: { numero: true } });
    const [item] = await prisma.$transaction([
      prisma.ordenRepuesto.create({
        data: { ordenId: id, repuestoId, cantidad, descontado: true },
        include: { repuesto: { select: { id: true, descripcion: true, numeroParte: true, stockActual: true } } },
      }),
      prisma.repuesto.update({
        where: { id: repuestoId },
        data: { stockActual: { decrement: cantidad } },
      }),
      prisma.movimientoStock.create({
        data: {
          tipo: "SALIDA",
          cantidad,
          repuestoId,
          ordenId: id,
          userId,
          notas: `Usado en orden ${orden?.numero ?? id}`,
        },
      }),
    ]);
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id: ordenId } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });
  const userId = (session.user as any).id as string;
  try {
    const item = await prisma.ordenRepuesto.findUnique({ where: { id: itemId } });
    if (!item || item.ordenId !== ordenId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { numero: true } });
    await prisma.$transaction([
      prisma.ordenRepuesto.delete({ where: { id: itemId } }),
      prisma.repuesto.update({
        where: { id: item.repuestoId },
        data: { stockActual: { increment: item.cantidad } },
      }),
      prisma.movimientoStock.create({
        data: {
          tipo: "ENTRADA",
          cantidad: item.cantidad,
          repuestoId: item.repuestoId,
          ordenId: ordenId,
          userId,
          notas: `Reingreso por quita en orden ${orden?.numero ?? ordenId}`,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}
