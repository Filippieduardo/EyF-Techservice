import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
const clienteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  condicionIva: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  portalPassword: z.string().min(1, "La contraseña del portal es obligatoria"),
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

  const whatsapp = data.whatsapp || data.telefono || null;
  const hashedPassword = await bcrypt.hash(data.portalPassword, 10);
  const cliente = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "Cliente" (id, nombre, email, telefono, whatsapp, "condicionIva", "dniCuit", direccion, "portalPassword", activo, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW()) RETURNING *`,
    data.nombre, data.email||null, data.telefono||null, whatsapp, data.condicionIva||'CONS. FINAL', data.dniCuit||null, data.direccion||null, hashedPassword
  ).then(r => r[0]);
  return NextResponse.json(cliente, { status: 201 });
}
