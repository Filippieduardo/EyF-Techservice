"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Package, AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { TIPOS_EQUIPO, formatCurrency } from "@/lib/constants";
import { MarcaSelect } from "@/components/marca-select";

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
  _count: { compatibilidades: number };
}

const emptyForm = {
  descripcion: "", numeroParte: "", codigoInterno: "",
  categoriaId: "", stockActual: 0, stockMinimo: 1,
  precioCosto: 0, precioVenta: 0,
};

export default function RepuestosPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [busqForm, setBusqForm] = useState({ tipoEquipo: "", marcaId: "", modelo: "", numeroParte: "" });
  const [resultados, setResultados] = useState<any[]>([]);

  async function fetchRepuestos(query = "") {
    setLoading(true);
    const res = await fetch(`/api/repuestos?q=${encodeURIComponent(query)}`);
    setRepuestos(await res.json());
    setLoading(false);
  }

  async function fetchCategorias() {
    const res = await fetch("/api/categorias");
    if (res.ok) setCategorias(await res.json());
  }

  useEffect(() => {
    fetchRepuestos();
    fetchCategorias();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/repuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoriaId: form.categoriaId || null }),
    });
    if (res.ok) {
      toast.success("Repuesto creado");
      setOpen(false);
      setForm({ ...emptyForm });
      fetchRepuestos(q);
    } else {
      toast.error("Error al crear repuesto");
    }
  }

  async function buscarCompatibles() {
    const params = new URLSearchParams();
    if (busqForm.tipoEquipo) params.set("tipoEquipo", busqForm.tipoEquipo);
    if (busqForm.marcaId && busqForm.marcaId !== "none") params.set("marcaId", busqForm.marcaId);
    if (busqForm.modelo) params.set("modelo", busqForm.modelo);
    if (busqForm.numeroParte) params.set("numeroParte", busqForm.numeroParte);
    const res = await fetch(`/api/repuestos/buscar-compatibles?${params}`);
    setResultados(await res.json());
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Repuestos / Stock</h1>
          <p className="text-gray-500 text-sm">{repuestos.length} repuestos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Link href="/categorias">
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Categorías</Button>
            </Link>
          )}

          <Dialog open={buscarOpen} onOpenChange={setBuscarOpen}>
            <Button variant="outline" onClick={() => setBuscarOpen(true)}><Search className="h-4 w-4 mr-2" />Buscar Compatibles</Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Búsqueda de Compatibilidad</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo de Equipo</Label>
                  <Select value={busqForm.tipoEquipo} onValueChange={v => setBusqForm({...busqForm, tipoEquipo: v ?? ""})}>
                    <SelectTrigger><SelectValue placeholder="Cualquier tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_EQUIPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Marca</Label>
                  <MarcaSelect value={busqForm.marcaId} onValueChange={v => setBusqForm({...busqForm, marcaId: v ?? ""})} />
                </div>
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input value={busqForm.modelo} onChange={e => setBusqForm({...busqForm, modelo: e.target.value})} placeholder="ej: LaserJet P1102" />
                </div>
                <div className="space-y-1">
                  <Label>Número de Parte</Label>
                  <Input value={busqForm.numeroParte} onChange={e => setBusqForm({...busqForm, numeroParte: e.target.value})} placeholder="ej: CF217A" />
                </div>
              </div>
              <Button onClick={buscarCompatibles} className="w-full">Buscar</Button>
              {resultados.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {resultados.map((r: any) => (
                    <Link key={r.id} href={`/repuestos/${r.id}`} onClick={() => setBuscarOpen(false)}>
                      <div className="p-3 border rounded hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{r.descripcion}</p>
                            <p className="text-xs text-gray-400">{r.numeroParte}</p>
                          </div>
                          <Badge variant={r.stockActual <= r.stockMinimo ? "destructive" : "secondary"}>
                            Stock: {r.stockActual}
                          </Badge>
                        </div>
                        {r.compatibilidades?.slice(0, 2).map((c: any) => (
                          <p key={c.id} className="text-xs text-blue-600 mt-1">
                            ✓ {c.tipoEquipo} {c.marca?.nombre} {c.modelo}
                          </p>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {resultados.length === 0 && busqForm.modelo && (
                <p className="text-center text-gray-400 text-sm">Sin resultados</p>
              )}
            </DialogContent>
          </Dialog>

          {isAdmin && <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Repuesto</Button>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nuevo Repuesto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label>Descripción *</Label>
                  <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Número de Parte</Label>
                    <Input value={form.numeroParte} onChange={e => setForm({...form, numeroParte: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Código Interno</Label>
                    <Input value={form.codigoInterno} onChange={e => setForm({...form, codigoInterno: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Select value={form.categoriaId} onValueChange={v => setForm({...form, categoriaId: v === "none" ? "" : (v ?? "")})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría">
                        {form.categoriaId ? (categorias.find(c => c.id === form.categoriaId)?.nombre ?? "Sin categoría") : "Sin categoría"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Stock Actual</Label>
                    <Input type="number" min={0} value={form.stockActual} onChange={e => setForm({...form, stockActual: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Stock Mínimo</Label>
                    <Input type="number" min={0} value={form.stockMinimo} onChange={e => setForm({...form, stockMinimo: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Precio Costo</Label>
                    <Input type="number" min={0} step="0.01" value={form.precioCosto} onChange={e => setForm({...form, precioCosto: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Precio Venta</Label>
                    <Input type="number" min={0} step="0.01" value={form.precioVenta} onChange={e => setForm({...form, precioVenta: Number(e.target.value)})} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Crear Repuesto</Button>
              </form>
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar descripción, número de parte..." value={q} onChange={e => { setQ(e.target.value); fetchRepuestos(e.target.value); }} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : repuestos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay repuestos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {repuestos.map((r) => {
            const stockBajo = r.stockActual <= r.stockMinimo;
            return (
              <Link key={r.id} href={`/repuestos/${r.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${stockBajo ? "border-red-200" : ""}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.descripcion}</p>
                        {r.numeroParte && <p className="text-xs text-gray-400">{r.numeroParte}</p>}
                      </div>
                      {stockBajo && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 ml-2" />}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <span className={`font-bold ${stockBajo ? "text-red-600" : "text-green-600"}`}>{r.stockActual}</span>
                        <span className="text-gray-400">/ mín {r.stockMinimo}</span>
                      </div>
                      <span className="text-gray-500">{formatCurrency(r.precioVenta)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs">{r.categoria?.nombre ?? "Sin categoría"}</Badge>
                      <span className="text-xs text-gray-400">{r._count.compatibilidades} compat.</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
