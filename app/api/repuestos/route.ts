import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const repuestoSchema = z.object({
  codigoInterno: z.string().optional(),
  numeroParte: z.string().optional(),
  descripcion: z.string().min(1),
  categoriaId: z.string().nullable().optional(),
  stockActual: z.number().int().min(0).default(0),
  stockMinimo: z.number().int().min(0).default(1),
  precioCosto: z.number().min(0).default(0),
  precioVenta: z.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const stockBajo = searchParams.get("stockBajo") === "true";

  const repuestos = await prisma.repuesto.findMany({
    where: {
      activo: true,
      ...(q
        ? {
            OR: [
              { descripcion: { contains: q, mode: "insensitive" } },
              { numeroParte: { contains: q, mode: "insensitive" } },
              { codigoInterno: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { descripcion: "asc" },
    include: {
      categoria: { select: { id: true, nombre: true } },
      _count: { select: { compatibilidades: true } },
    },
  });

  return NextResponse.json(repuestos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data = repuestoSchema.parse(body);

  const repuesto = await prisma.repuesto.create({
    data: {
      codigoInterno: data.codigoInterno || null,
      numeroParte: data.numeroParte || null,
      descripcion: data.descripcion,
      categoriaId: data.categoriaId || null,
      stockActual: data.stockActual,
      stockMinimo: data.stockMinimo,
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
    },
  });

  return NextResponse.json(repuesto, { status: 201 });
}
