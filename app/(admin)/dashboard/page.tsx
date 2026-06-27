import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Users, Package, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
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
      where: { activo: true, stockActual: { lte: prisma.repuesto.fields.stockMinimo } },
      take: 5,
      orderBy: { stockActual: "asc" },
    }),
    prisma.ordenTrabajo.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nombre: true } }, marca: { select: { nombre: true } } },
    }),
  ]);

  const estadoColors: Record<string, string> = {
    INGRESADO: "bg-gray-100 text-gray-700",
    EN_DIAGNOSTICO: "bg-blue-100 text-blue-700",
    ESPERANDO_REPUESTO: "bg-yellow-100 text-yellow-700",
    EN_REPARACION: "bg-orange-100 text-orange-700",
    TERMINADO: "bg-green-100 text-green-700",
    ENTREGADO: "bg-gray-100 text-gray-500",
    NO_REPARABLE: "bg-red-100 text-red-700",
    CANCELADO: "bg-red-100 text-red-400",
  };

  const estadoLabels: Record<string, string> = {
    INGRESADO: "Ingresado",
    EN_DIAGNOSTICO: "En Diagnóstico",
    ESPERANDO_REPUESTO: "Esp. Repuesto",
    EN_REPARACION: "En Reparación",
    TERMINADO: "Terminado",
    ENTREGADO: "Entregado",
    NO_REPARABLE: "No Reparable",
    CANCELADO: "Cancelado",
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Resumen del servicio técnico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Órdenes Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ordenesHoy}</p>
            <p className="text-xs text-gray-400">{totalOrdenes} total historico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">{ordenesEnProceso}</p>
            <p className="text-xs text-gray-400">diagnóstico + reparación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Listas para entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{ordenesTerminadas}</p>
            <p className="text-xs text-gray-400">estado terminado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalClientes}</p>
            <p className="text-xs text-gray-400">activos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
              {ultimasOrdenes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No hay órdenes aún</p>
              ) : (
                <div className="space-y-2">
                  {ultimasOrdenes.map((orden) => (
                    <Link
                      key={orden.id}
                      href={`/ordenes/${orden.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{orden.numero}</p>
                        <p className="text-xs text-gray-500">
                          {orden.cliente.nombre} · {orden.marca?.nombre ?? ""} {orden.modelo ?? ""}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColors[orden.estado]}`}>
                        {estadoLabels[orden.estado]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t">
                <Link href="/ordenes" className="text-sm text-blue-600 hover:underline">
                  Ver todas las órdenes →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockBajo.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">✓ Stock OK</p>
              ) : (
                <div className="space-y-2">
                  {stockBajo.map((rep) => (
                    <Link
                      key={rep.id}
                      href={`/repuestos/${rep.id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rep.descripcion}</p>
                        <p className="text-xs text-gray-400">{rep.numeroParte}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600 ml-2">{rep.stockActual}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t">
                <Link href="/repuestos" className="text-sm text-blue-600 hover:underline">
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
