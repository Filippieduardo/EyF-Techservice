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
  try {
    const repuesto = await prisma.repuesto.findUnique({ where: { id: repuestoId } });
    if (!repuesto) return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    if (repuesto.stockActual < cantidad) {
      return NextResponse.json({ error: `Stock insuficiente (disponible: ${repuesto.stockActual})` }, { status: 400 });
    }
    const item = await prisma.ordenRepuesto.create({
      data: { ordenId: id, repuestoId, cantidad },
      include: { repuesto: { select: { id: true, descripcion: true, numeroParte: true, stockActual: true } } },
    });
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
  try {
    const item = await prisma.ordenRepuesto.findUnique({ where: { id: itemId } });
    if (!item || item.ordenId !== ordenId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    if (item.descontado) {
      return NextResponse.json({ error: "Ya fue descontado del stock, no se puede eliminar" }, { status: 400 });
    }
    await prisma.ordenRepuesto.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}
