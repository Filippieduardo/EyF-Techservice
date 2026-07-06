import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Users, Package, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Wrench,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  const isTecnico = role === "TECNICO";

  const tecnicoFilter = isTecnico
    ? { ubicacionActual: "TALLER" as const, fechaEnvio: { not: null } }
    : {};

  const [
    totalOrdenes,
    ordenesHoy,
    ordenesEnProceso,
    ordenesTerminadas,
    totalClientes,
    stockBajo,
    ordenesEntregadas,
    ordenesActivas,
    ordenesPorEstado,
  ] = await Promise.all([
    prisma.ordenTrabajo.count({ where: tecnicoFilter }),
    prisma.ordenTrabajo.count({
      where: { ...tecnicoFilter, fechaIngreso: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.ordenTrabajo.count({
      where: { ...tecnicoFilter, estado: { in: ["EN_DIAGNOSTICO", "ESPERANDO_REPUESTO", "EN_REPARACION"] } },
    }),
    prisma.ordenTrabajo.count({ where: { ...tecnicoFilter, estado: "TERMINADO" } }),
    prisma.cliente.count({ where: { activo: true } }),
    prisma.repuesto.findMany({
      where: { activo: true, stockActual: { lte: 5 } },
      take: 5,
      orderBy: { stockActual: "asc" },
      include: { categoria: { select: { nombre: true } } },
    }),
    prisma.ordenTrabajo.findMany({
      where: { ...tecnicoFilter, estado: "ENTREGADO" },
      orderBy: { fechaCierre: "asc" },
      include: { cliente: { select: { nombre: true } }, marca: { select: { nombre: true } } },
    }),
    prisma.ordenTrabajo.findMany({
      where: { ...tecnicoFilter, estado: { not: "ENTREGADO" } },
      orderBy: { fechaIngreso: "asc" },
      include: { cliente: { select: { nombre: true } }, marca: { select: { nombre: true } } },
    }),
    prisma.ordenTrabajo.groupBy({
      by: ["estado"],
      where: tecnicoFilter,
      _count: { estado: true },
    }),
  ]);

  const estadoColors: Record<string, string> = {
    INGRESADO:          "bg-green-600 text-white border-green-700",
    EN_DIAGNOSTICO:     "bg-green-600 text-white border-green-700",
    DIAGNOSTICADO:      "bg-yellow-400 text-black border-yellow-500",
    ESPERANDO_REPUESTO: "bg-purple-600 text-white border-purple-700",
    EN_REPARACION:      "bg-yellow-400 text-black border-yellow-500",
    TERMINADO:          "bg-sky-400 text-white border-sky-500",
    ENTREGADO:          "bg-sky-400 text-white border-sky-500",
    NO_REPARABLE:       "bg-red-600 text-white border-red-700",
    CANCELADO:          "bg-red-600 text-white border-red-700",
  };

  const estadoLabels: Record<string, string> = {
    INGRESADO:          "INGRESADO",
    EN_DIAGNOSTICO:     "EN DIAGNÓSTICO",
    DIAGNOSTICADO:      "DIAGNOSTICADO",
    ESPERANDO_REPUESTO: "ESPERANDO REPUESTO",
    EN_REPARACION:      "EN REPARACIÓN",
    TERMINADO:          "TERMINADO",
    ENTREGADO:          "ENTREGADO",
    NO_REPARABLE:       "NO REPARABLE",
    CANCELADO:          "CANCELADO",
  };

  return (
    <div className="p-4 md:p-5 space-y-4">
      {/* Título de página */}
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Wrench className="h-4 w-4 text-primary" />
        <h1 className="text-base font-bold text-foreground">Dashboard</h1>
        <span className="text-xs text-muted-foreground ml-1">— Resumen del servicio técnico</span>
      </div>

      {/* Métricas generales — solo admin */}
      {!isTecnico && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader>
              <ClipboardList className="h-3.5 w-3.5" />
              <CardTitle>Órdenes Hoy</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-2">
              <p className="text-3xl font-bold text-primary">{ordenesHoy}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{totalOrdenes} total histórico</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-3.5 w-3.5" />
              <CardTitle>En Proceso</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-2">
              <p className="text-3xl font-bold text-orange-500">{ordenesEnProceso}</p>
              <p className="text-xs text-muted-foreground mt-0.5">diagnóstico + reparación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <CardTitle>Para Entregar</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-2">
              <p className="text-3xl font-bold text-green-600">{ordenesTerminadas}</p>
              <p className="text-xs text-muted-foreground mt-0.5">estado terminado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-3.5 w-3.5" />
              <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-2">
              <p className="text-3xl font-bold text-primary">{totalClientes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">activos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Totales por estado — ambos roles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(estadoColors).map(([est, colorClass]) => {
          const count = ordenesPorEstado.find((g: any) => g.estado === est)?._count?.estado ?? 0;
          if (count === 0) return null;
          return (
            <Card key={est}>
              <CardContent className="pt-3 pb-3">
                <p className="text-3xl font-bold">{count}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${colorClass.split(" border")[0]}`}>
                  {estadoLabels[est]}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Grilla 1: Entregadas */}
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              <CardTitle>Órdenes Entregadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ordenesEntregadas.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-4">Sin órdenes entregadas</p>
              ) : (
                <OrdenTable ordenes={ordenesEntregadas} estadoColors={estadoColors} estadoLabels={estadoLabels} />
              )}
            </CardContent>
          </Card>

          {/* Grilla 2: Resto */}
          <Card>
            <CardHeader>
              <TrendingUp className="h-3.5 w-3.5" />
              <CardTitle>Órdenes en Curso</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ordenesActivas.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-4">No hay órdenes activas</p>
              ) : (
                <OrdenTable ordenes={ordenesActivas} estadoColors={estadoColors} estadoLabels={estadoLabels} />
              )}
              <div className="px-3 py-2 border-t bg-muted/20">
                <Link href="/ordenes" className="text-xs text-primary hover:underline font-medium">
                  Ver todas las órdenes →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              <CardTitle>Stock Bajo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stockBajo.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-6">✓ Todo el stock está OK</p>
              ) : (
                <div className="divide-y divide-border">
                  {stockBajo.map((rep) => (
                    <Link
                      key={rep.id}
                      href={`/repuestos/${rep.id}`}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{rep.descripcion}</p>
                        <p className="text-xs text-muted-foreground">{rep.categoria?.nombre ?? "Sin categoría"}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600 ml-2 flex-shrink-0">{rep.stockActual}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 border-t bg-muted/20">
                <Link href="/repuestos" className="text-xs text-primary hover:underline font-medium">
                  Gestionar repuestos →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OrdenTable({ ordenes, estadoColors, estadoLabels }: {
  ordenes: any[];
  estadoColors: Record<string, string>;
  estadoLabels: Record<string, string>;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b bg-muted/40">
          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Nro</th>
          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Cliente</th>
          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground hidden md:table-cell">Equipo</th>
          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Ubic.</th>
          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {ordenes.map((orden) => (
          <tr key={orden.id} className="hover:bg-muted/30 transition-colors">
            <td className="px-3 py-1.5">
              <Link href={`/ordenes/${orden.id}`} className="font-mono text-primary hover:underline font-medium">
                {orden.numero}
              </Link>
            </td>
            <td className="px-3 py-1.5 text-foreground">{orden.cliente.nombre}</td>
            <td className="px-3 py-1.5 text-muted-foreground hidden md:table-cell">
              {orden.marca?.nombre ?? ""} {orden.modelo ?? ""}
            </td>
            <td className="px-3 py-1.5">
              <span className={`px-2 py-1 rounded font-bold text-sm ${
                orden.ubicacionActual === "TALLER" ? "bg-red-600 text-white" : "bg-green-600 text-white"
              }`}>
                {orden.ubicacionActual === "TALLER" ? "TALLER" : "LOCAL"}
              </span>
            </td>
            <td className="px-3 py-1.5">
              <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${estadoColors[orden.estado] ?? "bg-gray-200 text-gray-700 border-gray-300"}`}>
                {estadoLabels[orden.estado] ?? orden.estado}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
