import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || (session.user as any).type !== "staff") {
    redirect("/login");
  }

  const role = (session.user as any).role as string;
  const userName = session.user?.name ?? "Usuario";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} userName={userName} />
      {/* pt-14 on mobile to clear the fixed top bar; md:pt-0 restores desktop */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
      <Toaster richColors />
    </div>
  );
}
