import { auth } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "@/auth";
import { LogOut, Wrench } from "lucide-react";
import Image from "next/image";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isCliente = session && (session.user as any).type === "cliente";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b sticky top-0 z-10" style={{ background: "oklch(0.38 0.14 292)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="EyF-TechService" width={32} height={32} className="rounded" />
            <div>
              <p className="font-semibold text-sm text-white">Portal Cliente</p>
              {isCliente && (
                <p className="text-xs" style={{ color: "oklch(0.85 0.05 292)" }}>{session.user?.name}</p>
              )}
            </div>
          </div>
          {isCliente && (
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/portal/login" });
            }}>
              <button type="submit" className="flex items-center gap-1 text-sm hover:text-white transition-colors" style={{ color: "oklch(0.85 0.05 292)" }}>
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
      <Toaster richColors />
    </div>
  );
}
