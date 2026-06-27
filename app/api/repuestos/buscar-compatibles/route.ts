import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipoEquipo = searchParams.get("tipoEquipo") ?? "";
  const marcaId = searchParams.get("marcaId") ?? "";
  const modelo = searchParams.get("modelo") ?? "";
  const numeroParte = searchParams.get("numeroParte") ?? "";

  const repuestos = await prisma.repuesto.findMany({
    where: {
      activo: true,
      ...(numeroParte
        ? {
            OR: [
              { numeroParte: { contains: numeroParte, mode: "insensitive" } },
              {
                compatibilidades: {
                  some: { numeroParteOem: { contains: numeroParte, mode: "insensitive" } },
                },
              },
            ],
          }
        : {
            compatibilidades: {
              some: {
                ...(tipoEquipo ? { tipoEquipo: tipoEquipo as any } : {}),
                ...(marcaId ? { marcaId } : {}),
                ...(modelo ? { modelo: { contains: modelo, mode: "insensitive" } } : {}),
              },
            },
          }),
    },
    include: {
      compatibilidades: {
        include: { marca: { select: { nombre: true } } },
        where: {
          ...(tipoEquipo ? { tipoEquipo: tipoEquipo as any } : {}),
          ...(marcaId ? { marcaId } : {}),
          ...(modelo ? { modelo: { contains: modelo, mode: "insensitive" } } : {}),
        },
      },
    },
    orderBy: { descripcion: "asc" },
  });

  return NextResponse.json(repuestos);
}
