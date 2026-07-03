"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getTipoEquipo, formatDate, formatCurrency } from "@/lib/constants";

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  INGRESADO:          { bg: "bg-gray-600",   text: "text-white", label: "Ingresado" },
  EN_DIAGNOSTICO:     { bg: "bg-blue-600",   text: "text-white", label: "En Diagnóstico" },
  ESPERANDO_REPUESTO: { bg: "bg-amber-500",  text: "text-white", label: "Esp. Repuesto" },
  EN_REPARACION:      { bg: "bg-orange-600", text: "text-white", label: "En Reparación" },
  TERMINADO:          { bg: "bg-green-600",  text: "text-white", label: "Terminado" },
  ENTREGADO:          { bg: "bg-gray-400",   text: "text-white", label: "Entregado" },
  NO_REPARABLE:       { bg: "bg-red-700",    text: "text-white", label: "No Reparable" },
  CANCELADO:          { bg: "bg-red-400",    text: "text-white", label: "Cancelado" },
};

function EstadoBadge({ estado }: { estado: string }) {
  const s = ESTADO_STYLES[estado] ?? { bg: "bg-gray-500", text: "text-white", label: estado };
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

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
  diagnostico: string | null;
  trabajoRealizado: string | null;
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

const PRES_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDIENTE:  { bg: "bg-amber-500",  text: "text-white", label: "Pendiente" },
  APROBADO:   { bg: "bg-green-600",  text: "text-white", label: "Aprobado" },
  RECHAZADO:  { bg: "bg-red-600",    text: "text-white", label: "Rechazado" },
  VENCIDO:    { bg: "bg-gray-500",   text: "text-white", label: "Vencido" },
};

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
            ordenes.map((o) => (
              <Card key={o.id} className="overflow-hidden">
                <CardHeader className="pb-0" style={{ background: "oklch(0.38 0.14 292)" }}>
                  <div className="flex items-start justify-between flex-wrap gap-2 pb-3">
                    <div>
                      <CardTitle className="text-base font-mono text-white">{o.numero}</CardTitle>
                      <p className="text-sm font-medium text-white mt-0.5">
                        {getTipoEquipo(o.tipoEquipo)}
                        {o.marca ? ` · ${o.marca}` : ""}
                        {o.modelo ? ` ${o.modelo}` : ""}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.85 0.05 292)" }}>
                        Ingreso: <span className="text-white font-medium">{formatDate(o.fechaIngreso)}</span>
                        {o.fechaEstimada && (
                          <> · Estimado: <span className="text-white font-medium">{formatDate(o.fechaEstimada)}</span></>
                        )}
                      </p>
                    </div>
                    <EstadoBadge estado={o.estado} />
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  {o.observacionesCliente && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                      <p className="font-semibold text-xs text-blue-600 mb-1">Observaciones:</p>
                      {o.observacionesCliente}
                    </div>
                  )}
                  {o.diagnostico && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-800">
                      <p className="font-semibold text-xs text-gray-500 mb-1">Diagnóstico:</p>
                      {o.diagnostico}
                    </div>
                  )}
                  {o.trabajoRealizado && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900">
                      <p className="font-semibold text-xs text-green-600 mb-1">Trabajo Realizado:</p>
                      {o.trabajoRealizado}
                    </div>
                  )}
                  {o.historial.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Historial reciente:</p>
                      <div className="space-y-1.5">
                        {o.historial.map((h, i) => {
                          const s = ESTADO_STYLES[h.estado] ?? { bg: "bg-gray-500", text: "text-white", label: h.estado };
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${s.bg} ${s.text}`}>{s.label}</span>
                              {h.nota && <span className="text-gray-700">{h.nota}</span>}
                              <span className="text-gray-500 ml-auto flex-shrink-0 font-medium">{formatDate(h.createdAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
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
              const st = PRES_STYLES[p.estado] ?? { bg: "bg-gray-500", text: "text-white", label: p.estado };
              return (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader className="pb-0" style={{ background: "oklch(0.38 0.14 292)" }}>
                    <div className="flex items-start justify-between flex-wrap gap-2 pb-3">
                      <div>
                        <CardTitle className="text-base font-mono text-white">{p.numero}</CardTitle>
                        <p className="text-sm text-white mt-0.5">
                          {formatDate(p.fecha)} · Válido {p.validezDias} días
                        </p>
                        {p.orden && (
                          <p className="text-xs mt-0.5" style={{ color: "oklch(0.85 0.05 292)" }}>
                            Orden: {p.orden.numero} {p.orden.marca?.nombre} {p.orden.modelo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">{formatCurrency(p.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3">
                    <div className="border rounded overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-2">
                        <div className="col-span-7">Descripción</div>
                        <div className="col-span-2 text-center">Cant.</div>
                        <div className="col-span-3 text-right">Total</div>
                      </div>
                      {p.items.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 text-sm px-3 py-2 border-t">
                          <div className="col-span-7">{item.descripcion}</div>
                          <div className="col-span-2 text-center">{item.cantidad}</div>
                          <div className="col-span-3 text-right font-medium">{formatCurrency(item.precioTotal)}</div>
                        </div>
                      ))}
                    </div>
                    {p.notas && <p className="text-sm text-gray-600 italic">{p.notas}</p>}
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
