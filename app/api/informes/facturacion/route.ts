import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const agrupacion = searchParams.get("agrupacion") ?? "mes";

  const where: any = { estado: { in: ["TERMINADO", "ENTREGADO"] } };
  if (desde) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), gte: new Date(desde) };
  if (hasta) where.fechaIngreso = { ...(where.fechaIngreso ?? {}), lte: new Date(hasta + "T23:59:59") };

  const ordenes = await prisma.ordenTrabajo.findMany({
    where,
    select: { fechaIngreso: true, costoTecnico: true },
    orderBy: { fechaIngreso: "asc" },
  });

  const map = new Map<string, { cantidad: number; monto: number }>();
  for (const o of ordenes) {
    const d = new Date(o.fechaIngreso);
    let key: string;
    if (agrupacion === "mes") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
    }
    if (!map.has(key)) map.set(key, { cantidad: 0, monto: 0 });
    const e = map.get(key)!;
    e.cantidad++;
    e.monto += Number(o.costoTecnico ?? 0);
  }

  const rows = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, v]) => ({ periodo, ...v }));

  const totalMonto = rows.reduce((s, r) => s + r.monto, 0);
  const totalOrdenes = rows.reduce((s, r) => s + r.cantidad, 0);

  return NextResponse.json({ rows, totalMonto, totalOrdenes });
}
