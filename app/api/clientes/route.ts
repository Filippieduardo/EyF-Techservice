import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const clienteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  condicionIva: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  portalPassword: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  let sql = `SELECT c.*, COUNT(o.id)::int AS "ordenesCount" FROM "Cliente" c LEFT JOIN "OrdenTrabajo" o ON o."clienteId" = c.id WHERE c.activo = true`;
  const vals: any[] = [];
  if (q) {
    sql += ` AND (c.nombre ILIKE $1 OR c.email ILIKE $1 OR c.telefono ILIKE $1 OR c."dniCuit" ILIKE $1)`;
    vals.push(`%${q}%`);
  }
  sql += ` GROUP BY c.id ORDER BY c.nombre ASC`;
  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...vals);
  const clientes = rows.map((r: any) => {
    const { portalPassword, ...safe } = r;
    return { ...safe, _count: { ordenes: r.ordenesCount ?? 0 } };
  });

  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data = clienteSchema.parse(body);

  const cliente = await prisma.cliente.create({
    data: {
      nombre: data.nombre,
      email: data.email || null,
      telefono: data.telefono || null,
      condicionIva: data.condicionIva || "CONS. FINAL",
      dniCuit: data.dniCuit || null,
      direccion: data.direccion || null,
      portalPassword: data.portalPassword ? await bcrypt.hash(data.portalPassword, 10) : null,
    },
  });

  const { portalPassword, ...safeCliente } = cliente;
  return NextResponse.json(safeCliente, { status: 201 });
}
