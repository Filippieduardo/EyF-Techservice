import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  estado: z.string().optional(),
  tipoEquipo: z.string().optional(),
  marcaId: z.string().nullable().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  descripcionProblema: z.string().optional(),
  diagnostico: z.string().optional(),
  trabajoRealizado: z.string().optional(),
  notasInternas: z.string().optional(),
  observacionesCliente: z.string().optional(),
  costoTecnico: z.number().nullable().optional(),
  tecnicoId: z.string().nullable().optional(),
  fechaEstimada: z.string().nullable().optional(),
  fechaEnvio: z.string().nullable().optional(),
  ubicacionActual: z.string().optional(),
  notaEstado: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const orden = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: true,
      tecnico: { select: { id: true, nombre: true, email: true } },
      marca: { select: { id: true, nombre: true } },
      historial: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { nombre: true } } },
      },
      presupuesto: {
        include: { items: true },
      },
    },
  });

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(orden);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const data = updateSchema.parse(body);
  const userId = (session.user as any).id as string;

  const orden = await prisma.ordenTrabajo.findUnique({ where: { id }, select: { estado: true } });
  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const updateData: any = {
    ...(data.tipoEquipo && { tipoEquipo: data.tipoEquipo as any }),
    ...(data.marcaId !== undefined && { marcaId: data.marcaId }),
    ...(data.modelo !== undefined && { modelo: data.modelo }),
    ...(data.numeroSerie !== undefined && { numeroSerie: data.numeroSerie }),
    ...(data.descripcionProblema && { descripcionProblema: data.descripcionProblema }),
    ...(data.diagnostico !== undefined && { diagnostico: data.diagnostico }),
    ...(data.trabajoRealizado !== undefined && { trabajoRealizado: data.trabajoRealizado }),
    ...(data.notasInternas !== undefined && { notasInternas: data.notasInternas }),
    ...(data.observacionesCliente !== undefined && { observacionesCliente: data.observacionesCliente }),
    ...(data.costoTecnico !== undefined && { costoTecnico: data.costoTecnico }),
    ...(data.tecnicoId !== undefined && { tecnicoId: data.tecnicoId }),
    ...(data.fechaEstimada !== undefined && { fechaEstimada: data.fechaEstimada ? new Date(data.fechaEstimada) : null }),
    ...(data.fechaEnvio !== undefined && { fechaEnvio: data.fechaEnvio ? new Date(data.fechaEnvio) : null }),
    ...(data.ubicacionActual !== undefined && { ubicacionActual: data.ubicacionActual as any }),
  };

  const estadoCambia = data.estado && data.estado !== orden.estado;

  if (estadoCambia) {
    updateData.estado = data.estado as any;
    if (data.estado === "ENTREGADO" || data.estado === "NO_REPARABLE" || data.estado === "CANCELADO") {
      updateData.fechaCierre = new Date();
    }
    updateData.historial = {
      create: {
        estado: data.estado as any,
        nota: data.notaEstado || null,
        userId,
      },
    };
  }

  const updated = await prisma.ordenTrabajo.update({ where: { id }, data: updateData });

  // Al pasar a TERMINADO: descontar del stock los repuestos utilizados
  if (estadoCambia && data.estado === "TERMINADO") {
    const repuestosUsados = await prisma.ordenRepuesto.findMany({
      where: { ordenId: id, descontado: false },
    });
    for (const item of repuestosUsados) {
      await prisma.$transaction([
        prisma.repuesto.update({
          where: { id: item.repuestoId },
          data: { stockActual: { decrement: item.cantidad } },
        }),
        prisma.movimientoStock.create({
          data: {
            tipo: "SALIDA",
            cantidad: item.cantidad,
            repuestoId: item.repuestoId,
            ordenId: id,
            userId,
            notas: `Usado en orden ${updated.numero}`,
          },
        }),
        prisma.ordenRepuesto.update({
          where: { id: item.id },
          data: { descontado: true },
        }),
      ]);
    }
  }

  return NextResponse.json(updated);
}
