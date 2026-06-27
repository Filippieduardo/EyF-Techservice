"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ESTADOS_ORDEN, TIPOS_EQUIPO, getEstadoOrden, getTipoEquipo, formatDate } from "@/lib/constants";

interface Orden {
  id: string;
  numero: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  fechaIngreso: string;
  cliente: { id: string; nombre: string };
  tecnico: { nombre: string } | null;
  marca: { nombre: string } | null;
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("all");
  const [loading, setLoading] = useState(true);

  async function fetchOrdenes() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado && estado !== "all") params.set("estado", estado);
    const res = await fetch(`/api/ordenes?${params}`);
    setOrdenes(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchOrdenes(); }, [q, estado]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-gray-500 text-sm">{ordenes.length} órdenes</p>
        </div>
        <Link href="/ordenes/nueva">
          <Button><Plus className="h-4 w-4 mr-2" />Nueva Orden</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar número, cliente, modelo..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={estado} onValueChange={v => setEstado(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS_ORDEN.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay órdenes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenes.map((o) => {
            const estado = getEstadoOrden(o.estado);
            return (
              <Link key={o.id} href={`/ordenes/${o.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-32 flex-shrink-0">
                        <p className="font-mono font-semibold text-sm">{o.numero}</p>
                        <p className="text-xs text-gray-400">{formatDate(o.fechaIngreso)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{o.cliente.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {getTipoEquipo(o.tipoEquipo)}
                          {o.marca ? ` · ${o.marca.nombre}` : ""}
                          {o.modelo ? ` ${o.modelo}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {o.tecnico && (
                          <p className="text-xs text-gray-400 hidden md:block">{o.tecnico.nombre}</p>
                        )}
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${estado.color}`}>
                          {estado.label}
                        </span>
                      </div>
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
