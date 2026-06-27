"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
  _count: { repuestos: number };
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nueva, setNueva] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  async function fetchCategorias() {
    const res = await fetch("/api/categorias");
    if (res.ok) setCategorias(await res.json());
  }

  useEffect(() => { fetchCategorias(); }, []);

  async function agregar() {
    if (!nueva.trim()) return;
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nueva.trim() }),
    });
    if (res.ok) {
      toast.success("Categoría creada");
      setNueva("");
      fetchCategorias();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear");
    }
  }

  async function guardarEdicion(id: string) {
    const res = await fetch(`/api/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre }),
    });
    if (res.ok) {
      toast.success("Categoría actualizada");
      setEditId(null);
      fetchCategorias();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al actualizar");
    }
  }

  async function toggleActiva(cat: Categoria) {
    const res = await fetch(`/api/categorias/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !cat.activa }),
    });
    if (res.ok) fetchCategorias();
    else toast.error("Error al actualizar");
  }

  async function eliminar(cat: Categoria) {
    if (!confirm(`¿Eliminar categoría "${cat.nombre}"?`)) return;
    const res = await fetch(`/api/categorias/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Categoría eliminada");
      fetchCategorias();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al eliminar");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Categorías de Repuestos</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Nueva categoría</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de la categoría..."
              value={nueva}
              onChange={e => setNueva(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregar()}
            />
            <Button onClick={agregar} disabled={!nueva.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Categorías ({categorias.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {categorias.length === 0 && (
            <p className="text-sm text-gray-400 py-2">Sin categorías cargadas</p>
          )}
          {categorias.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 py-2">
              {editId === cat.id ? (
                <>
                  <Input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && guardarEdicion(cat.id)}
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <button type="button" onClick={() => guardarEdicion(cat.id)} className="text-green-600 hover:text-green-800 p-1">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${!cat.activa ? "line-through text-gray-400" : ""}`}>
                    {cat.nombre}
                  </span>
                  <span className="text-xs text-gray-400">{cat._count.repuestos} repuesto(s)</span>
                  {!cat.activa && <Badge variant="outline" className="text-xs">Inactiva</Badge>}
                  <button
                    type="button"
                    onClick={() => { setEditId(cat.id); setEditNombre(cat.nombre); }}
                    className="text-gray-400 hover:text-blue-600 p-1"
                    title="Editar nombre"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActiva(cat)}
                    className="text-gray-400 hover:text-yellow-600 p-1 text-xs"
                    title={cat.activa ? "Desactivar" : "Activar"}
                  >
                    {cat.activa ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(cat)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
