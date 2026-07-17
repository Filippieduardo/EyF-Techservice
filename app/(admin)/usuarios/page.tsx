"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, UserCog, Eye, EyeOff, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: string;
  activo: boolean;
  createdAt: string;
}

const emptyForm = { nombre: "", email: "", password: "", role: "TECNICO" };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ nombre: "", email: "", role: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);

  async function fetchUsuarios() {
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, email: form.email.toLowerCase() }),
    });
    if (res.ok) {
      toast.success("Usuario creado");
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchUsuarios();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear usuario");
    }
  }

  function openEdit(u: Usuario) {
    setEditUser(u);
    setEditForm({ nombre: u.nombre, email: u.email, role: u.role, password: "" });
    setShowEditPwd(false);
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    const body: any = {
      nombre: editForm.nombre,
      email: editForm.email.toLowerCase(),
      role: editForm.role,
    };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/usuarios/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Usuario actualizado");
      setEditOpen(false);
      fetchUsuarios();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/usuarios/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (res.ok) {
      toast.success("Usuario eliminado");
      fetchUsuarios();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "No se puede eliminar");
    }
  }

  async function toggleActivo(u: Usuario) {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    if (res.ok) {
      toast.success(u.activo ? "Usuario desactivado" : "Usuario activado");
      fetchUsuarios();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-gray-500 text-sm">Técnicos y administradores</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm }); setShowPwd(false); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Usuario
        </Button>
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {usuarios.map((u) => (
          <Card key={u.id} className={!u.activo ? "opacity-50" : ""}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-full h-9 w-9 flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: u.activo ? "oklch(0.42 0.14 292)" : "oklch(0.65 0.04 270)" }}
                  >
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-medium ${!u.activo ? "text-gray-400" : ""}`}>{u.nombre}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "Administrador" : "Técnico"}
                  </Badge>
                  {!u.activo && <Badge variant="outline" className="text-gray-400">Inactivo</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={u.activo ? "outline" : "default"}
                    onClick={() => toggleActivo(u)}
                    className={u.activo ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
                  >
                    {u.activo ? "Desactivar" : "Activar"}
                  </Button>
                  <button
                    type="button"
                    title="Eliminar usuario"
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    onClick={() => setDeleteTarget(u)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value.toUpperCase() })} required />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Contraseña *</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowPwd(s => !s)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v ?? "TECNICO" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECNICO">Técnico</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Crear</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar Eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro desea eliminar al usuario <strong>{deleteTarget?.nombre}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuario — {editUser?.nombre}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value.toUpperCase() })} required />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value.toLowerCase() })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Nueva contraseña <span className="text-gray-400 text-xs">(dejar vacío para no cambiar)</span></Label>
              <div className="relative">
                <Input
                  type={showEditPwd ? "text" : "password"}
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  minLength={6}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowEditPwd(s => !s)}>
                  {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v ?? editForm.role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECNICO">Técnico</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Guardar Cambios</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
