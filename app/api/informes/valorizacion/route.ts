import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        descripcion: true,
        numeroParte: true,
        categoria: { select: { nombre: true } },
        stockActual: true,
        precioVenta: true,
        precioCosto: true,
      },
      orderBy: { descripcion: "asc" },
    });

    const rows = repuestos.map((r: any) => ({
      descripcion: r.descripcion,
      numeroParte: r.numeroParte,
      categoria: r.categoria?.nombre ?? "—",
      stock: r.stockActual,
      precioVenta: Number(r.precioVenta ?? 0),
      precioCosto: Number(r.precioCosto ?? 0),
      valorVenta: r.stockActual * Number(r.precioVenta ?? 0),
      valorCosto: r.stockActual * Number(r.precioCosto ?? 0),
    }));

    rows.sort((a: any, b: any) => a.categoria.localeCompare(b.categoria) || a.descripcion.localeCompare(b.descripcion));

    const totalVenta = rows.reduce((s: number, r: any) => s + r.valorVenta, 0);
    const totalCosto = rows.reduce((s: number, r: any) => s + r.valorCosto, 0);

    return NextResponse.json({ rows, totalVenta, totalCosto });
  } catch (e: any) {
    console.error("valorizacion error:", e);
    return NextResponse.json({ error: e.message ?? "Error interno", rows: [], totalVenta: 0, totalCosto: 0 }, { status: 500 });
  }
}
