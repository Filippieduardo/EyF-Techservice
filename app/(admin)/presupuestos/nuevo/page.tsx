"use client";
import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/constants";

interface Cliente { id: string; nombre: string; condicionIva?: string; }
interface Item { descripcion: string; cantidad: number; precioUnitario: number; _editingPrecio?: boolean; }

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClienteId = searchParams.get("clienteId") ?? "";
  const preOrdenId = searchParams.get("ordenId") ?? "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [clienteId, setClienteId] = useState(preClienteId);
  const [ordenId] = useState(preOrdenId);
  const [ordenNumero, setOrdenNumero] = useState<string>("");
  const [validezDias, setValidezDias] = useState(30);
  const [descuento, setDescuento] = useState(0);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<Item[]>([
    { descripcion: "", cantidad: 1, precioUnitario: 0 },
  ]);

  useEffect(() => {
    fetch("/api/clientes").then(r => r.ok ? r.json() : []).then(setClientes);
    if (preOrdenId) {
      fetch(`/api/ordenes/${preOrdenId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setOrdenNumero(data.numero ?? preOrdenId);
            const abonado = Number(data.presupuestoAbonado ?? 0);
            if (abonado > 0) setDescuento(abonado);
          }
        });
    }
  }, []);

  function setItem(idx: number, field: keyof Item, value: string | number | boolean) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const subtotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const total = subtotal - descuento;
  const clienteSeleccionado = clientes.find(c => c.id === clienteId);
  const iva = clienteSeleccionado?.condicionIva === "INSCRIPTO" ? total * 0.21 : 0;
  const totalGeneral = total + iva;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) { toast.error("Seleccionar cliente"); return; }
    const itemsConDescripcionVacia = items.filter(i => !i.descripcion.trim());
    if (itemsConDescripcionVacia.length > 0) { toast.error("Todos los ítems deben tener descripción"); return; }
    setLoading(true);
    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, ordenId: ordenId || undefined, validezDias, descuento, notas, items }),
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

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Nuevo Presupuesto</h1>
        <Button size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos Generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={v => setClienteId(v ?? "")}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Validez (días)</Label>
                <Input type="number" min={1} value={validezDias} onChange={e => setValidezDias(Number(e.target.value))} />
              </div>
              {ordenId && (
                <div className="space-y-1">
                  <Label>Orden vinculada</Label>
                  <Input value={ordenNumero || ordenId} disabled className="font-mono font-bold text-foreground contrast-more:text-black" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value.toUpperCase())} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ítems</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { descripcion: "", cantidad: 1, precioUnitario: 0 }])}>
                <Plus className="h-3 w-3 mr-1" />Agregar ítem
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-6">Descripción</div>
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-3 text-right">Importe Unit.</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center border sm:border-0 rounded p-2 sm:p-0">
                <div className="w-full sm:col-span-6">
                  <Input
                    value={item.descripcion}
                    onChange={e => setItem(idx, "descripcion", e.target.value.toUpperCase())}
                    placeholder="Descripción..."
                    className={!item.descripcion.trim() ? "border-red-300" : ""}
                  />
                </div>
                <div className="flex gap-2 w-full sm:contents">
                  <div className="flex-1 sm:col-span-2">
                    <Input type="number" min={1} value={item.cantidad} onChange={e => setItem(idx, "cantidad", Number(e.target.value))} className="text-center" placeholder="Cant." />
                  </div>
                  <div className="flex-1 sm:col-span-3">
                    <Input
                      className="text-right"
                      placeholder="$ 0,00"
                      value={item._editingPrecio ? item.precioUnitario : formatCurrency(item.precioUnitario)}
                      onFocus={() => setItem(idx, "_editingPrecio", true)}
                      onBlur={() => setItem(idx, "_editingPrecio", false)}
                      onChange={e => setItem(idx, "precioUnitario", Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0)}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-center items-center">
                    {items.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
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
              <Input type="number" min={0} step="0.01" value={descuento} onChange={e => setDescuento(Number(e.target.value))} className="w-36 text-right h-7" />
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando..." : "Crear Presupuesto"}
        </Button>
      </form>
    </div>
  );
}
