"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, getTipoEquipo } from "@/lib/constants";

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  condicionIva?: string;
  dniCuit?: string | null;
}

function formatCuit(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/[-\s]/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : raw;
}

interface Item { descripcion: string; cantidad: number; precioUnitario: number; _editingPrecio?: boolean; }

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClienteId = searchParams.get("clienteId") ?? "";
  const preOrdenId = searchParams.get("ordenId") ?? "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [clienteId, setClienteId] = useState(preClienteId);
  const [ordenId] = useState(preOrdenId);
  const [ordenNumero, setOrdenNumero] = useState<string>("");
  const [ordenEquipo, setOrdenEquipo] = useState<{ tipoEquipo?: string; marca?: string; modelo?: string; numeroSerie?: string; descripcionProblema?: string } | null>(null);
  const [validezDias, setValidezDias] = useState(5);
  const [descuento, setDescuento] = useState(0);
  const [descuentoEditing, setDescuentoEditing] = useState(false);
  const [notas, setNotas] = useState("");
  const [observacionesCliente, setObservacionesCliente] = useState("");
  const obsClienteOriginalRef = useRef("");
  const [items, setItems] = useState<Item[]>([
    { descripcion: "", cantidad: 1, precioUnitario: 0 },
  ]);

  function handleClienteChange(id: string) {
    setClienteId(id);
    fetch(`/api/clientes/${id}`).then(r => r.ok ? r.json() : null).then((c: any) => {
      if (c) setSelectedCliente(c);
    });
  }

  useEffect(() => {
    fetch("/api/clientes").then(r => r.ok ? r.json() : []).then((cs: Cliente[]) => setClientes(cs));
    if (preClienteId) {
      fetch(`/api/clientes/${preClienteId}`).then(r => r.ok ? r.json() : null).then((c: any) => {
        if (c) setSelectedCliente(c);
      });
    }
    if (preOrdenId) {
      fetch(`/api/ordenes/${preOrdenId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setOrdenNumero(data.numero ?? preOrdenId);
            const abonado = Number(data.presupuestoAbonado ?? 0);
            if (abonado > 0) setDescuento(abonado);
            const obs = data.observacionesCliente ?? "";
            setObservacionesCliente(obs);
            obsClienteOriginalRef.current = obs;
            setOrdenEquipo({
              tipoEquipo: data.tipoEquipo ?? undefined,
              marca: data.marca?.nombre ?? undefined,
              modelo: data.modelo ?? undefined,
              numeroSerie: data.numeroSerie ?? undefined,
              descripcionProblema: data.descripcionProblema ?? undefined,
            });
          }
        });
    }
  }, []);

  function setItem(idx: number, field: keyof Item, value: string | number | boolean) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const total = subtotal - descuento;
  const clienteSeleccionado = clientes.find(c => c.id === clienteId);
  const iva = clienteSeleccionado?.condicionIva === "INSCRIPTO" ? total * 0.21 : 0;
  const totalGeneral = total + iva;

  const tieneItems = items.some(i => i.descripcion.trim());
  const obsModificada = observacionesCliente !== obsClienteOriginalRef.current;
  const canSave = !loading && tieneItems;

  async function handleGuardar() {
    if (!clienteId) { toast.error("Seleccionar cliente"); return; }
    if (!tieneItems) { toast.error("Agregar al menos un ítem"); return; }
    const itemsInvalidos = items.filter(i => i.descripcion.trim() && i.precioUnitario <= 0);
    if (itemsInvalidos.length > 0) { toast.error("Todos los ítems deben tener precio"); return; }
    setLoading(true);
    const itemsAGuardar = items.filter(i => i.descripcion.trim());
    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        ordenId: ordenId || undefined,
        validezDias,
        descuento,
        notas,
        observacionesCliente: observacionesCliente || undefined,
        items: itemsAGuardar,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const p = await res.json();
      toast.success(`Presupuesto ${p.numero} creado`);
      router.push(`/presupuestos/${p.id}`);
    } else {
      toast.error("Error al crear presupuesto");
    }
  }

  // Bloquear Enter en inputs para que no dispare submit
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      (e.target as HTMLElement).blur?.();
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Nuevo Presupuesto</h1>
        <div className="flex flex-col gap-2 items-end">
          <Button
            size="sm"
            disabled={!canSave}
            onClick={handleGuardar}
            title={!tieneItems ? "Agregue al menos un ítem para guardar" : ""}
          >
            Guardar
          </Button>
          <Button size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />Volver
          </Button>
        </div>
      </div>

      <form onKeyDown={handleFormKeyDown} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos Generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={v => handleClienteChange(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente">
                    {clientes.find(c => c.id === clienteId)?.nombre ?? "Seleccionar cliente"}
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
                  <dt className="text-gray-500 w-28 flex-shrink-0">Teléfono:</dt>
                  <dd>{selectedCliente.telefono ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">WhatsApp:</dt>
                  <dd>{selectedCliente.whatsapp ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Email:</dt>
                  <dd>{selectedCliente.email ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Cond. IVA:</dt>
                  <dd>{selectedCliente.condicionIva ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">DNI/CUIT:</dt>
                  <dd>{formatCuit(selectedCliente.dniCuit)}</dd>
                </div>
              </dl>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Validez (días)</Label>
                <Input
                  type="number" min={1} value={validezDias}
                  onChange={e => setValidezDias(Number(e.target.value))}
                />
              </div>
              {ordenId && (
                <div className="space-y-1">
                  <Label>Orden vinculada</Label>
                  <p className="font-mono font-bold text-base px-3 py-2 border rounded bg-muted">{ordenNumero || ordenId}</p>
                </div>
              )}
            </div>
            {ordenId && ordenEquipo && (
              <dl className="text-sm space-y-1 bg-amber-50 rounded p-3 border border-amber-200">
                <p className="font-medium text-xs text-amber-700 mb-2">Equipo de la orden:</p>
                {ordenEquipo.tipoEquipo && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-28 flex-shrink-0">Tipo:</dt>
                    <dd className="font-medium">{getTipoEquipo(ordenEquipo.tipoEquipo).label}</dd>
                  </div>
                )}
                {(ordenEquipo.marca || ordenEquipo.modelo) && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-28 flex-shrink-0">Equipo:</dt>
                    <dd className="font-semibold">{[ordenEquipo.marca, ordenEquipo.modelo].filter(Boolean).join(" — ")}</dd>
                  </div>
                )}
                {ordenEquipo.numeroSerie && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-28 flex-shrink-0">N/S:</dt>
                    <dd>{ordenEquipo.numeroSerie}</dd>
                  </div>
                )}
                {ordenEquipo.descripcionProblema && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-28 flex-shrink-0 mt-0.5">Problema:</dt>
                    <dd className="italic">{ordenEquipo.descripcionProblema}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="space-y-1">
              <Label className="text-green-700">
                Observaciones para el Cliente
                <span className="text-xs font-normal text-gray-400 ml-1">(visible en portal)</span>
              </Label>
              <Textarea
                value={observacionesCliente}
                onChange={e => setObservacionesCliente(e.target.value.toUpperCase())}
                rows={3}
                placeholder="Texto visible para el cliente en el portal..."
                className="border-green-300 focus:border-green-500"
              />
            </div>
            <div className="space-y-1">
              <Label>Notas internas</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value.toUpperCase())} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ítems</CardTitle>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setItems(prev => [...prev, { descripcion: "", cantidad: 1, precioUnitario: 0 }])}
              >
                <Plus className="h-3 w-3 mr-1" />Agregar ítem
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hidden sm:grid gap-2 text-xs font-medium text-gray-500 px-1" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
              <div>Descripción</div>
              <div className="w-16 text-center">Cant.</div>
              <div className="w-32 text-right">Importe Unit.</div>
              <div className="w-8"></div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center border sm:border-0 rounded p-2 sm:p-0">
                <div className="flex-1 w-full">
                  <Input
                    value={item.descripcion}
                    onChange={e => setItem(idx, "descripcion", e.target.value.toUpperCase())}
                    placeholder="Descripción..."
                    className={!item.descripcion.trim() ? "border-red-300" : ""}
                  />
                </div>
                <div className="w-16">
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={e => setItem(idx, "cantidad", Number(e.target.value))}
                    className="text-center"
                  />
                </div>
                <div className="w-32">
                  <Input
                    className="text-right"
                    placeholder="$ 0,00"
                    value={item._editingPrecio ? item.precioUnitario : formatCurrency(item.precioUnitario)}
                    onFocus={() => setItem(idx, "_editingPrecio", true)}
                    onBlur={() => setItem(idx, "_editingPrecio", false)}
                    onChange={e => setItem(idx, "precioUnitario", Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0)}
                  />
                </div>
                <div className="w-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Descuento:</span>
              <Input
                className="w-36 text-right h-7"
                value={descuentoEditing ? descuento : formatCurrency(descuento)}
                onFocus={() => setDescuentoEditing(true)}
                onBlur={() => setDescuentoEditing(false)}
                onChange={e => setDescuento(Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0)}
              />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA 21%:</span>
              <span>{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total General:</span>
              <span>{formatCurrency(totalGeneral)}</span>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
