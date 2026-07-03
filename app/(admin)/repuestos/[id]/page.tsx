"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarcaSelect } from "@/components/marca-select";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Save } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { TIPOS_EQUIPO, formatCurrency, formatDate } from "@/lib/constants";

interface Categoria { id: string; nombre: string; }
interface Repuesto {
  id: string;
  codigoInterno: string | null;
  numeroParte: string | null;
  descripcion: string;
  categoriaId: string | null;
  categoria: Categoria | null;
  stockActual: number;
  stockMinimo: number;
  precioCosto: number;
  precioVenta: number;
  compatibilidades: Array<{
    id: string; tipoEquipo: string; modelo: string | null;
    numeroParteOem: string | null; notas: string | null;
    marca: { nombre: string } | null;
  }>;
  movimientos: Array<{
    id: string; tipo: string; cantidad: number; notas: string | null;
    createdAt: string; user: { nombre: string } | null;
  }>;
}

export default function RepuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [repuesto, setRepuesto] = useState<Repuesto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editForm, setEditForm] = useState<any>({});
  const [movForm, setMovForm] = useState({ tipo: "ENTRADA", cantidad: 1, notas: "" });
  const [compatForm, setCompatForm] = useState({ tipoEquipo: "", marcaId: "", modelo: "", numeroParteOem: "", notas: "" });
  const [movOpen, setMovOpen] = useState(false);
  const [compatOpen, setCompatOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchRepuesto() {
    const res = await fetch(`/api/repuestos/${id}`);
    const data = await res.json();
    setRepuesto(data);
    setEditForm({
      descripcion: data.descripcion,
      numeroParte: data.numeroParte ?? "",
      codigoInterno: data.codigoInterno ?? "",
      categoriaId: data.categoriaId ?? "",
      stockMinimo: data.stockMinimo,
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
    });
  }

  useEffect(() => {
    fetchRepuesto();
    fetch("/api/categorias").then(r => r.ok ? r.json() : []).then(setCategorias);
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/repuestos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) { toast.success("Guardado"); fetchRepuesto(); }
    else toast.error("Error al guardar");
  }

  async function handleMovimiento() {
    const res = await fetch(`/api/repuestos/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "movimiento", ...movForm }),
    });
    if (res.ok) {
      toast.success("Movimiento registrado");
      setMovOpen(false);
      setMovForm({ tipo: "ENTRADA", cantidad: 1, notas: "" });
      fetchRepuesto();
    } else toast.error("Error");
  }

  async function handleAddCompat() {
    const res = await fetch(`/api/repuestos/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "compatibilidad",
        data: { ...compatForm, marcaId: compatForm.marcaId === "none" ? undefined : compatForm.marcaId || undefined },
      }),
    });
    if (res.ok) {
      toast.success("Compatibilidad agregada");
      setCompatOpen(false);
      setCompatForm({ tipoEquipo: "", marcaId: "", modelo: "", numeroParteOem: "", notas: "" });
      fetchRepuesto();
    } else toast.error("Error");
  }

  async function deleteCompat(compatId: string) {
    const res = await fetch(`/api/repuestos/${id}?compatId=${compatId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Eliminada"); fetchRepuesto(); }
  }

  if (!repuesto) return <div className="p-6 text-gray-400">Cargando...</div>;

  const stockBajo = repuesto.stockActual <= repuesto.stockMinimo;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{repuesto.descripcion}</h1>
          <p className="text-gray-500 text-sm">{repuesto.numeroParte ?? "Sin número de parte"}</p>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}
          </Button>
        )}
        {!isAdmin && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Solo consulta</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del Repuesto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input
                  value={editForm.descripcion ?? ""}
                  onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Número de Parte</Label>
                  <Input value={editForm.numeroParte ?? ""} onChange={e => setEditForm({ ...editForm, numeroParte: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-1">
                  <Label>Código Interno</Label>
                  <Input value={editForm.codigoInterno ?? ""} onChange={e => setEditForm({ ...editForm, codigoInterno: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select
                  value={editForm.categoriaId ?? ""}
                  onValueChange={v => setEditForm({ ...editForm, categoriaId: v === "none" ? "" : (v ?? "") })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría">
                      {editForm.categoriaId ? (categorias.find(c => c.id === editForm.categoriaId)?.nombre ?? "Sin categoría") : "Sin categoría"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Stock Mínimo</Label>
                  <Input type="number" min={0} value={editForm.stockMinimo ?? 0} onChange={e => setEditForm({ ...editForm, stockMinimo: Number(e.target.value) })} disabled={!isAdmin} />
                </div>
                <div className="space-y-1">
                  <Label>Precio Costo</Label>
                  <Input type="number" min={0} step="0.01" value={editForm.precioCosto ?? 0} onChange={e => setEditForm({ ...editForm, precioCosto: Number(e.target.value) })} disabled={!isAdmin} />
                </div>
                <div className="space-y-1">
                  <Label>Precio Venta</Label>
                  <Input type="number" min={0} step="0.01" value={editForm.precioVenta ?? 0} onChange={e => setEditForm({ ...editForm, precioVenta: Number(e.target.value) })} disabled={!isAdmin} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Compatibilidades</CardTitle>
                {isAdmin && (
                  <Dialog open={compatOpen} onOpenChange={setCompatOpen}>
                    <Button
                      size="sm"
                      onClick={() => setCompatOpen(true)}
                      style={{ background: "oklch(0.42 0.14 292)", color: "white" }}
                    >
                      <Plus className="h-3 w-3 mr-1" />Agregar
                    </Button>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Agregar Compatibilidad</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Tipo de Equipo *</Label>
                          <Select value={compatForm.tipoEquipo} onValueChange={v => setCompatForm({ ...compatForm, tipoEquipo: v ?? "" })}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_EQUIPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Marca</Label>
                          <MarcaSelect value={compatForm.marcaId} onValueChange={v => setCompatForm({ ...compatForm, marcaId: v ?? "" })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Modelo</Label>
                          <Input value={compatForm.modelo} onChange={e => setCompatForm({ ...compatForm, modelo: e.target.value })} placeholder="ej: LaserJet P1102" />
                        </div>
                        <div className="space-y-1">
                          <Label>Número de Parte OEM</Label>
                          <Input value={compatForm.numeroParteOem} onChange={e => setCompatForm({ ...compatForm, numeroParteOem: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Notas</Label>
                          <Input value={compatForm.notas} onChange={e => setCompatForm({ ...compatForm, notas: e.target.value })} />
                        </div>
                        <Button onClick={handleAddCompat} className="w-full" disabled={!compatForm.tipoEquipo}>Agregar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {repuesto.compatibilidades.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Sin compatibilidades cargadas</p>
              ) : (
                <div className="space-y-2">
                  {repuesto.compatibilidades.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="text-sm">
                        <span className="font-medium">{TIPOS_EQUIPO.find(t => t.value === c.tipoEquipo)?.label}</span>
                        {c.marca && <span className="text-gray-500"> · {c.marca.nombre}</span>}
                        {c.modelo && <span className="text-gray-500"> {c.modelo}</span>}
                        {c.numeroParteOem && <span className="text-blue-600 ml-1 text-xs">({c.numeroParteOem})</span>}
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => deleteCompat(c.id)}>
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={stockBajo ? "border-red-300" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Stock
                {isAdmin && (
                  <Dialog open={movOpen} onOpenChange={setMovOpen}>
                    <Button
                      size="sm"
                      onClick={() => setMovOpen(true)}
                      style={{ background: "oklch(0.42 0.14 292)", color: "white" }}
                    >
                      <Plus className="h-3 w-3 mr-1" />Movimiento
                    </Button>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Tipo</Label>
                          <Select value={movForm.tipo} onValueChange={v => setMovForm({ ...movForm, tipo: v ?? movForm.tipo })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ENTRADA">Entrada</SelectItem>
                              <SelectItem value="SALIDA">Salida</SelectItem>
                              <SelectItem value="AJUSTE">Ajuste</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Cantidad</Label>
                          <Input type="number" min={1} value={movForm.cantidad} onChange={e => setMovForm({ ...movForm, cantidad: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Notas</Label>
                          <Input value={movForm.notas} onChange={e => setMovForm({ ...movForm, notas: e.target.value })} />
                        </div>
                        <Button onClick={handleMovimiento} className="w-full">Registrar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-2">
                <p className={`text-4xl font-bold ${stockBajo ? "text-red-600" : "text-green-600"}`}>{repuesto.stockActual}</p>
                <p className="text-sm text-gray-400">mínimo: {repuesto.stockMinimo}</p>
                {stockBajo && <Badge variant="destructive" className="mt-2">Stock Bajo</Badge>}
              </div>
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo:</span>
                  <span>{formatCurrency(repuesto.precioCosto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Venta:</span>
                  <span className="font-medium">{formatCurrency(repuesto.precioVenta)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Movimientos Recientes</CardTitle></CardHeader>
            <CardContent>
              {repuesto.movimientos.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Sin movimientos</p>
              ) : (
                <div className="space-y-2">
                  {repuesto.movimientos.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      {m.tipo === "ENTRADA" ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                      <span className={m.tipo === "ENTRADA" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {m.tipo === "ENTRADA" ? "+" : "-"}{m.cantidad}
                      </span>
                      <span className="text-gray-400 text-xs flex-1 truncate">{m.notas ?? m.tipo}</span>
                      <span className="text-xs text-gray-300">{formatDate(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
