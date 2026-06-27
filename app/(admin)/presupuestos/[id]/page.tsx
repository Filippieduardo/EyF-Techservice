"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ESTADOS_PRESUPUESTO, getEstadoPresupuesto, formatDate, formatCurrency } from "@/lib/constants";

interface Presupuesto {
  id: string;
  numero: string;
  estado: string;
  fecha: string;
  validezDias: number;
  subtotal: number;
  descuento: number;
  total: number;
  notas: string | null;
  cliente: { nombre: string; email: string | null; telefono: string | null; direccion: string | null };
  orden: { id: string; numero: string; modelo: string | null; marca: { nombre: string } | null } | null;
  items: Array<{ id: string; descripcion: string; cantidad: number; precioUnitario: number; precioTotal: number }>;
}

export default function PresupuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pres, setPres] = useState<Presupuesto | null>(null);
  const [estado, setEstado] = useState("");

  async function fetchPres() {
    const res = await fetch(`/api/presupuestos/${id}`);
    const data = await res.json();
    setPres(data);
    setEstado(data.estado);
  }

  useEffect(() => { fetchPres(); }, [id]);

  async function handleEstado(nuevoEstado: string | null) {
    if (!nuevoEstado) return;
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      toast.success("Estado actualizado");
      setEstado(nuevoEstado);
      fetchPres();
    } else {
      toast.error("Error al actualizar");
    }
  }

  if (!pres) return <div className="p-6 text-gray-400">Cargando...</div>;

  const estadoInfo = getEstadoPresupuesto(pres.estado);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{pres.numero}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoInfo.color}`}>{estadoInfo.label}</span>
          </div>
          <p className="text-gray-500 text-sm">
            {pres.cliente.nombre} · {formatDate(pres.fecha)} · Válido {pres.validezDias} días
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ítems</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 border-b pb-2 mb-2">
                  <div className="col-span-6">Descripción</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-2 text-right">Precio Unit.</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {pres.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0 text-sm">
                    <div className="col-span-6">{item.descripcion}</div>
                    <div className="col-span-2 text-center">{item.cantidad}</div>
                    <div className="col-span-2 text-right">{formatCurrency(item.precioUnitario)}</div>
                    <div className="col-span-2 text-right font-medium">{formatCurrency(item.precioTotal)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span><span>{formatCurrency(pres.subtotal)}</span>
                </div>
                {Number(pres.descuento) > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Descuento:</span><span>- {formatCurrency(pres.descuento)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span><span>{formatCurrency(pres.total)}</span>
                </div>
              </div>
              {pres.notas && (
                <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                  <p className="font-medium text-xs text-gray-400 mb-1">Notas:</p>
                  {pres.notas}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Estado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={estado} onValueChange={handleEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_PRESUPUESTO.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{pres.cliente.nombre}</p>
              {pres.cliente.email && <p className="text-gray-500">{pres.cliente.email}</p>}
              {pres.cliente.telefono && <p className="text-gray-500">{pres.cliente.telefono}</p>}
              {pres.cliente.direccion && <p className="text-gray-500">{pres.cliente.direccion}</p>}
            </CardContent>
          </Card>

          {pres.orden && (
            <Card>
              <CardHeader><CardTitle className="text-base">Orden Vinculada</CardTitle></CardHeader>
              <CardContent>
                <Link href={`/ordenes/${pres.orden.id}`} className="text-blue-600 hover:underline text-sm font-mono">
                  {pres.orden.numero}
                </Link>
                <p className="text-xs text-gray-400">{pres.orden.marca?.nombre} {pres.orden.modelo}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
