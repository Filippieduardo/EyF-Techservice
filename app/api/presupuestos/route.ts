import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().min(0),
  repuestoId: z.string().optional(),
});

const presupuestoSchema = z.object({
  clienteId: z.string().min(1),
  ordenId: z.string().optional(),
  validezDias: z.number().int().min(1).default(30),
  descuento: z.number().min(0).default(0),
  notas: z.string().optional(),
  observacionesCliente: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

async function generarNumero() {
  const year = new Date().getFullYear();
  const count = await prisma.presupuesto.count({
    where: { numero: { startsWith: `PRES-${year}-` } },
  });
  return `PRES-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const clienteId = searchParams.get("clienteId") ?? "";

  const presupuestos = await prisma.presupuesto.findMany({
    where: {
      ...(estado ? { estado: estado as any } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" } },
              { cliente: { nombre: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { fecha: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(presupuestos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data = presupuestoSchema.parse(body);

  const numero = await generarNumero();
  const subtotal = data.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const total = subtotal - data.descuento;

  const presupuesto = await prisma.presupuesto.create({
    data: {
      numero,
      clienteId: data.clienteId,
      validezDias: data.validezDias,
      descuento: data.descuento,
      subtotal,
      total,
      notas: data.notas || null,
      items: {
        create: data.items.map((item) => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          precioTotal: item.cantidad * item.precioUnitario,
          repuestoId: item.repuestoId || null,
        })),
      },
    },
    include: { items: true },
  });

  if (data.observacionesCliente) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Presupuesto" SET "observacionesCliente" = $1 WHERE id = $2`,
      data.observacionesCliente, presupuesto.id
    );
  }

  if (data.ordenId) {
    await prisma.ordenTrabajo.update({
      where: { id: data.ordenId },
      data: { presupuestoId: presupuesto.id },
    });
  }

  return NextResponse.json(presupuesto, { status: 201 });
}
