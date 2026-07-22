import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const repuestos = await prisma.repuesto.findMany({
    where: { activo: true },
    select: { descripcion: true, numeroParte: true, categoria: true, stockActual: true, precioVenta: true, precioCosto: true },
    orderBy: [{ categoria: "asc" }, { descripcion: "asc" }],
  });

  const rows = repuestos.map(r => ({
    descripcion: r.descripcion,
    numeroParte: r.numeroParte,
    categoria: r.categoria,
    stock: r.stockActual,
    precioVenta: Number(r.precioVenta ?? 0),
    precioCosto: Number(r.precioCosto ?? 0),
    valorVenta: r.stockActual * Number(r.precioVenta ?? 0),
    valorCosto: r.stockActual * Number(r.precioCosto ?? 0),
  }));

  const totalVenta = rows.reduce((s, r) => s + r.valorVenta, 0);
  const totalCosto = rows.reduce((s, r) => s + r.valorCosto, 0);

  return NextResponse.json({ rows, totalVenta, totalCosto });
}
