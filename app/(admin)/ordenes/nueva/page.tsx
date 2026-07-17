"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarcaSelect } from "@/components/marca-select";
import { ArrowLeft, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { TIPOS_EQUIPO } from "@/lib/constants";

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  condicionIva: string;
  dniCuit: string | null;
}
interface Tecnico { id: string; nombre: string; }

function formatCuit(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[-\s]/g, "");
  if (digits.length === 11) return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits[10]}`;
  return raw;
}

export default function NuevaOrdenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClienteId = searchParams.get("clienteId") ?? "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const [abonadoEditing, setAbonadoEditing] = useState(false);

  function formatPesos(n: number): string {
    if (!n) return "";
    return "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const [form, setForm] = useState({
    clienteId: preClienteId,
    tipoEquipo: "",
    marcaId: "",
    modelo: "",
    numeroSerie: "",
    descripcionProblema: "",
    tecnicoId: "",
    fechaEstimada: "",
    presupuestoAbonado: 0,
  });

  useEffect(() => {
    fetch("/api/clientes").then(r => r.ok ? r.json() : []).then((cs: any[]) => {
      setClientes(cs);
    });
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then((us: any[]) => setTecnicos(us.filter(u => u.role === "TECNICO" && u.activo)));
    // Si viene con clienteId preseleccionado, cargar sus datos directamente
    if (preClienteId) {
      fetch(`/api/clientes/${preClienteId}`).then(r => r.ok ? r.json() : null).then((c: any) => {
        if (c) setSelectedCliente(c);
      });
    }
  }, []);

  function handleClienteChange(clienteId: string | null) {
    if (!clienteId) return;
    setForm(f => ({ ...f, clienteId }));
    // Usar datos del listado primero; luego enriquecer con detalle completo
    const fromList = clientes.find(c => c.id === clienteId) ?? null;
    setSelectedCliente(fromList);
    fetch(`/api/clientes/${clienteId}`).then(r => r.ok ? r.json() : null).then((c: any) => {
      if (c) setSelectedCliente(c);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId) { toast.error("Seleccionar un cliente"); return; }
    if (!form.tipoEquipo) { toast.error("Seleccionar tipo de equipo"); return; }
    setLoading(true);
    const body = {
      ...form,
      marcaId: form.marcaId === "none" ? undefined : form.marcaId || undefined,
      tecnicoId: form.tecnicoId === "none" ? undefined : form.tecnicoId || undefined,
      fechaEstimada: form.fechaEstimada || undefined,
      presupuestoAbonado: Number(form.presupuestoAbonado) || 0,
    };
    const res = await fetch("/api/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      const orden = await res.json();
      toast.success(`Orden ${orden.numero} creada`);
      router.push(`/ordenes/${orden.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Error al crear la orden");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Nueva Orden de Trabajo</h1>
        <Button size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select value={form.clienteId} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente">
                    {clientes.find(c => c.id === form.clienteId)?.nombre ?? "Seleccionar cliente"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedCliente && (
              <dl className="text-sm space-y-1 bg-blue-50 rounded p-3 border border-blue-200">
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0 font-medium">Nombre:</dt>
                  <dd className="font-semibold">{selectedCliente.nombre}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Email:</dt>
                  <dd>{selectedCliente.email ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Teléfono:</dt>
                  <dd>{selectedCliente.telefono ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">WhatsApp:</dt>
                  <dd>{selectedCliente.whatsapp ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Cond. IVA:</dt>
                  <dd>{selectedCliente.condicionIva}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">DNI/CUIT:</dt>
                  <dd>{formatCuit(selectedCliente.dniCuit)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Equipo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo de Equipo *</Label>
              <Select value={form.tipoEquipo} onValueChange={v => setForm({...form, tipoEquipo: v ?? ""})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EQUIPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <MarcaSelect value={form.marcaId} onValueChange={v => setForm({...form, marcaId: v ?? ""})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value.toUpperCase()})} placeholder="ej: LaserJet P1102" />
              </div>
              <div className="space-y-1">
                <Label>Número de Serie</Label>
                <Input value={form.numeroSerie} onChange={e => setForm({...form, numeroSerie: e.target.value.toUpperCase()})} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Descripción del Problema *</Label>
              <Textarea
                value={form.descripcionProblema}
                onChange={e => setForm({...form, descripcionProblema: e.target.value.toUpperCase()})}
                placeholder="Describir el problema reportado por el cliente..."
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Técnico Asignado</Label>
                <Select value={form.tecnicoId} onValueChange={v => setForm({...form, tecnicoId: v ?? ""})}>
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
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-blue-700 font-semibold text-sm">
                <DollarSign className="h-4 w-4 text-blue-600" />Presupuesto Abonado
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={abonadoEditing ? (form.presupuestoAbonado === 0 ? "" : String(form.presupuestoAbonado)) : formatPesos(form.presupuestoAbonado)}
                onFocus={() => setAbonadoEditing(true)}
                onBlur={() => setAbonadoEditing(false)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                  setForm({...form, presupuestoAbonado: Number(raw) || 0});
                }}
                placeholder="$ 0,00"
                className="max-w-48 border-blue-300"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando..." : "Crear Orden de Trabajo"}
        </Button>
      </form>
    </div>
  );
}
