import { auth } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Encabezado con logo y nombre ── */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 relative flex flex-col items-center gap-1">
          <Image src="/logo.jpeg" alt="EyF-TechService" width={72} height={72} className="rounded shadow" />
          <h1 className="text-xl font-bold" style={{ color: "oklch(0.42 0.14 292)" }}>EyF-TechService</h1>
          <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.14 292)" }}>Sistema de Gestión de Servicio Técnico</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {children}
      </main>
      <Toaster richColors />
    </div>
  );
}
