"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getEstadoOrden, getEstadoPresupuesto, getTipoEquipo, formatDate, formatCurrency } from "@/lib/constants";

interface OrdenPortal {
  id: string;
  numero: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  marca: string | null;
  fechaIngreso: string;
  fechaEstimada: string | null;
  observacionesCliente: string | null;
  historial: Array<{ estado: string; nota: string | null; createdAt: string }>;
  presupuestoId: string | null;
}

interface PresPortal {
  id: string;
  numero: string;
  estado: string;
  total: number;
  fecha: string;
  validezDias: number;
  notas: string | null;
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; precioTotal: number }>;
  orden: { numero: string; modelo: string | null; marca: { nombre: string } | null } | null;
}

export default function PortalPage() {
  const [ordenes, setOrdenes] = useState<OrdenPortal[]>([]);
  const [presupuestos, setPresupuestos] = useState<PresPortal[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [resO, resP] = await Promise.all([
      fetch("/api/portal/ordenes"),
      fetch("/api/portal/presupuestos"),
    ]);
    if (resO.ok) setOrdenes(await resO.json());
    if (resP.ok) setPresupuestos(await resP.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function responderPresupuesto(id: string, accion: "APROBADO" | "RECHAZADO") {
    const res = await fetch("/api/portal/presupuestos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion }),
    });
    if (res.ok) {
      toast.success(accion === "APROBADO" ? "Presupuesto aprobado" : "Presupuesto rechazado");
      fetchData();
    } else {
      toast.error("Error al procesar");
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Equipos</h1>
        <p className="text-gray-500 text-sm">Consultá el estado de tus equipos y presupuestos</p>
      </div>

      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Órdenes ({ordenes.length})
          </TabsTrigger>
          <TabsTrigger value="presupuestos" className="gap-2">
            <FileText className="h-4 w-4" />
            Presupuestos ({presupuestos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="mt-4 space-y-3">
          {ordenes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No tenés órdenes registradas</p>
            </div>
          ) : (
            ordenes.map((o) => {
              const estado = getEstadoOrden(o.estado);
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base font-mono">{o.numero}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {getTipoEquipo(o.tipoEquipo)}
                          {o.marca ? ` · ${o.marca}` : ""}
                          {o.modelo ? ` ${o.modelo}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${estado.color}`}>{estado.label}</span>
                        <p className="text-xs text-gray-400 mt-1">Ingreso: {formatDate(o.fechaIngreso)}</p>
                        {o.fechaEstimada && (
                          <p className="text-xs text-blue-500">Estimado: {formatDate(o.fechaEstimada)}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {(o.observacionesCliente || o.historial.length > 0) && (
                    <CardContent className="pt-0 space-y-3">
                      {o.observacionesCliente && (
                        <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm text-blue-800">
                          <p className="font-medium text-xs text-blue-400 mb-1">Observaciones:</p>
                          {o.observacionesCliente}
                        </div>
                      )}
                      {o.historial.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-2">Historial reciente:</p>
                          <div className="space-y-1">
                            {o.historial.map((h, i) => {
                              const est = getEstadoOrden(h.estado);
                              return (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                                  {h.nota && <span className="text-gray-500">{h.nota}</span>}
                                  <span className="text-gray-300 ml-auto">{formatDate(h.createdAt)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="presupuestos" className="mt-4 space-y-3">
          {presupuestos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No tenés presupuestos</p>
            </div>
          ) : (
            presupuestos.map((p) => {
              const est = getEstadoPresupuesto(p.estado);
              return (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base font-mono">{p.numero}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {formatDate(p.fecha)} · Válido {p.validezDias} días
                        </p>
                        {p.orden && (
                          <p className="text-xs text-gray-400">
                            Orden: {p.orden.numero} {p.orden.marca?.nombre} {p.orden.modelo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatCurrency(p.total)}</p>
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${est.color}`}>{est.label}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="border rounded overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2">
                        <div className="col-span-7">Descripción</div>
                        <div className="col-span-2 text-center">Cant.</div>
                        <div className="col-span-3 text-right">Total</div>
                      </div>
                      {p.items.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 text-sm px-3 py-2 border-t">
                          <div className="col-span-7">{item.descripcion}</div>
                          <div className="col-span-2 text-center">{item.cantidad}</div>
                          <div className="col-span-3 text-right">{formatCurrency(item.precioTotal)}</div>
                        </div>
                      ))}
                    </div>
                    {p.notas && <p className="text-sm text-gray-500 italic">{p.notas}</p>}
                    {p.estado === "PENDIENTE" && (
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={() => responderPresupuesto(p.id, "APROBADO")}>
                          <CheckCircle className="h-4 w-4" />Aprobar
                        </Button>
                        <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2" onClick={() => responderPresupuesto(p.id, "RECHAZADO")}>
                          <XCircle className="h-4 w-4" />Rechazar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
