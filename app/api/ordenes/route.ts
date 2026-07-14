import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ordenSchema = z.object({
  clienteId: z.string().min(1),
  tipoEquipo: z.string(),
  marcaId: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  descripcionProblema: z.string().min(1),
  tecnicoId: z.string().optional(),
  fechaEstimada: z.string().optional(),
});

async function generarNumeroOrden() {
  const year = new Date().getFullYear();
  const count = await prisma.ordenTrabajo.count({
    where: { numero: { startsWith: `OT-${year}-` } },
  });
  return `OT-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const clienteId = searchParams.get("clienteId") ?? "";

  const ordenes = await prisma.ordenTrabajo.findMany({
    where: {
      ...(estado ? { estado: estado as any } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" } },
              { modelo: { contains: q, mode: "insensitive" } },
              { numeroSerie: { contains: q, mode: "insensitive" } },
              { cliente: { nombre: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      tecnico: { select: { id: true, nombre: true } },
      marca: { select: { id: true, nombre: true } },
    },
  });

  // Fetch presupuesto estados separately to avoid Prisma 7 relation include issues
  const presupuestoIds = ordenes.map((o: any) => o.presupuestoId).filter(Boolean) as string[];
  const presupuestosMap: Record<string, string> = {};
  if (presupuestoIds.length > 0) {
    const presupuestos = await prisma.presupuesto.findMany({
      where: { id: { in: presupuestoIds } },
      select: { id: true, estado: true },
    });
    for (const p of presupuestos as any[]) {
      presupuestosMap[p.id] = p.estado;
    }
  }

  const result = ordenes.map((o: any) => ({
    ...o,
    presupuesto: o.presupuestoId ? { id: o.presupuestoId, estado: presupuestosMap[o.presupuestoId] ?? null } : null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff" || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data = ordenSchema.parse(body);
  const userId = (session.user as any).id as string;

  const numero = await generarNumeroOrden();

  const orden = await prisma.ordenTrabajo.create({
    data: {
      numero,
      clienteId: data.clienteId,
      tipoEquipo: data.tipoEquipo as any,
      marcaId: data.marcaId || null,
      modelo: data.modelo || null,
      numeroSerie: data.numeroSerie || null,
      descripcionProblema: data.descripcionProblema,
      tecnicoId: data.tecnicoId || null,
      fechaEstimada: data.fechaEstimada ? new Date(data.fechaEstimada) : null,
      estado: "INGRESADO",
      historial: {
        create: {
          estado: "INGRESADO",
          nota: "Orden ingresada al sistema",
          userId,
        },
      },
    },
  });

  return NextResponse.json(orden, { status: 201 });
}
