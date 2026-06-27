"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, ClipboardList, FileText,
  Package, LogOut, Wrench, UserCog, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TECNICO"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["ADMIN", "TECNICO"] },
  { href: "/ordenes", label: "Órdenes de Trabajo", icon: ClipboardList, roles: ["ADMIN", "TECNICO"] },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText, roles: ["ADMIN"] },
  { href: "/repuestos", label: "Repuestos / Stock", icon: Package, roles: ["ADMIN", "TECNICO"] },
];

const adminItems = [
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
];

interface SidebarProps {
  role: string;
  userName: string;
}

function NavContent({ role, userName, pathname, onNav }: {
  role: string;
  userName: string;
  pathname: string;
  onNav?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <div className="bg-blue-500 p-1.5 rounded">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">TechService</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.roles.includes(role)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs text-gray-500 uppercase px-3">Administración</p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNav}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="bg-gray-600 rounded-full h-7 w-7 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 min-h-screen flex-shrink-0">
        <div className="w-64 fixed top-0 left-0 h-screen">
          <NavContent role={role} userName={userName} pathname={pathname} />
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-gray-900 px-4 py-3 border-b border-gray-700">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-1 rounded hover:bg-gray-800"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 p-1 rounded">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">TechService</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 z-10 text-gray-400 hover:text-white p-1"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
              <NavContent
                role={role}
                userName={userName}
                pathname={pathname}
                onNav={() => setMobileOpen(false)}
              />
            </div>
          </div>
          <div className="flex-1 bg-black/50" />
        </div>
      )}
    </>
  );
}
