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

  const [
    totalOrdenes,
    ordenesHoy,
    ordenesEnProceso,
    ordenesTerminadas,
    totalClientes,
    stockBajo,
    ultimasOrdenes,
  ] = await Promise.all([
    prisma.ordenTrabajo.count(),
    prisma.ordenTrabajo.count({
      where: { fechaIngreso: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.ordenTrabajo.count({
      where: { estado: { in: ["EN_DIAGNOSTICO", "ESPERANDO_REPUESTO", "EN_REPARACION"] } },
    }),
    prisma.ordenTrabajo.count({ where: { estado: "TERMINADO" } }),
    prisma.cliente.count({ where: { activo: true } }),
    prisma.repuesto.findMany({
      where: { activo: true, stockActual: { lte: 5 } },
      take: 5,
      orderBy: { stockActual: "asc" },
      include: { categoria: { select: { nombre: true } } },
    }),
    prisma.ordenTrabajo.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nombre: true } }, marca: { select: { nombre: true } } },
    }),
  ]);

  const estadoColors: Record<string, string> = {
    INGRESADO:          "bg-gray-100 text-gray-700 border-gray-300",
    EN_DIAGNOSTICO:     "bg-blue-100 text-blue-700 border-blue-300",
    ESPERANDO_REPUESTO: "bg-yellow-100 text-yellow-700 border-yellow-300",
    EN_REPARACION:      "bg-orange-100 text-orange-700 border-orange-300",
    TERMINADO:          "bg-green-100 text-green-700 border-green-300",
    ENTREGADO:          "bg-gray-100 text-gray-500 border-gray-200",
    NO_REPARABLE:       "bg-red-100 text-red-700 border-red-300",
    CANCELADO:          "bg-red-50 text-red-400 border-red-200",
  };

  const estadoLabels: Record<string, string> = {
    INGRESADO:          "Ingresado",
    EN_DIAGNOSTICO:     "En Diagnóstico",
    ESPERANDO_REPUESTO: "Esp. Repuesto",
    EN_REPARACION:      "En Reparación",
    TERMINADO:          "Terminado",
    ENTREGADO:          "Entregado",
    NO_REPARABLE:       "No Reparable",
    CANCELADO:          "Cancelado",
  };

  return (
    <div className="p-4 md:p-5 space-y-4">
      {/* Título de página */}
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Wrench className="h-4 w-4 text-primary" />
        <h1 className="text-base font-bold text-foreground">Dashboard</h1>
        <span className="text-xs text-muted-foreground ml-1">— Resumen del servicio técnico</span>
      </div>

      {/* Métricas */}
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

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <TrendingUp className="h-3.5 w-3.5" />
              <CardTitle>Últimas Órdenes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ultimasOrdenes.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-6">No hay órdenes aún</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Nro</th>
                      <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Cliente</th>
                      <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground hidden md:table-cell">Equipo</th>
                      <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ultimasOrdenes.map((orden) => (
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
                          <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${estadoColors[orden.estado]}`}>
                            {estadoLabels[orden.estado]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
