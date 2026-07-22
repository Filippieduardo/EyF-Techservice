"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Phone, Mail, FileText, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const CONDICIONES_IVA = ["INSCRIPTO", "NO ALCANZADO", "MONOTRIBUTO", "EXCENTO", "CONS. FINAL"];

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  dniCuit: string | null;
  activo: boolean;
  _count: { ordenes: number };
}

function formatCuit(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[-\s]/g, "");
  if (digits.length === 11) return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits[10]}`;
  return raw;
}

function validarCuit(cuit: string): boolean {
  const digits = cuit.replace(/[-\s]/g, "");
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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "", whatsapp: "", condicionIva: "CONS. FINAL", dniCuit: "", direccion: "", portalPassword: "",
  });
  const [cuitError, setCuitError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);

  async function fetchClientes(query = "") {
    setLoading(true);
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(query)}`);
    setClientes(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchClientes(); }, []);

  function handleCuitChange(value: string) {
    const digits = value.replace(/[-\s]/g, "");
    const formatted = digits.length === 11 ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits[10]}` : value;
    setForm({ ...form, dniCuit: formatted });
    if (digits.length === 11) {
      setCuitError(validarCuit(formatted) ? "" : "CUIT inválido (dígito verificador incorrecto)");
    } else {
      setCuitError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.portalPassword.trim()) {
      toast.error("La contraseña del portal no puede quedar vacía");
      return;
    }
    const cuitClean = form.dniCuit.replace(/[-\s]/g, "");
    if (cuitClean.length === 11 && !validarCuit(form.dniCuit)) {
      toast.error("El CUIT ingresado no es válido");
      return;
    }
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Cliente creado");
      setOpen(false);
      setForm({ nombre: "", email: "", telefono: "", whatsapp: "", condicionIva: "CONS. FINAL", dniCuit: "", direccion: "", portalPassword: "" });
      setCuitError("");
      fetchClientes(q);
    } else {
      toast.error("Error al crear cliente");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/clientes/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (res.ok) {
      toast.success("Cliente eliminado");
      fetchClientes(q);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "No se puede eliminar");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm">{clientes.length} clientes registrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre / Razón Social *</Label>
                <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value.toUpperCase() })} required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp <span className="text-gray-400 text-xs">(se completa con teléfono si se deja vacío)</span></Label>
                <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value.toUpperCase() })} placeholder={form.telefono || "0351-9999999"} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Condición IVA</Label>
                  <Select value={form.condicionIva} onValueChange={v => setForm({ ...form, condicionIva: v ?? form.condicionIva })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDICIONES_IVA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>DNI / CUIT</Label>
                  <Input
                    value={form.dniCuit}
                    onChange={e => handleCuitChange(e.target.value)}
                    placeholder="20-12345678-9"
                    className={cuitError ? "border-red-400" : ""}
                  />
                  {cuitError && <p className="text-xs text-red-500">{cuitError}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Contraseña portal cliente *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.portalPassword}
                    onChange={e => setForm({ ...form, portalPassword: e.target.value })}
                    placeholder="Contraseña de acceso al portal"
                    required
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
              <Button type="submit" className="w-full">Crear Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, email, teléfono..."
            value={q}
            onChange={e => { setQ(e.target.value); fetchClientes(e.target.value); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay clientes registrados</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {clientes.map((c) => (
            <div key={c.id} className="relative">
              <Link href={`/clientes/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-full h-10 w-10 flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">{c.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{c.nombre}</p>
                          <div className="flex gap-3 text-sm text-gray-500">
                            {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                            {c.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefono}</span>}
                            {c.dniCuit && <span>{formatCuit(c.dniCuit)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pr-8">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          {c._count.ordenes} orden{c._count.ordenes !== 1 ? "es" : ""}
                        </span>
                        {!c.activo && <Badge variant="destructive">Inactivo</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {c._count.ordenes === 0 && (
                <button
                  type="button"
                  title="Eliminar cliente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors z-10"
                  onClick={e => { e.preventDefault(); setDeleteTarget(c); }}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro desea eliminar al cliente <strong>{deleteTarget?.nombre}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
