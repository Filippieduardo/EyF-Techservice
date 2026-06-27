import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "@/auth";
import { LogOut, Wrench } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const isLoginPage = false;

  return (
    <div className="min-h-screen bg-gray-50">
      {session && (session.user as any).type === "cliente" && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 p-1 rounded">
                <Wrench className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Portal Cliente</p>
                <p className="text-xs text-gray-400">{session.user?.name}</p>
              </div>
            </div>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/portal/login" });
            }}>
              <button type="submit" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </form>
          </div>
        </header>
      )}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
      <Toaster richColors />
    </div>
  );
}
