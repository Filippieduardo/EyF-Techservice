import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const empresa = await prisma.empresa.findFirst();
  return NextResponse.json(empresa ?? null);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { nombre, domicilio, condicionIva, dniCuit, telefono, whatsapp, email } = body;

  const existing = await prisma.empresa.findFirst();
  const empresa = existing
    ? await prisma.empresa.update({ where: { id: existing.id }, data: { nombre, domicilio, condicionIva, dniCuit, telefono, whatsapp, email } })
    : await prisma.empresa.create({ data: { nombre: nombre ?? "Mi Empresa", domicilio, condicionIva: condicionIva ?? "INSCRIPTO", dniCuit, telefono, whatsapp, email } });

  return NextResponse.json(empresa);
}
