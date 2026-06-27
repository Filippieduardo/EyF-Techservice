import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: any = {};
  if (body.nombre) updateData.nombre = body.nombre;
  if (body.role) updateData.role = body.role;
  if (body.activo !== undefined) updateData.activo = body.activo;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, nombre: true, email: true, role: true, activo: true },
  });

  return NextResponse.json(user);
}
