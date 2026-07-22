import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  condicionIva: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  portalPassword: z.string().optional(),
  activo: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Cliente" WHERE id = $1`, id);
  const cliente = rows[0];
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [ordenes, presupuestos] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT o.*, m.nombre as "marcaNombre" FROM "OrdenTrabajo" o LEFT JOIN "Marca" m ON m.id = o."marcaId" WHERE o."clienteId" = $1 ORDER BY o."createdAt" DESC LIMIT 10`, id),
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Presupuesto" WHERE "clienteId" = $1 ORDER BY fecha DESC LIMIT 5`, id),
  ]);

  return NextResponse.json({
    ...cliente,
    tienePasswordPortal: !!cliente.portalPassword,
    ordenes: ordenes.map((o: any) => ({ ...o, marca: o.marcaNombre ? { nombre: o.marcaNombre } : null })),
    presupuestos,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const sets: string[] = ['"updatedAt" = NOW()'];
  const vals: any[] = [];
  let i = 1;

  if (data.nombre       !== undefined) { sets.push(`"nombre" = $${i++}`);          vals.push(data.nombre); }
  if (data.email        !== undefined) { sets.push(`"email" = $${i++}`);           vals.push(data.email || null); }
  if (data.telefono     !== undefined) { sets.push(`"telefono" = $${i++}`);        vals.push(data.telefono || null); }
  if (data.whatsapp     !== undefined) { sets.push(`"whatsapp" = $${i++}`);        vals.push(data.whatsapp || null); }
  if (data.condicionIva !== undefined) { sets.push(`"condicionIva" = $${i++}`);    vals.push(data.condicionIva || "CONS. FINAL"); }
  if (data.dniCuit      !== undefined) { sets.push(`"dniCuit" = $${i++}`);         vals.push(data.dniCuit || null); }
  if (data.direccion    !== undefined) { sets.push(`"direccion" = $${i++}`);       vals.push(data.direccion || null); }
  if (data.activo       !== undefined) { sets.push(`"activo" = $${i++}`);          vals.push(data.activo); }
  if (data.portalPassword)             { const h = await bcrypt.hash(data.portalPassword, 10); sets.push(`"portalPassword" = $${i++}`);  vals.push(h); }

  vals.push(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "Cliente" SET ${sets.join(", ")} WHERE id = $${i}`,
    ...vals
  );

  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Cliente" WHERE id = $1`, id);
  const { portalPassword, ...safeCliente } = rows[0] ?? {};
  return NextResponse.json(safeCliente);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const ordenes = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM "OrdenTrabajo" WHERE "clienteId" = $1 LIMIT 1`, id);
  if (ordenes.length > 0) {
    return NextResponse.json({ error: "No se puede eliminar: el cliente tiene órdenes de trabajo asociadas" }, { status: 400 });
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "Cliente" WHERE id = $1`, id);
  return NextResponse.json({ ok: true });
}
