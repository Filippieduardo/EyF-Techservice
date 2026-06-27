import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { nombre, activa } = await req.json();
  try {
    const categoria = await prisma.categoria.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(activa !== undefined && { activa }),
      },
    });
    return NextResponse.json(categoria);
  } catch {
    return NextResponse.json({ error: "No encontrada o nombre duplicado" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const cat = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { repuestos: true } } },
  });
  if (!cat) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cat._count.repuestos > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${cat._count.repuestos} repuesto(s) asignado(s)` },
      { status: 400 }
    );
  }
  await prisma.categoria.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
