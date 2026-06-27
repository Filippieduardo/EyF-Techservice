import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const marcas = await prisma.marca.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(marcas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre } = await req.json();
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const marca = await prisma.marca.upsert({
    where: { nombre: nombre.trim() },
    update: { activa: true },
    create: { nombre: nombre.trim() },
  });

  return NextResponse.json(marca, { status: 201 });
}
