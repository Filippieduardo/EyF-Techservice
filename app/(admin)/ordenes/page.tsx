"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ESTADOS_ORDEN, TIPOS_EQUIPO, getEstadoOrden, getTipoEquipo, formatDate, getEstadoPresupuesto } from "@/lib/constants";

interface Orden {
  id: string;
  numero: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  fechaIngreso: string;
  fechaCambioEstado: string | null;
  fechaEnvio: string | null;
  ubicacionActual: string;
  presupuestoId: string | null;
  presupuesto: { id: string; estado: string } | null;
  cliente: { id: string; nombre: string };
  tecnico: { id: string; nombre: string } | null;
  marca: { nombre: string } | null;
}

export default function OrdenesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const userId = (session?.user as any)?.id;
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("all");
  const [loading, setLoading] = useState(true);

  async function fetchOrdenes() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado && estado !== "all") params.set("estado", estado);
    const res = await fetch(`/api/ordenes?${params}`);
    let data: Orden[] = await res.json();
    if (!isAdmin) {
      data = data.filter(o => o.tecnico?.id === userId && o.ubicacionActual === "TALLER");
    }
    // Entregadas: ordenadas por fechaEnvio asc; resto: por fechaIngreso asc
    data.sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());
    setOrdenes(data);
    setLoading(false);
  }

  useEffect(() => { fetchOrdenes(); }, [q, estado, isAdmin, userId]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-gray-500 text-sm">{ordenes.length} órdenes</p>
        </div>
        {isAdmin && (
          <Link href="/ordenes/nueva">
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Orden</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar número, cliente, modelo..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={estado} onValueChange={v => setEstado(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS_ORDEN.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay órdenes</p>
        </div>
      ) : (
        <div className="space-y-6">
          <OrdenGrilla titulo="ENTREGADAS" ordenes={ordenes.filter(o => o.estado === "ENTREGADO").sort((a, b) => new Date(a.fechaEnvio ?? a.fechaIngreso).getTime() - new Date(b.fechaEnvio ?? b.fechaIngreso).getTime())} />
          <OrdenGrilla titulo="EN CURSO" ordenes={ordenes.filter(o => o.estado !== "ENTREGADO")} />
        </div>
      )}
    </div>
  );
}

function OrdenGrilla({ titulo, ordenes }: { titulo: string; ordenes: Orden[] }) {
  if (ordenes.length === 0) return null;
  return (
    <div>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{titulo} ({ordenes.length})</h2>
      <Card>
        {/* Encabezados */}
        <div className="grid grid-cols-[7rem_6rem_1fr_1fr_10rem_7rem_8rem_7rem] gap-2 px-4 py-2 border-b bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide hidden md:grid">
          <span>Nro. Orden</span>
          <span>Fecha Ingreso</span>
          <span>Cliente</span>
          <span>Equipo</span>
          <span>Técnico</span>
          <span>Presupuesto</span>
          <span>Ubicación</span>
          <span>Estado</span>
        </div>
        <div className="divide-y divide-border">
        {ordenes.map((o) => {
          const estado = getEstadoOrden(o.estado);
          return (
            <Link key={o.id} href={`/ordenes/${o.id}`}>
              <div className="grid grid-cols-[7rem_6rem_1fr_1fr_10rem_7rem_8rem_7rem] gap-2 px-4 py-2.5 items-center hover:bg-muted/40 transition-colors cursor-pointer hidden md:grid">
                <span className="font-mono font-bold text-sm text-primary">{o.numero}</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(o.fechaIngreso)}</span>
                <span className="font-semibold text-sm text-foreground truncate">{o.cliente.nombre}</span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {getTipoEquipo(o.tipoEquipo)}{o.marca ? ` · ${o.marca.nombre}` : ""}{o.modelo ? ` ${o.modelo}` : ""}
                </span>
                <span className="text-sm font-semibold text-foreground truncate">{o.tecnico?.nombre ?? "—"}</span>
                <span>
                  {o.presupuesto ? (
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${getEstadoPresupuesto(o.presupuesto.estado).color}`}>
                      {getEstadoPresupuesto(o.presupuesto.estado).label}
                    </span>
                  ) : o.presupuestoId ? (
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-sky-400 text-black">PRESUPUESTO</span>
                  ) : ["INGRESADO", "SIN_DIAGNOSTICAR", "EN_DIAGNOSTICO"].includes(o.estado) ? (
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-600 text-white">NO PRESUPUESTADA</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-pink-600 text-black">NO PRES.</span>
                  )}
                </span>
                <span>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    o.ubicacionActual === "TALLER" ? "bg-red-600 text-white" : "bg-green-600 text-white"
                  }`}>
                    {o.ubicacionActual === "TALLER" ? "TALLER" : "LOCAL"}
                  </span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estado.color}`}>{estado.label}</span>
                  {o.fechaCambioEstado && <span className="text-xs text-gray-400 pl-1">{formatDate(o.fechaCambioEstado)}</span>}
                </span>
              </div>
              {/* Mobile fallback */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer md:hidden m-2">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm text-primary">{o.numero}</p>
                      <p className="text-sm font-semibold text-foreground">{o.cliente.nombre}</p>
                      <p className="text-sm font-semibold text-foreground">{getTipoEquipo(o.tipoEquipo)}{o.marca ? ` · ${o.marca.nombre}` : ""}</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(o.fechaIngreso)}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {o.presupuesto ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${getEstadoPresupuesto(o.presupuesto.estado).color}`}>
                          {getEstadoPresupuesto(o.presupuesto.estado).label}
                        </span>
                      ) : ["INGRESADO", "SIN_DIAGNOSTICAR", "EN_DIAGNOSTICO"].includes(o.estado) ? (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-600 text-white">NO PRESUPUESTADA</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-pink-600 text-black">NO PRES.</span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded font-bold ${
                        o.ubicacionActual === "TALLER" ? "bg-red-600 text-white" : "bg-green-600 text-white"
                      }`}>
                        {o.ubicacionActual === "TALLER" ? "TALLER" : "LOCAL"}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${estado.color}`}>
                        {estado.label}
                      </span>
                      {o.fechaCambioEstado && <span className="text-xs text-gray-400">{formatDate(o.fechaCambioEstado)}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        </div>
      </Card>
    </div>
  );
}
