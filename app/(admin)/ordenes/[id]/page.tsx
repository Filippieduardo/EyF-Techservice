"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MarcaSelect } from "@/components/marca-select";
import { ArrowLeft, Save, FileText, Clock, DollarSign, Plus, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  ESTADOS_ORDEN, TIPOS_EQUIPO, getEstadoOrden, getTipoEquipo,
  formatDate, formatCurrency,
} from "@/lib/constants";

interface Orden {
  id: string;
  numero: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  numeroSerie: string | null;
  descripcionProblema: string;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  notasInternas: string | null;
  observacionesCliente: string | null;
  costoTecnico: number | null;
  fechaIngreso: string;
  fechaEstimada: string | null;
  fechaCierre: string | null;
  cliente: { id: string; nombre: string; email: string | null; telefono: string | null };
  tecnico: { id: string; nombre: string } | null;
  marca: { id: string; nombre: string } | null;
  historial: Array<{ id: string; estado: string; nota: string | null; createdAt: string; user: { nombre: string } | null }>;
  presupuesto: { id: string; numero: string; estado: string; total: number } | null;
}

interface Tecnico { id: string; nombre: string; }
interface RepuestoItem {
  id: string;
  cantidad: number;
  descontado: boolean;
  repuesto: { id: string; descripcion: string; numeroParte: string | null; stockActual: number };
}
interface RepuestoSearch { id: string; descripcion: string; numeroParte: string | null; stockActual: number; }

export default function OrdenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [orden, setOrden] = useState<Orden | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [estadoForm, setEstadoForm] = useState({ estado: "", nota: "" });
  const [repuestosUsados, setRepuestosUsados] = useState<RepuestoItem[]>([]);
  const [repuestoSearch, setRepuestoSearch] = useState("");
  const [repuestoResults, setRepuestoResults] = useState<RepuestoSearch[]>([]);
  const [addingRepuesto, setAddingRepuesto] = useState<RepuestoSearch | null>(null);
  const [cantidadAdd, setCantidadAdd] = useState(1);

  async function fetchOrden() {
    const res = await fetch(`/api/ordenes/${id}`);
    const data = await res.json();
    setOrden(data);
    setForm({
      tipoEquipo: data.tipoEquipo,
      marcaId: data.marca?.id ?? "",
      modelo: data.modelo ?? "",
      numeroSerie: data.numeroSerie ?? "",
      descripcionProblema: data.descripcionProblema,
      diagnostico: data.diagnostico ?? "",
      trabajoRealizado: data.trabajoRealizado ?? "",
      notasInternas: data.notasInternas ?? "",
      observacionesCliente: data.observacionesCliente ?? "",
      costoTecnico: data.costoTecnico ?? "",
      tecnicoId: data.tecnico?.id ?? "",
      fechaEstimada: data.fechaEstimada ? data.fechaEstimada.split("T")[0] : "",
    });
    setEstadoForm({ estado: data.estado, nota: "" });
  }

  async function fetchRepuestosUsados() {
    try {
      const res = await fetch(`/api/ordenes/${id}/repuestos`, { cache: "no-store" });
      if (res.ok) {
        setRepuestosUsados(await res.json());
      } else {
        const text = await res.text();
        console.error("fetchRepuestosUsados error:", res.status, text);
        toast.error(`Error al cargar repuestos: ${res.status}`);
      }
    } catch (e) {
      console.error("fetchRepuestosUsados exception:", e);
      toast.error("Error de conexión al cargar repuestos");
    }
  }

  useEffect(() => {
    fetchOrden();
    fetchRepuestosUsados();
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then(setTecnicos);
  }, [id]);

  async function buscarRepuesto(q: string) {
    setRepuestoSearch(q);
    if (q.length < 2) { setRepuestoResults([]); return; }
    const res = await fetch(`/api/repuestos?q=${encodeURIComponent(q)}`);
    if (res.ok) setRepuestoResults(await res.json());
  }

  async function agregarRepuesto() {
    if (!addingRepuesto) return;
    try {
      const res = await fetch(`/api/ordenes/${id}/repuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repuestoId: addingRepuesto.id, cantidad: cantidadAdd }),
      });
      if (res.ok) {
        toast.success("Repuesto agregado");
        setAddingRepuesto(null);
        setRepuestoSearch("");
        setRepuestoResults([]);
        setCantidadAdd(1);
        fetchRepuestosUsados();
      } else {
        const text = await res.text();
        let msg = `Error ${res.status}`;
        try { msg = JSON.parse(text).error ?? msg; } catch {}
        toast.error(msg);
      }
    } catch (e) {
      toast.error("Error de conexión al agregar repuesto");
    }
  }

  async function quitarRepuesto(itemId: string) {
    try {
      const res = await fetch(`/api/ordenes/${id}/repuestos?itemId=${itemId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Repuesto quitado"); fetchRepuestosUsados(); }
      else {
        const text = await res.text();
        let msg = `Error ${res.status}`;
        try { msg = JSON.parse(text).error ?? msg; } catch {}
        toast.error(msg);
      }
    } catch (e) { toast.error("Error de conexión"); }
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      marcaId: form.marcaId === "none" ? null : form.marcaId || null,
      tecnicoId: form.tecnicoId === "none" ? null : form.tecnicoId || null,
      costoTecnico: form.costoTecnico !== "" ? Number(form.costoTecnico) : null,
      fechaEstimada: form.fechaEstimada || null,
    };
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Orden actualizada");
      fetchOrden();
      fetchRepuestosUsados();
    } else {
      toast.error("Error al guardar");
    }
  }

  async function handleCambioEstado() {
    if (!estadoForm.estado) return;
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: estadoForm.estado, notaEstado: estadoForm.nota }),
    });
    if (res.ok) {
      toast.success("Estado actualizado");
      fetchOrden();
      fetchRepuestosUsados();
    } else {
      toast.error("Error al cambiar estado");
    }
  }

  if (!orden) return <div className="p-6 text-gray-400">Cargando...</div>;

  const estadoActual = getEstadoOrden(orden.estado);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{orden.numero}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoActual.color}`}>
              {estadoActual.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{orden.cliente.nombre} · Ingreso: {formatDate(orden.fechaIngreso)}</p>
        </div>
        <div className="flex gap-2">
          {!orden.presupuesto && isAdmin && (
            <Link href={`/presupuestos/nuevo?ordenId=${id}&clienteId=${orden.cliente.id}`}>
              <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />Presupuesto</Button>
            </Link>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del Equipo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Tipo de Equipo</Label>
                <Select value={form.tipoEquipo} onValueChange={v => setForm({...form, tipoEquipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_EQUIPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <MarcaSelect value={form.marcaId} onValueChange={v => setForm({...form, marcaId: v})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Número de Serie</Label>
                  <Input value={form.numeroSerie} onChange={e => setForm({...form, numeroSerie: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Descripción y Trabajo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Problema Reportado</Label>
                <Textarea value={form.descripcionProblema} onChange={e => setForm({...form, descripcionProblema: e.target.value})} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Diagnóstico</Label>
                <Textarea value={form.diagnostico} onChange={e => setForm({...form, diagnostico: e.target.value})} rows={2} placeholder="Diagnóstico técnico..." />
              </div>
              <div className="space-y-1">
                <Label>Trabajo Realizado</Label>
                <Textarea value={form.trabajoRealizado} onChange={e => setForm({...form, trabajoRealizado: e.target.value})} rows={2} placeholder="Detalle del trabajo..." />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-orange-600">🔒 Notas Internas (solo técnicos)</Label>
                <Textarea value={form.notasInternas} onChange={e => setForm({...form, notasInternas: e.target.value})} rows={2} className="border-orange-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-green-600">👤 Observaciones para el Cliente</Label>
                <Textarea value={form.observacionesCliente} onChange={e => setForm({...form, observacionesCliente: e.target.value})} rows={2} className="border-green-200" placeholder="Visible en el portal del cliente..." />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-orange-600" />Costo Técnico (interno)</Label>
                <Input type="number" step="0.01" value={form.costoTecnico} onChange={e => setForm({...form, costoTecnico: e.target.value})} placeholder="0.00" className="max-w-40" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cambiar Estado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={estadoForm.estado} onValueChange={v => setEstadoForm({...estadoForm, estado: v ?? estadoForm.estado})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_ORDEN.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea value={estadoForm.nota} onChange={e => setEstadoForm({...estadoForm, nota: e.target.value})} placeholder="Nota del cambio..." rows={2} />
              <Button size="sm" onClick={handleCambioEstado} className="w-full">Cambiar Estado</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Asignación</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Técnico</Label>
                <Select value={form.tecnicoId} onValueChange={v => setForm({...form, tecnicoId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar">
                      {tecnicos.find(t => t.id === form.tecnicoId)?.nombre ?? "Sin asignar"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha Estimada</Label>
                <Input type="date" value={form.fechaEstimada} onChange={e => setForm({...form, fechaEstimada: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          {orden.presupuesto && (
            <Card>
              <CardHeader><CardTitle className="text-base">Presupuesto</CardTitle></CardHeader>
              <CardContent>
                {isAdmin ? (
                  <Link href={`/presupuestos/${orden.presupuesto.id}`} className="flex items-center justify-between hover:underline">
                    <span className="text-sm font-mono">{orden.presupuesto.numero}</span>
                    <Badge className="text-xs">{orden.presupuesto.estado}</Badge>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{orden.presupuesto.numero}</span>
                    <Badge className="text-xs">{orden.presupuesto.estado}</Badge>
                  </div>
                )}
                {isAdmin && <p className="text-lg font-bold mt-1">{formatCurrency(orden.presupuesto.total)}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Repuestos Utilizados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Lista de repuestos ya cargados */}
              <div className="space-y-1">
                {repuestosUsados.length === 0
                  ? <p className="text-xs text-gray-400 italic">Sin repuestos cargados</p>
                  : repuestosUsados.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.repuesto.descripcion}</p>
                        {item.repuesto.numeroParte && <p className="text-xs text-gray-400">{item.repuesto.numeroParte}</p>}
                      </div>
                      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                        <span className="text-gray-600 font-mono text-xs">x{item.cantidad}</span>
                        {item.descontado
                          ? <span className="text-xs text-green-600 font-medium">✓ descontado</span>
                          : <button type="button" onClick={() => quitarRepuesto(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-3 w-3" /></button>
                        }
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Buscador — siempre visible */}
              <div className="space-y-1">
                <Input
                  placeholder="Buscar repuesto por descripción o nro de parte..."
                  value={repuestoSearch}
                  onChange={e => buscarRepuesto(e.target.value)}
                  autoComplete="off"
                />
                {repuestoResults.length > 0 && (
                  <div className="border rounded divide-y max-h-48 overflow-y-auto bg-white shadow-sm">
                    {repuestoResults.map(r => (
                      <div key={r.id} className="px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{r.descripcion}</span>
                            {r.numeroParte && <span className="text-gray-400 ml-2 text-xs">{r.numeroParte}</span>}
                          </div>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">Stock: {r.stockActual}</span>
                        </div>
                        {addingRepuesto?.id === r.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number" min={1} max={r.stockActual}
                              value={cantidadAdd}
                              onChange={e => setCantidadAdd(Math.max(1, Number(e.target.value)))}
                              className="w-20 h-7 text-center"
                            />
                            <button
                              type="button"
                              onClick={agregarRepuesto}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingRepuesto(null); setCantidadAdd(1); }}
                              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setAddingRepuesto(r); setCantidadAdd(1); }}
                            className="mt-1 text-xs text-blue-600 hover:underline"
                          >
                            + Seleccionar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orden.historial.map((h) => {
                  const est = getEstadoOrden(h.estado);
                  return (
                    <div key={h.id} className="border-l-2 border-gray-200 pl-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                      {h.nota && <p className="text-xs text-gray-600 mt-0.5">{h.nota}</p>}
                      <p className="text-xs text-gray-400">{formatDate(h.createdAt)} · {h.user?.nombre ?? "Sistema"}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
