import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Si se intenta desactivar un técnico, verificar que no tenga órdenes
  if (body.activo === false) {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (user?.role === "TECNICO") {
      const ordenesCount = await prisma.ordenTrabajo.count({ where: { tecnicoId: id } });
      if (ordenesCount > 0) {
        return NextResponse.json(
          { error: `No se puede desactivar: el técnico tiene ${ordenesCount} orden(es) asignada(s)` },
          { status: 400 }
        );
      }
    }
  }

  const updateData: any = {};
  if (body.nombre) updateData.nombre = body.nombre;
  if (body.email) updateData.email = body.email.toLowerCase();
  if (body.role) updateData.role = body.role;
  if (body.activo !== undefined) updateData.activo = body.activo;
  if (body.password) updateData.password = body.password;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, nombre: true, email: true, role: true, activo: true },
    });
    return NextResponse.json(user);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
