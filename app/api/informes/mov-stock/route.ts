import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where: any = {};
    if (desde) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(desde) };
    if (hasta) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(hasta + "T23:59:59") };

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        repuesto: { select: { descripcion: true, numeroParte: true, precioCosto: true, precioVenta: true, categoria: { select: { nombre: true } } } },
        user: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = movimientos.map((m: any) => ({
      fecha: m.createdAt,
      tipo: m.tipo,
      descripcion: m.repuesto.descripcion,
      numeroParte: m.repuesto.numeroParte,
      categoria: (m.repuesto as any).categoria?.nombre ?? "—",
      cantidad: m.cantidad,
      precioVenta: Number(m.repuesto.precioVenta ?? 0),
      precioUnitario: Number(m.precioUnitario ?? (m.tipo === "SALIDA" ? m.repuesto.precioVenta : m.repuesto.precioCosto) ?? 0),
      total: m.cantidad * Number(m.precioUnitario ?? (m.tipo === "SALIDA" ? m.repuesto.precioVenta : m.repuesto.precioCosto) ?? 0),
      usuario: m.user?.nombre ?? "—",
      notas: m.notas,
    }));

    const totalEntradas = rows.filter((r: any) => r.tipo === "ENTRADA").reduce((s: number, r: any) => s + r.cantidad, 0);
    const totalSalidas = rows.filter((r: any) => r.tipo === "SALIDA").reduce((s: number, r: any) => s + r.cantidad, 0);

    return NextResponse.json({ rows, totalEntradas, totalSalidas });
  } catch (e: any) {
    console.error("mov-stock error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", rows: [], totalEntradas: 0, totalSalidas: 0 }, { status: 500 });
  }
}
