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
  portalPassword: string | null;
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

function validarCuit(raw: string): boolean {
  const digits = raw.replace(/[-\s]/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * weights[i];
  const remainder = sum % 11;
  let verifier = 11 - remainder;
  if (verifier === 11) verifier = 0;
  if (verifier === 10) return false;
  return parseInt(digits[10]) === verifier;
}

function formatCuit(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[-\s]/g, "");
  if (digits.length === 11) return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits[10]}`;
  return raw;
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [cuitError, setCuitError] = useState("");

  async function fetchCliente() {
    const res = await window.fetch(`/api/clientes/${id}`);
    const data = await res.json();
    setCliente(data);
    setForm({
      nombre: data.nombre,
      email: data.email ?? "",
      telefono: data.telefono ?? "",
      dniCuit: data.dniCuit ?? "",
      direccion: data.direccion ?? "",
      portalPassword: "",
    });
  }

  useEffect(() => { fetchCliente(); }, [id]);

  function handleCuitChange(value: string) {
    setForm({ ...form, dniCuit: value });
    const digits = value.replace(/[-\s]/g, "");
    if (digits.length === 11) {
      setCuitError(validarCuit(value) ? "" : "CUIT inválido (dígito verificador incorrecto)");
    } else {
      setCuitError("");
    }
  }

  async function handleSave() {
    if (form.portalPassword && form.portalPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    const digits = form.dniCuit.replace(/[-\s]/g, "");
    if (digits.length === 11 && !validarCuit(form.dniCuit)) {
      toast.error("El CUIT ingresado no es válido");
      return;
    }
    const body: any = { ...form };
    if (!body.portalPassword) delete body.portalPassword;
    const res = await window.fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Cliente actualizado");
      setEditing(false);
      fetchCliente();
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
          <Button variant="outline" onClick={() => { setShowEditPwd(false); setEditing(true); }}>
            <Edit2 className="h-4 w-4 mr-1" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Guardar</Button>
            <Button variant="outline" onClick={() => { setEditing(false); setCuitError(""); }}><X className="h-4 w-4" /></Button>
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
                  <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>DNI / CUIT <span className="text-gray-400 text-xs">(sin guiones)</span></Label>
                  <Input
                    value={form.dniCuit}
                    onChange={e => handleCuitChange(e.target.value)}
                    placeholder="20123456789"
                    className={cuitError ? "border-red-400" : ""}
                  />
                  {cuitError && <p className="text-xs text-red-500">{cuitError}</p>}
                </div>
                <div className="space-y-1"><Label>Dirección</Label>
                  <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Contraseña portal <span className="text-gray-400 text-xs">(vacío = no cambiar)</span></Label>
                  <div className="relative">
                    <Input
                      type={showEditPwd ? "text" : "password"}
                      value={form.portalPassword}
                      onChange={e => setForm({ ...form, portalPassword: e.target.value })}
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      className="pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowEditPwd(s => !s)}>
                      {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-gray-500 w-28">Nombre:</dt><dd className="font-medium">{cliente.nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-28">Email:</dt><dd>{cliente.email ?? "-"}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-28">Teléfono:</dt><dd>{cliente.telefono ?? "-"}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-28">DNI/CUIT:</dt><dd>{formatCuit(cliente.dniCuit)}</dd></div>
                <div className="flex gap-2"><dt className="text-gray-500 w-28">Dirección:</dt><dd>{cliente.direccion ?? "-"}</dd></div>
                <Separator />
                <div className="flex gap-2 items-center">
                  <dt className="text-gray-500 w-28">Contraseña portal:</dt>
                  <dd className="flex items-center gap-2 flex-1">
                    {cliente.portalPassword ? (
                      <>
                        <span className="font-mono text-sm tracking-widest">
                          {showPwd ? cliente.portalPassword : "••••••••"}
                        </span>
                        <button type="button" className="text-gray-400 hover:text-gray-700 ml-1" onClick={() => setShowPwd(s => !s)}>
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Sin contraseña</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Órdenes de Trabajo</CardTitle>
              <Link href={`/ordenes/nueva?clienteId=${id}`}>
                <Button size="sm" style={{ background: "oklch(0.42 0.14 292)", color: "white" }}>
                  <Plus className="h-3 w-3 mr-1" />Nueva
                </Button>
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
