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
  presupuestoAbonado: z.number().optional(),
  tecnicoId: z.string().nullable().optional(),
  fechaEstimada: z.string().nullable().optional(),
  fechaEnvio: z.string().nullable().optional(),
  fechaCierre: z.string().nullable().optional(),
  ubicacionActual: z.string().optional(),
  notaEstado: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const [orden, rawExtra] = await Promise.all([
    prisma.ordenTrabajo.findUnique({
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
    }),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT "fechaCambioEstado", "observacionesCliente", "tipoEquipo", "descripcionProblema" FROM "OrdenTrabajo" WHERE id = $1`,
      id
    ),
  ]);

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const result = {
    ...orden,
    fechaCambioEstado: rawExtra[0]?.fechaCambioEstado ?? null,
    observacionesCliente: rawExtra[0]?.observacionesCliente ?? (orden as any).observacionesCliente ?? null,
    tipoEquipo: rawExtra[0]?.tipoEquipo ?? (orden as any).tipoEquipo ?? null,
    descripcionProblema: rawExtra[0]?.descripcionProblema ?? (orden as any).descripcionProblema ?? null,
  };
  return NextResponse.json(result);
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

  const ordenActual = await prisma.$queryRawUnsafe<any[]>(
    `SELECT estado FROM "OrdenTrabajo" WHERE id = $1`,
    id
  );
  if (!ordenActual.length) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const estadoActual = ordenActual[0].estado;
  const estadoCambia = data.estado && data.estado !== estadoActual;

  // Construir SET dinámico
  const sets: string[] = [`"updatedAt" = NOW()`];
  const vals: any[] = [];
  let p = 1;

  function add(col: string, val: any) {
    sets.push(`"${col}" = $${p++}`);
    vals.push(val);
  }

  if (data.tipoEquipo) add("tipoEquipo", data.tipoEquipo);
  if (data.marcaId !== undefined) add("marcaId", data.marcaId);
  if (data.modelo !== undefined) add("modelo", data.modelo);
  if (data.numeroSerie !== undefined) add("numeroSerie", data.numeroSerie);
  if (data.descripcionProblema) add("descripcionProblema", data.descripcionProblema);
  if (data.diagnostico !== undefined) add("diagnostico", data.diagnostico);
  if (data.trabajoRealizado !== undefined) add("trabajoRealizado", data.trabajoRealizado);
  if (data.notasInternas !== undefined) add("notasInternas", data.notasInternas);
  if (data.observacionesCliente !== undefined) add("observacionesCliente", data.observacionesCliente);
  if (data.costoTecnico !== undefined) add("costoTecnico", data.costoTecnico);
  if (data.tecnicoId !== undefined) add("tecnicoId", data.tecnicoId);
  if (data.presupuestoAbonado !== undefined) add("presupuestoAbonado", data.presupuestoAbonado);
  if (data.notaEstado !== undefined) add("notaEstado", data.notaEstado || null);
  if (data.fechaEstimada !== undefined)
    add("fechaEstimada", data.fechaEstimada ? new Date(data.fechaEstimada) : null);
  if (data.fechaEnvio !== undefined)
    add("fechaEnvio", data.fechaEnvio ? new Date(data.fechaEnvio) : null);
  if (data.ubicacionActual !== undefined) add("ubicacionActual", data.ubicacionActual);

  if (estadoCambia) {
    sets.push(`"estado" = $${p++}::text::"EstadoOrden"`);
    vals.push(data.estado);
    sets.push(`"fechaCambioEstado" = NOW()`);
    if (["ENTREGADO", "NO_REPARABLE", "CANCELADO"].includes(data.estado!)) {
      const fc = data.fechaCierre ? new Date(data.fechaCierre) : new Date();
      add("fechaCierre", fc);
    }
  }

  vals.push(id); // WHERE id = $N
  const wherePIdx = p;

  await prisma.$executeRawUnsafe(
    `UPDATE "OrdenTrabajo" SET ${sets.join(", ")} WHERE id = $${wherePIdx}`,
    ...vals
  );

  // Crear historial si cambió estado o hay nota
  if (estadoCambia || data.notaEstado) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "HistorialEstado" (id, "ordenId", estado, nota, "userId", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2::"EstadoOrden", $3, $4, NOW())`,
      id,
      estadoCambia ? data.estado : estadoActual,
      data.notaEstado || null,
      userId
    );
  }

  // Devolver la orden actualizada con fechaCambioEstado
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "OrdenTrabajo" WHERE id = $1`,
    id
  );
  return NextResponse.json(rows[0]);
}
