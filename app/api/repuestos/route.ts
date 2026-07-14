import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const repuestoSchema = z.object({
  codigoInterno: z.string().optional(),
  numeroParte: z.string().optional(),
  descripcion: z.string().min(1),
  categoriaId: z.string().nullable().optional(),
  marcaId: z.string().nullable().optional(),
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
  const marcaId = searchParams.get("marcaId") ?? "";
  const stockBajo = searchParams.get("stockBajo") === "true";

  try {
  // Prisma 7: usamos SQL directo para evitar bugs con filtros de FK escalares
  const conditions: string[] = [`r.activo = true`];
  const vals: any[] = [];
  let i = 1;

  if (marcaId) { conditions.push(`r."marcaId" = $${i++}`); vals.push(marcaId); }
  if (stockBajo) { conditions.push(`r."stockActual" <= r."stockMinimo"`); }
  if (q) {
    conditions.push(`(r.descripcion ILIKE $${i} OR r."numeroParte" ILIKE $${i} OR r."codigoInterno" ILIKE $${i} OR c.nombre ILIKE $${i})`);
    vals.push(`%${q}%`);
    i++;
  }

  const where = conditions.join(" AND ");
  const raw = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.* FROM "Repuesto" r LEFT JOIN "Categoria" c ON c.id = r."categoriaId" WHERE ${where} ORDER BY r.descripcion ASC`,
    ...vals
  );

  // Prisma 7: resolvemos relaciones manualmente con SQL para evitar groupBy/include quirks
  const repuestoIds = raw.map((r: any) => r.id);
  const [marcas, categorias, compatCounts] = await Promise.all([
    (prisma as any).marca.findMany({ select: { id: true, nombre: true } }),
    (prisma as any).categoria.findMany({ select: { id: true, nombre: true } }),
    repuestoIds.length
      ? prisma.$queryRawUnsafe<{ repuestoId: string; cnt: string }[]>(
          `SELECT "repuestoId", COUNT(*)::text as cnt FROM "RepuestoCompatibilidad" WHERE "repuestoId" = ANY($1::text[]) GROUP BY "repuestoId"`,
          repuestoIds
        )
      : Promise.resolve([]),
  ]);

  const marcaMap = Object.fromEntries(marcas.map((m: any) => [m.id, m]));
  const catMap = Object.fromEntries(categorias.map((c: any) => [c.id, c]));
  const countMap = Object.fromEntries((compatCounts as any[]).map((c) => [c.repuestoId, Number(c.cnt)]));

  const repuestos = raw.map((r: any) => ({
    ...r,
    marca: r.marcaId ? (marcaMap[r.marcaId] ?? null) : null,
    categoria: r.categoriaId ? (catMap[r.categoriaId] ?? null) : null,
    _count: { compatibilidades: countMap[r.id] ?? 0 },
  }));

  return NextResponse.json(repuestos);
  } catch (err: any) {
    console.error("[GET /api/repuestos]", err);
    return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
  }
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
      marcaId: data.marcaId || null,
      stockActual: data.stockActual,
      stockMinimo: data.stockMinimo,
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
    },
  });

  return NextResponse.json(repuesto, { status: 201 });
}
