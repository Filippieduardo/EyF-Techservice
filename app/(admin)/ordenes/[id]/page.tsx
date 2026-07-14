"use client";
import { useEffect, useRef, useState } from "react";
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
import { ArrowLeft, Save, FileText, Clock, DollarSign, Plus, Trash2, Package, MapPin, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  ESTADOS_ORDEN, TIPOS_EQUIPO, getEstadoOrden, getTipoEquipo,
  formatDate, formatCurrency, getEstadoPresupuesto,
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
  notaEstado: string | null;
  observacionesCliente: string | null;
  costoTecnico: number | null;
  presupuestoAbonado: number;
  presupuestoId: string | null;
  fechaIngreso: string;
  fechaEnvio: string | null;
  fechaEstimada: string | null;
  fechaCierre: string | null;
  ubicacionActual: string;
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
  const [estadoForm, setEstadoForm] = useState({ estado: "", nota: "", fechaEntrega: "" });
  const fechaEntregaRef = useRef<HTMLInputElement>(null);
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
      presupuestoAbonado: data.presupuestoAbonado ?? 0,
      notaEstado: data.notaEstado ?? "",
      tecnicoId: data.tecnico?.id ?? "",
      fechaEstimada: data.fechaEstimada ? data.fechaEstimada.split("T")[0] : "",
      fechaEnvio: data.fechaEnvio ? data.fechaEnvio.split("T")[0] : "",
      ubicacionActual: data.ubicacionActual ?? "LOCAL",
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
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then((us: any[]) => setTecnicos(us.filter(u => u.role === "TECNICO" && u.activo)));
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
    // Si el estado cambió a ENTREGADO y no tiene fecha, bloquear
    const estadoCambia = estadoForm.estado && estadoForm.estado !== orden?.estado;
    if (estadoCambia && estadoForm.estado === "ENTREGADO" && !estadoForm.fechaEntrega) {
      toast.error("Ingresar fecha de entrega");
      fechaEntregaRef.current?.focus();
      return;
    }
    setSaving(true);
    const body: any = {
      ...form,
      marcaId: form.marcaId === "none" ? null : form.marcaId || null,
      tecnicoId: form.tecnicoId === "none" ? null : form.tecnicoId || null,
      costoTecnico: form.costoTecnico !== "" ? Number(form.costoTecnico) : null,
      presupuestoAbonado: Number(form.presupuestoAbonado) || 0,
      fechaEstimada: form.fechaEstimada || null,
      fechaEnvio: form.fechaEnvio || null,
    };
    // Incluir cambio de estado si fue modificado en el selector
    if (estadoCambia) {
      body.estado = estadoForm.estado;
      if (estadoForm.estado === "ENTREGADO" && estadoForm.fechaEntrega) {
        body.fechaCierre = estadoForm.fechaEntrega;
      }
    }
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
    if (tecnicoBlocked) {
      toast.error("Necesitás un presupuesto generado para cambiar el estado");
      return;
    }
    if (estadoForm.estado === "ENTREGADO" && !estadoForm.fechaEntrega) {
      toast.error("Ingresar fecha de entrega");
      fechaEntregaRef.current?.focus();
      return;
    }
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: estadoForm.estado,
        notaEstado: form.notaEstado,
        ...(estadoForm.estado === "ENTREGADO" && estadoForm.fechaEntrega
          ? { fechaCierre: estadoForm.fechaEntrega }
          : {}),
      }),
    });
    if (res.ok) {
      toast.success("Estado actualizado");
      await fetchOrden();
      setForm((f: any) => ({ ...f, notaEstado: "" }));
      fetchRepuestosUsados();
    } else {
      toast.error("Error al cambiar estado");
    }
  }

  if (!orden) return <div className="p-6 text-gray-400">Cargando...</div>;

  const estadoActual = getEstadoOrden(orden.estado);
  const presupuestada = !!orden.presupuesto;
  const presupuestoAceptado = orden.presupuesto?.estado === "APROBADO";
  // TECNICO bloqueado en secciones Estado/Asignación/Repuestos si NO hay presupuesto generado
  const tecnicoBlocked = !isAdmin && !orden.presupuesto && !orden.presupuestoId;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{orden.numero}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoActual.color}`}>
              {estadoActual.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{orden.cliente.nombre} · Ingreso: {formatDate(orden.fechaIngreso)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {!orden.presupuesto && isAdmin && (
              <Link href={`/presupuestos/nuevo?ordenId=${id}&clienteId=${orden.cliente.id}`}>
                <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />Presupuesto</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => window.open(`/api/ordenes/${id}/print`, "_blank")}>
              <Printer className="h-4 w-4 mr-1" />Imprimir
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
          <Button size="sm" className="self-end" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
      </div>

      {/* Indicadores de estado */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm">
          <span className="text-gray-500">Fecha ingreso:</span>
          <span className="font-medium">{formatDate(orden.fechaIngreso)}</span>
        </div>
        <div className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm">
          <span className="text-gray-500">Fecha traslado:</span>
          <span className="font-medium">{orden.fechaEnvio ? formatDate(orden.fechaEnvio) : "—"}</span>
        </div>
        <div className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-500">Ubicación:</span>
          <span className={`font-medium ${form.ubicacionActual === "TALLER" ? "text-orange-600" : "text-green-600"}`}>
            {form.ubicacionActual === "TALLER" ? "Taller" : "Local"}
          </span>
        </div>
        {presupuestada && (
          <div className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm">
            <span className="text-gray-500">Presupuesto:</span>
            <span className={`font-medium px-2 py-0.5 rounded text-xs ${getEstadoPresupuesto(orden.presupuesto!.estado).color}`}>
              {getEstadoPresupuesto(orden.presupuesto!.estado).label}
            </span>
          </div>
        )}
      </div>

      {tecnicoBlocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded px-4 py-2">
          ⚠️ Sin presupuesto generado — no podés cambiar estado, fechas ni repuestos. Podés editar los datos del equipo y diagnóstico.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del Equipo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Tipo de Equipo</Label>
                <Select value={form.tipoEquipo} onValueChange={v => setForm({ ...form, tipoEquipo: v })}>

                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_EQUIPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <MarcaSelect value={form.marcaId} onValueChange={v => setForm({ ...form, marcaId: v })} hideAdd={!isAdmin} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1">
                  <Label>Número de Serie</Label>
                  <Input value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value.toUpperCase() })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Descripción y Trabajo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Problema Reportado</Label>
                <Textarea value={form.descripcionProblema} onChange={e => setForm({ ...form, descripcionProblema: e.target.value.toUpperCase() })} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Diagnóstico</Label>
                <Textarea value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value.toUpperCase() })} rows={2} placeholder="Diagnóstico técnico..." />
              </div>
              <div className="space-y-1">
                <Label>Trabajo Realizado</Label>
                <Textarea value={form.trabajoRealizado} onChange={e => setForm({ ...form, trabajoRealizado: e.target.value.toUpperCase() })} rows={2} placeholder="Detalle del trabajo..." />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-orange-600">🔒 Notas Internas (solo técnicos)</Label>
                <Textarea value={form.notasInternas} onChange={e => setForm({ ...form, notasInternas: e.target.value.toUpperCase() })} rows={2} className="border-orange-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-green-600">👤 Observaciones para el Cliente</Label>
                <Textarea value={form.observacionesCliente} onChange={e => setForm({ ...form, observacionesCliente: e.target.value.toUpperCase() })} rows={2} className="border-green-200" placeholder="Visible en el portal del cliente..." />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-orange-700 font-semibold text-sm"><DollarSign className="h-4 w-4 text-orange-600" />Costo Técnico (interno)</Label>
                {isAdmin ? (
                  <Input
                    className="max-w-48 text-lg font-bold border-orange-300 focus:border-orange-500"
                    placeholder="$ 0,00"
                    value={form.costoTecnico === "" ? "" : form._costoEditing ? form.costoTecnico : formatCurrency(form.costoTecnico || 0)}
                    onFocus={() => setForm((f: any) => ({ ...f, _costoEditing: true }))}
                    onBlur={() => setForm((f: any) => ({ ...f, _costoEditing: false }))}
                    onChange={e => setForm((f: any) => ({ ...f, costoTecnico: e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".") }))}
                  />
                ) : (
                  <p className="text-xl font-bold text-orange-700 border border-orange-200 rounded px-3 py-2 bg-orange-50 max-w-48">
                    {form.costoTecnico ? formatCurrency(form.costoTecnico) : <span className="text-gray-400 text-base font-normal">Sin costo</span>}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-blue-700 font-semibold text-sm"><DollarSign className="h-4 w-4 text-blue-600" />Presupuesto Abonado</Label>
                  <Input
                    className="max-w-48 text-lg font-bold border-blue-300 focus:border-blue-500"
                    placeholder="$ 0,00"
                    value={form._abonadoEditing ? form.presupuestoAbonado : formatCurrency(form.presupuestoAbonado || 0)}
                    onFocus={() => setForm((f: any) => ({ ...f, _abonadoEditing: true }))}
                    onBlur={() => setForm((f: any) => ({ ...f, _abonadoEditing: false }))}
                    onChange={e => setForm((f: any) => ({ ...f, presupuestoAbonado: e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".") }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cambiar Estado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={estadoForm.estado}
                onValueChange={v => {
                  const nuevo = v ?? estadoForm.estado;
                  setEstadoForm(f => ({ ...f, estado: nuevo }));
                  if (nuevo === "ENTREGADO") {
                    setTimeout(() => fechaEntregaRef.current?.focus(), 50);
                  }
                }}
                disabled={tecnicoBlocked}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_ORDEN.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {estadoForm.estado === "ENTREGADO" && (
                <div className="space-y-1">
                  <Label className="text-sky-700 font-semibold flex items-center gap-1">
                    <span className="text-base">📅</span> Ingresar fecha de entrega
                  </Label>
                  <Input
                    ref={fechaEntregaRef}
                    type="date"
                    value={estadoForm.fechaEntrega}
                    onChange={e => setEstadoForm(f => ({ ...f, fechaEntrega: e.target.value }))}
                    className="border-sky-400 ring-2 ring-sky-200 focus:ring-sky-400"
                    disabled={tecnicoBlocked}
                  />
                </div>
              )}
              <Textarea value={form.notaEstado ?? ""} onChange={e => setForm({ ...form, notaEstado: e.target.value.toUpperCase() })} placeholder="Nota del cambio..." rows={2} disabled={tecnicoBlocked} />
              <Button size="sm" onClick={handleCambioEstado} className="w-full" disabled={tecnicoBlocked}>Cambiar Estado</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Asignación y Fechas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && (
                <div className="space-y-1">
                  <Label>Técnico</Label>
                  <Select value={form.tecnicoId} onValueChange={v => setForm({ ...form, tecnicoId: v })}>
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
              )}
              <div className="space-y-1">
                <Label>Fecha Estimada</Label>
                <Input type="date" value={form.fechaEstimada} onChange={e => setForm({ ...form, fechaEstimada: e.target.value })} disabled={tecnicoBlocked} />
              </div>
              <div className="space-y-1">
                <Label>Fecha Traslado</Label>
                <Input type="date" value={form.fechaEnvio} onChange={e => setForm({ ...form, fechaEnvio: e.target.value })} disabled={tecnicoBlocked} />
              </div>
              <div className="space-y-1">
                <Label>Ubicación Actual</Label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, ubicacionActual: form.ubicacionActual === "LOCAL" ? "TALLER" : "LOCAL" })}
                  disabled={tecnicoBlocked}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded border font-medium text-sm transition-colors ${
                    form.ubicacionActual === "TALLER"
                      ? "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                      : "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                  } disabled:opacity-50`}
                >
                  <MapPin className="h-4 w-4" />
                  {form.ubicacionActual === "TALLER" ? "Taller" : "Local"}
                </button>
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
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${getEstadoPresupuesto(orden.presupuesto.estado).color}`}>{getEstadoPresupuesto(orden.presupuesto.estado).label}</span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{orden.presupuesto.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${getEstadoPresupuesto(orden.presupuesto.estado).color}`}>{getEstadoPresupuesto(orden.presupuesto.estado).label}</span>
                  </div>
                )}
                {isAdmin && <p className="text-lg font-bold mt-1">{formatCurrency(orden.presupuesto.total)}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Repuestos Utilizados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
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
                          : <button type="button" onClick={() => quitarRepuesto(item.id)} className="text-red-400 hover:text-red-600 p-1" disabled={tecnicoBlocked}><Trash2 className="h-3 w-3" /></button>
                        }
                      </div>
                    </div>
                  ))
                }
              </div>

              {!tecnicoBlocked && (
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orden.historial.map((h) => {
                  const est = getEstadoOrden(h.estado);
                  return (
                    <div key={h.id} className="border-l-2 border-gray-200 pl-3 flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                        {h.nota && <p className="text-xs text-gray-600 mt-0.5">{h.nota}</p>}
                        <p className="text-xs text-gray-400">{formatDate(h.createdAt)} · {h.user?.nombre ?? "Sistema"}</p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          title="Eliminar estado"
                          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                          onClick={async () => {
                            if (!confirm("¿Eliminar este estado del historial?")) return;
                            await fetch(`/api/historial/${h.id}`, { method: "DELETE" });
                            await fetchOrden();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
