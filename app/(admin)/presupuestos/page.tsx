"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, FileText } from "lucide-react";
import Link from "next/link";
import { ESTADOS_PRESUPUESTO, getEstadoPresupuesto, formatDate, formatCurrency } from "@/lib/constants";

interface Presupuesto {
  id: string;
  numero: string;
  estado: string;
  total: number;
  fecha: string;
  validezDias: number;
  cliente: { nombre: string };
  _count: { items: number };
}

export default function PresupuestosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  useEffect(() => { if (session && !isAdmin) router.replace("/dashboard"); }, [session, isAdmin]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("all");
  const [loading, setLoading] = useState(true);

  async function fetchPresupuestos() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado && estado !== "all") params.set("estado", estado);
    const res = await fetch(`/api/presupuestos?${params}`);
    setPresupuestos(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchPresupuestos(); }, [q, estado]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-gray-500 text-sm">{presupuestos.length} presupuestos</p>
        </div>
        <Link href="/presupuestos/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar número, cliente..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={estado} onValueChange={v => setEstado(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos">
              {estado === "all" ? "Todos" : (ESTADOS_PRESUPUESTO.find(e => e.value === estado)?.label ?? "Todos")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS_PRESUPUESTO.map(e => (
              <SelectItem key={e.value} value={e.value}>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.color}`}>{e.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : presupuestos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay presupuestos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {presupuestos.map((p) => {
            const est = getEstadoPresupuesto(p.estado);
            return (
              <Link key={p.id} href={`/presupuestos/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-36 flex-shrink-0">
                        <p className="font-mono font-semibold text-sm">{p.numero}</p>
                        <p className="text-xs text-gray-400">{formatDate(p.fecha)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{p.cliente.nombre}</p>
                        <p className="text-xs text-gray-400">{p._count.items} ítem{p._count.items !== 1 ? "s" : ""} · válido {p.validezDias} días</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">{formatCurrency(p.total)}</p>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${est.color}`}>{est.label}</span>
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
