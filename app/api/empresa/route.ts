import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Empresa" LIMIT 1`);
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { nombre, domicilio, condicionIva, dniCuit, telefono, telServTecnico, whatsapp, email } = body;

  const existing = await prisma.empresa.findFirst();
  const empresa = existing
    ? await prisma.$queryRawUnsafe<any[]>(`UPDATE "Empresa" SET nombre=$1, domicilio=$2, "condicionIva"=$3, "dniCuit"=$4, telefono=$5, "telServTecnico"=$6, whatsapp=$7, email=$8, "updatedAt"=NOW() WHERE id=$9 RETURNING *`, nombre, domicilio??null, condicionIva??'INSCRIPTO', dniCuit??null, telefono??null, telServTecnico??null, whatsapp??null, email??null, existing.id).then(r=>r[0])
    : await prisma.$queryRawUnsafe<any[]>(`INSERT INTO "Empresa" (id, nombre, domicilio, "condicionIva", "dniCuit", telefono, "telServTecnico", whatsapp, email, "createdAt", "updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`, nombre??'Mi Empresa', domicilio??null, condicionIva??'INSCRIPTO', dniCuit??null, telefono??null, telServTecnico??null, whatsapp??null, email??null).then(r=>r[0]);

  return NextResponse.json(empresa);
}
