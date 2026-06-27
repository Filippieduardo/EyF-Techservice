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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TIPOS_EQUIPO } from "@/lib/constants";

interface Cliente { id: string; nombre: string; }
interface Tecnico { id: string; nombre: string; }

export default function NuevaOrdenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClienteId = searchParams.get("clienteId") ?? "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clienteId: preClienteId,
    tipoEquipo: "",
    marcaId: "",
    modelo: "",
    numeroSerie: "",
    descripcionProblema: "",
    tecnicoId: "",
    fechaEstimada: "",
  });

  useEffect(() => {
    fetch("/api/clientes").then(r => r.ok ? r.json() : []).then(setClientes);
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then(setTecnicos);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      ...form,
      marcaId: form.marcaId === "none" ? undefined : form.marcaId || undefined,
      tecnicoId: form.tecnicoId || undefined,
      fechaEstimada: form.fechaEstimada || undefined,
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
      toast.error("Error al crear la orden");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-2xl font-bold">Nueva Orden de Trabajo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select value={form.clienteId} onValueChange={v => setForm({...form, clienteId: v ?? ""})}>
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
                <Input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} placeholder="ej: LaserJet P1102" />
              </div>
              <div className="space-y-1">
                <Label>Número de Serie</Label>
                <Input value={form.numeroSerie} onChange={e => setForm({...form, numeroSerie: e.target.value})} />
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
                onChange={e => setForm({...form, descripcionProblema: e.target.value})}
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
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando..." : "Crear Orden de Trabajo"}
        </Button>
      </form>
    </div>
  );
}

