import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Aumentar límite de body para imágenes grandes
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Recibir como JSON con base64
    const body = await req.json();
    const { base64, ext } = body as { base64: string; ext: string };

    if (!base64) return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });

    const buffer = Buffer.from(base64, "base64");
    const filename = `logo.${ext ?? "png"}`;
    const dir = path.join(process.cwd(), "public", "empresa");
    await mkdir(dir, { recursive: true });
    const savePath = path.join(dir, filename);
    await writeFile(savePath, buffer);

    const logoPath = `/empresa/${filename}`;
    const existing = await prisma.empresa.findFirst();
    if (existing) {
      await prisma.empresa.update({ where: { id: existing.id }, data: { logoPath } });
    } else {
      await prisma.empresa.create({ data: { nombre: "Mi Empresa", logoPath } });
    }

    return NextResponse.json({ logoPath });
  } catch (err: any) {
    console.error("[LOGO UPLOAD ERROR]", err);
    return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
  }
}
