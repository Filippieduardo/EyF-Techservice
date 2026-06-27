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
      orden: { select: { id: true, numero: true, modelo: true, marca: { select: { nombre: true } } } },
    },
  });

  if (!presupuesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(presupuesto);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { estado } = await req.json();

  const presupuesto = await prisma.presupuesto.update({
    where: { id },
    data: { estado: estado as any },
  });

  return NextResponse.json(presupuesto);
}
