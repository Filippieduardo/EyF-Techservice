import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  portalPassword: z.string().optional(),
  activo: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      ordenes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { marca: { select: { nombre: true } } },
      },
      presupuestos: { orderBy: { fecha: "desc" }, take: 5 },
    },
  });

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(cliente);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const updateData: any = { ...data };
  if (data.email === "") updateData.email = null;

  if (!data.portalPassword) {
    delete updateData.portalPassword;
  }

  const cliente = await prisma.cliente.update({ where: { id }, data: updateData });
  return NextResponse.json(cliente);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.cliente.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
