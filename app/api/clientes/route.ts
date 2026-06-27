import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const clienteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  portalPassword: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q } },
            { dniCuit: { contains: q } },
          ],
        }
      : {},
    orderBy: { nombre: "asc" },
    include: { _count: { select: { ordenes: true } } },
  });

  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data = clienteSchema.parse(body);

  let portalPassword: string | undefined;
  if (data.portalPassword) {
    portalPassword = await bcrypt.hash(data.portalPassword, 10);
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre: data.nombre,
      email: data.email || null,
      telefono: data.telefono || null,
      dniCuit: data.dniCuit || null,
      direccion: data.direccion || null,
      portalPassword: portalPassword ?? null,
    },
  });

  return NextResponse.json(cliente, { status: 201 });
}
