import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const compatSchema = z.object({
  tipoEquipo: z.string(),
  marcaId: z.string().optional(),
  modelo: z.string().optional(),
  numeroParteOem: z.string().optional(),
  notas: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const repuesto = await prisma.repuesto.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true } },
      compatibilidades: { include: { marca: { select: { nombre: true } } } },
      movimientos: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { nombre: true } } },
      },
    },
  });

  if (!repuesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(repuesto);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const repuesto = await prisma.repuesto.update({
      where: { id },
      data: {
        ...(body.descripcion !== undefined && { descripcion: body.descripcion || "" }),
        ...(body.numeroParte !== undefined && { numeroParte: body.numeroParte || null }),
        ...(body.codigoInterno !== undefined && { codigoInterno: body.codigoInterno || null }),
        ...(body.categoriaId !== undefined && { categoriaId: body.categoriaId || null }),
        ...(body.stockMinimo !== undefined && { stockMinimo: Number(body.stockMinimo) }),
        ...(body.precioCosto !== undefined && { precioCosto: Number(body.precioCosto) }),
        ...(body.precioVenta !== undefined && { precioVenta: Number(body.precioVenta) }),
      },
    });
    return NextResponse.json(repuesto);
  } catch (e: any) {
    console.error("PUT /api/repuestos/[id] error:", e);
    return NextResponse.json({ error: e.message ?? "Error al guardar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.action === "movimiento") {
    const userId = (session.user as any).id as string;
    const delta = body.tipo === "ENTRADA" ? body.cantidad : -body.cantidad;

    const [movimiento, repuesto] = await prisma.$transaction([
      prisma.movimientoStock.create({
        data: {
          repuestoId: id,
          tipo: body.tipo,
          cantidad: body.cantidad,
          precioUnitario: body.precioUnitario || null,
          referencia: body.referencia || null,
          notas: body.notas || null,
          userId,
        },
      }),
      prisma.repuesto.update({
        where: { id },
        data: { stockActual: { increment: delta } },
      }),
    ]);

    return NextResponse.json({ movimiento, repuesto });
  }

  if (body.action === "compatibilidad") {
    const data = compatSchema.parse(body.data);
    const compat = await prisma.repuestoCompatibilidad.create({
      data: {
        repuestoId: id,
        tipoEquipo: data.tipoEquipo as any,
        marcaId: data.marcaId || null,
        modelo: data.modelo || null,
        numeroParteOem: data.numeroParteOem || null,
        notas: data.notas || null,
      },
      include: { marca: { select: { nombre: true } } },
    });
    return NextResponse.json(compat, { status: 201 });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const compatId = searchParams.get("compatId");

  if (compatId) {
    await prisma.repuestoCompatibilidad.delete({ where: { id: compatId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.repuesto.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
