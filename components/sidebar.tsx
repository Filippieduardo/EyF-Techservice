"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, ClipboardList, FileText,
  Package, LogOut, UserCog, Menu, X, Tag, Building2,
  BadgeDollarSign, AlertTriangle, BarChart2, ChevronDown, ChevronRight,
  Clock, PauseCircle, UserCheck, DollarSign, CheckCircle2,
  FileQuestion, ArrowUpDown, TrendingUp, Wallet,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEmpresa } from "@/lib/empresa-context";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",               icon: LayoutDashboard, roles: ["ADMIN", "TECNICO"] },
  { href: "/empresa",      label: "Datos de Empresa",        icon: Building2,       roles: ["ADMIN"] },
  { href: "/clientes",     label: "Clientes",                icon: Users,           roles: ["ADMIN"] },
  { href: "/ordenes",      label: "Órdenes de Trabajo",      icon: ClipboardList,   roles: ["ADMIN", "TECNICO"] },
  { href: "/presupuestos", label: "Presupuestos",             icon: FileText,        roles: ["ADMIN"] },
  { href: "/categorias",   label: "Categorías de Repuestos", icon: Tag,             roles: ["ADMIN"] },
  { href: "/repuestos",    label: "Repuestos / Stock",        icon: Package,         roles: ["ADMIN", "TECNICO"] },
];

const informesItems = [
  { href: "/ordenes-pagar",                label: "Total Órdenes a Pagar",     icon: BadgeDollarSign, roles: ["ADMIN", "TECNICO"] },
  { href: "/stock-bajo",                   label: "Repuestos Stock Bajo",       icon: AlertTriangle,   roles: ["ADMIN", "TECNICO"] },
  { href: "/consulta-stock",               label: "Consulta de Stock",          icon: BarChart2,       roles: ["ADMIN", "TECNICO"] },
  { href: "/informes/ordenes-estado",      label: "Órdenes por Estado",         icon: ClipboardList,   roles: ["ADMIN", "TECNICO"] },
  { href: "/informes/tiempo-reparacion",   label: "Tiempo de Reparación",       icon: Clock,           roles: ["ADMIN"] },
  { href: "/informes/ordenes-sin-mov",     label: "Órdenes sin Movimiento",     icon: PauseCircle,     roles: ["ADMIN"] },
  { href: "/informes/productividad",       label: "Productividad por Técnico",  icon: UserCheck,       roles: ["ADMIN"] },
  { href: "/informes/facturacion",         label: "Facturación del Período",    icon: DollarSign,      roles: ["ADMIN"] },
  { href: "/informes/presup-aprobacion",   label: "Aprobación Presupuestos",    icon: CheckCircle2,    roles: ["ADMIN"] },
  { href: "/informes/ordenes-sin-presup",  label: "Órdenes sin Presupuesto",    icon: FileQuestion,    roles: ["ADMIN"] },
  { href: "/informes/mov-stock",           label: "Movimientos de Stock",       icon: ArrowUpDown,     roles: ["ADMIN", "TECNICO"] },
  { href: "/informes/repuestos-top",       label: "Repuestos más Usados",       icon: TrendingUp,      roles: ["ADMIN", "TECNICO"] },
  { href: "/informes/valorizacion",        label: "Valorización de Stock",      icon: Wallet,          roles: ["ADMIN"] },
  { href: "/informes/clientes-frecuentes", label: "Clientes Frecuentes",        icon: Users,           roles: ["ADMIN"] },
];

const adminItems = [
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
];

const sectionLabel: React.CSSProperties = {
  color: "oklch(0.96 0.04 292)",
  fontWeight: 800,
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  paddingLeft: "8px",
  paddingBottom: "4px",
  borderLeft: "3px solid oklch(0.72 0.18 292)",
  marginLeft: "8px",
};

interface SidebarProps { role: string; userName: string; }

function NavContent({ role, userName, pathname, onNav }: {
  role: string; userName: string; pathname: string; onNav?: () => void;
}) {
  const empresa = useEmpresa();
  const logoSrc = empresa?.logoPath ?? "/logo.jpeg";
  const nombreEmpresa = empresa?.nombre ?? "EyF-TechService";

  const informesRoutes = informesItems.map(i => i.href);
  const isInInformes = informesRoutes.some(r => pathname === r || pathname.startsWith(r + "/"));
  const [informesOpen, setInformesOpen] = useState(isInInformes);

  const linkClass = (active: boolean) => cn(
    "flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-xs font-medium transition-colors mb-0.5",
    active ? "text-white" : "hover:text-white"
  );
  const linkStyle = (active: boolean): React.CSSProperties => active
    ? { background: "oklch(0.55 0.14 292)" }
    : { color: "oklch(0.85 0.05 292)" };

  return (
    <div className="flex flex-col h-full text-white" style={{ background: "oklch(0.38 0.14 292)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "oklch(0.32 0.12 292)" }}>
        <Image src={logoSrc} alt={nombreEmpresa} width={36} height={36} className="rounded object-contain" unoptimized />
        <div>
          <p className="font-bold text-sm leading-tight">{nombreEmpresa}</p>
          <p className="text-xs" style={{ color: "oklch(0.80 0.06 292)" }}>Sistema de Gestión</p>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {/* ── MÓDULOS ── */}
        <div className="px-3 pt-1 pb-2">
          <p style={sectionLabel}>Módulos · {role === "ADMIN" ? "Administración" : "Técnico"}</p>
        </div>
        {navItems.filter(i => i.roles.includes(role)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={onNav}
              className={linkClass(active)} style={linkStyle(active)}>
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* ── INFORMES ── */}
        {informesItems.filter(i => i.roles.includes(role)).length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1">
              <button
                className="w-full flex items-center justify-between pr-1"
                onClick={() => setInformesOpen(o => !o)}
              >
                <p style={sectionLabel}>Informes</p>
                {informesOpen
                  ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "oklch(0.96 0.04 292)" }} />
                  : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "oklch(0.96 0.04 292)" }} />}
              </button>
            </div>
            {informesOpen && informesItems.filter(i => i.roles.includes(role)).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={onNav}
                  className={linkClass(active)} style={linkStyle(active)}>
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}

        {/* ── ADMINISTRACIÓN ── */}
        {role === "ADMIN" && (
          <>
            <div className="px-3 pt-3 pb-2">
              <p style={sectionLabel}>Administración</p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={onNav}
                  className={linkClass(active)} style={linkStyle(active)}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Usuario / cerrar sesión */}
      <div className="px-3 py-2 border-t" style={{ borderColor: "oklch(0.32 0.12 292)" }}>
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "oklch(0.55 0.14 292)" }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-xs" style={{ color: "oklch(0.75 0.06 292)" }}>{role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-3 py-1.5 w-full rounded text-xs transition-colors hover:text-white"
          style={{ color: "oklch(0.80 0.06 292)" }}
        >
          <LogOut className="h-3.5 w-3.5" />
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
      <div className="hidden md:flex w-56 min-h-screen flex-shrink-0">
        <div className="w-56 fixed top-0 left-0 h-screen">
          <NavContent role={role} userName={userName} pathname={pathname} />
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 border-b"
        style={{ background: "oklch(0.38 0.14 292)", borderColor: "oklch(0.32 0.12 292)" }}>
        <button onClick={() => setMobileOpen(true)} className="text-white p-1 rounded">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Image src="/logo.jpeg" alt="EyF-TechService" width={28} height={28} className="rounded" />
          <span className="font-bold text-white text-sm">EyF-TechService</span>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-full">
              <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 z-10 text-white/70 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
              <NavContent role={role} userName={userName} pathname={pathname} onNav={() => setMobileOpen(false)} />
            </div>
          </div>
          <div className="flex-1 bg-black/50" />
        </div>
      )}
    </>
  );
}
