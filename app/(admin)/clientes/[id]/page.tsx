"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit2, Save, X, Plus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getEstadoOrden, getTipoEquipo, formatDate } from "@/lib/constants";

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  dniCuit: string | null;
  direccion: string | null;
  activo: boolean;
  ordenes: Array<{
    id: string;
    numero: string;
    estado: string;
    tipoEquipo: string;
    modelo: string | null;
    fechaIngreso: string;
    marca: { nombre: string } | null;
  }>;
  presupuestos: Array<{
    id: string;
    numero: string;
    estado: string;
    total: number;
    fecha: string;
  }>;
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);

  async function fetch() {
    const res = await window.fetch(`/api/clientes/${id}`);
    const data = await res.json();
    setCliente(data);
    setForm({
      nombre: data.nombre,
      email: data.email ?? "",
      telefono: data.telefono ?? "",
      dniCuit: data.dniCuit ?? "",
      direccion: data.direccion ?? "",
    });
  }

  useEffect(() => { fetch(); }, [id]);

  async function handleSave() {
    const res = await window.fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Cliente actualizado");
      setEditing(false);
      fetch();
    } else {
      toast.error("Error al actualizar");
    }
  }

  if (!cliente) return <div className="p-6 text-gray-400">Cargando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
          {!cliente.activo && <Badge variant="destructive">Inactivo</Badge>}
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Guardar</Button>
            <Button variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1"><Label>Nombre / Razón Social</Label>
                  <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
                <div className="space-y-1"><Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="space-y-1"><Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
                <div className="space-y-1"><Label>DNI / CUIT</Label>
                  <Input value={form.dniCuit} onChange={e => setForm({...form, dniCuit: e.target.value})} /></div>
                <div className="space-y-1"><Label>Dirección</Label>
                  <Input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} /></div>
                <div className="space-y-1">
                  <Label>Nueva contraseña portal</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.portalPassword ?? ""}
                      onChange={e => setForm({ ...form, portalPassword: e.target.value })}
                      placeholder="Dejar vacío para no cambiar"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      onClick={() => setShowPassword(s => !s)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-gray-500 w-24">Nombre:</dt><dd className="font-medium">{cliente.nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-24">Email:</dt><dd>{cliente.email ?? "-"}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-24">Teléfono:</dt><dd>{cliente.telefono ?? "-"}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-24">DNI/CUIT:</dt><dd>{cliente.dniCuit ?? "-"}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-24">Dirección:</dt><dd>{cliente.direccion ?? "-"}</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Órdenes de Trabajo</CardTitle>
              <Link href={`/ordenes/nueva?clienteId=${id}`}>
                <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Nueva</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {cliente.ordenes.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin órdenes</p>
            ) : (
              <div className="space-y-2">
                {cliente.ordenes.map((o) => {
                  const estado = getEstadoOrden(o.estado);
                  return (
                    <Link key={o.id} href={`/ordenes/${o.id}`} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">{o.numero}</p>
                        <p className="text-xs text-gray-400">{getTipoEquipo(o.tipoEquipo)} {o.marca?.nombre} {o.modelo}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${estado.color}`}>{estado.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(o.fechaIngreso)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
