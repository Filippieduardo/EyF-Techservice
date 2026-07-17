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
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Repuesto" WHERE id = $1 AND activo = true`, id);
    const raw = rows[0] ?? null;
    if (!raw) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Prisma 7: resolvemos relaciones manualmente
    const [categoria, marca, compatibilidades, movimientos] = await Promise.all([
      raw.categoriaId ? (prisma as any).categoria.findUnique({ where: { id: raw.categoriaId }, select: { id: true, nombre: true } }) : Promise.resolve(null),
      raw.marcaId ? (prisma as any).marca.findUnique({ where: { id: raw.marcaId }, select: { id: true, nombre: true } }) : Promise.resolve(null),
      (prisma as any).repuestoCompatibilidad.findMany({ where: { repuestoId: id }, orderBy: { id: "asc" } }),
      (prisma as any).movimientoStock.findMany({ where: { repuestoId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const marcaIds = [...new Set(compatibilidades.map((c: any) => c.marcaId).filter(Boolean))];
    const userIds  = [...new Set(movimientos.map((m: any) => m.userId).filter(Boolean))];
    const [marcasCompat, users] = await Promise.all([
      marcaIds.length ? (prisma as any).marca.findMany({ where: { id: { in: marcaIds } }, select: { id: true, nombre: true } }) : Promise.resolve([]),
      userIds.length  ? (prisma as any).user.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true } }) : Promise.resolve([]),
    ]);
    const marcaCompatMap = Object.fromEntries(marcasCompat.map((m: any) => [m.id, m]));
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));

    return NextResponse.json({
      ...raw,
      categoria,
      marca,
      compatibilidades: compatibilidades.map((c: any) => ({ ...c, marca: c.marcaId ? (marcaCompatMap[c.marcaId] ?? null) : null })),
      movimientos: movimientos.map((m: any) => ({ ...m, user: m.userId ? (userMap[m.userId] ?? null) : null })),
    });
  } catch (err: any) {
    console.error("[GET /api/repuestos/[id]]", err);
    return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    // Prisma 7 valida en runtime y rechaza FKs escalares en update — usamos SQL directo
    const sets: string[] = ['"updatedAt" = NOW()'];
    const vals: any[] = [];
    let i = 1;

    if (body.descripcion !== undefined)  { sets.push(`"descripcion" = $${i++}`);  vals.push(body.descripcion || ""); }
    if (body.numeroParte !== undefined)  { sets.push(`"numeroParte" = $${i++}`);  vals.push(body.numeroParte || null); }
    if (body.codigoInterno !== undefined){ sets.push(`"codigoInterno" = $${i++}`); vals.push(body.codigoInterno || null); }
    if (body.categoriaId !== undefined)  { sets.push(`"categoriaId" = $${i++}`);  vals.push(body.categoriaId || null); }
    if (body.marcaId !== undefined)      { sets.push(`"marcaId" = $${i++}`);      vals.push(body.marcaId || null); }
    if (body.stockMinimo !== undefined)  { sets.push(`"stockMinimo" = $${i++}`);  vals.push(Number(body.stockMinimo)); }
    if (body.precioCosto !== undefined)  { sets.push(`"precioCosto" = $${i++}`);  vals.push(Number(body.precioCosto)); }
    if (body.precioVenta !== undefined)  { sets.push(`"precioVenta" = $${i++}`);  vals.push(Number(body.precioVenta)); }

    vals.push(id);
    console.log("[PUT /api/repuestos/[id]] SQL:", `UPDATE "Repuesto" SET ${sets.join(", ")} WHERE id = $${i}`);
    console.log("[PUT /api/repuestos/[id]] vals:", vals);
    await prisma.$executeRawUnsafe(
      `UPDATE "Repuesto" SET ${sets.join(", ")} WHERE id = $${i}`,
      ...vals
    );

    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Repuesto" WHERE id = $1`, id);
    return NextResponse.json(rows[0] ?? {});
  } catch (e: any) {
    console.error("[PUT /api/repuestos/[id]]", e);
    return NextResponse.json({ error: e?.message ?? "Error al guardar" }, { status: 500 });
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
    try {
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
    } catch (e: any) {
      console.error("[POST /api/repuestos/[id]] movimiento", e);
      return NextResponse.json({ error: e?.message ?? "Error al registrar movimiento" }, { status: 500 });
    }
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
