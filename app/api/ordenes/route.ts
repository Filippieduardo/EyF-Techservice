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
  presupuestoAbonado: z.number().optional(),
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
  const presupuestoAbonado = (data as any).presupuestoAbonado ?? 0;

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "OrdenTrabajo" (
       id, numero, "clienteId", "tipoEquipo", "marcaId", modelo, "numeroSerie",
       "descripcionProblema", "tecnicoId", "fechaEstimada", estado, "fechaCambioEstado",
       "presupuestoAbonado", "ubicacionActual", "createdAt", "updatedAt"
     ) VALUES (
       gen_random_uuid()::text, $1, $2, $3::\"TipoEquipo\", $4, $5, $6,
       $7, $8, $9::timestamptz, 'INGRESADO'::"EstadoOrden", NOW(),
       $10, 'LOCAL'::"UbicacionActual", NOW(), NOW()
     ) RETURNING *`,
    numero,
    data.clienteId,
    data.tipoEquipo,
    data.marcaId || null,
    data.modelo || null,
    data.numeroSerie || null,
    data.descripcionProblema,
    data.tecnicoId || null,
    data.fechaEstimada ? new Date(data.fechaEstimada).toISOString() : null,
    Number(presupuestoAbonado) || 0,
  );
  const orden = rows[0];

  await prisma.$executeRawUnsafe(
    `INSERT INTO "HistorialEstado" (id, "ordenId", estado, nota, "userId", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'INGRESADO'::"EstadoOrden", $2, $3, NOW())`,
    orden.id,
    "Orden ingresada al sistema",
    userId,
  );

  return NextResponse.json(orden, { status: 201 });
}
