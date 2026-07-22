"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/constants";

interface Row { fecha: string; tipo: string; descripcion: string; numeroParte: string | null; categoria: string; cantidad: number; precioUnitario: number; total: number; usuario: string; notas: string | null; }

const mesAtras = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];

const TIPO_COLOR: Record<string, string> = { ENTRADA: "text-green-700 font-bold", SALIDA: "text-red-600 font-bold", AJUSTE: "text-orange-600 font-bold" };

export default function Page() {
  const [desde, setDesde] = useState(mesAtras());
  const [hasta, setHasta] = useState(hoy());
  const [rows, setRows] = useState<Row[]>([]);
  const [totales, setTotales] = useState({ entradas: 0, salidas: 0 });
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/mov-stock?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows); setTotales({ entradas: data.totalEntradas, salidas: data.totalSalidas });
    setBuscado(true); setLoading(false);
  }

  return (
    <InformeLayout titulo="Movimientos de Stock">
      <div className="flex flex-wrap gap-3 items-end no-print mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>

      {buscado && (
        <>
          <div className="flex gap-6 text-sm mb-2 no-print">
            <span className="text-green-700 font-semibold">Entradas totales: {totales.entradas}</span>
            <span className="text-red-600 font-semibold">Salidas totales: {totales.salidas}</span>
          </div>
          <div className="border rounded overflow-hidden text-xs overflow-x-auto">
            <div className="grid grid-cols-7 bg-gray-100 font-semibold text-gray-600 px-3 py-2 min-w-[700px]">
              <div>Fecha</div><div>Tipo</div><div className="col-span-2">Repuesto</div><div className="text-center">Cant.</div><div className="text-right">P. Unit.</div><div className="text-right">Total</div>
            </div>
            {rows.map((r, i) => (
              <div key={i} className={`grid grid-cols-7 px-3 py-1.5 border-t items-center min-w-[700px] ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                <div>{formatDate(r.fecha)}</div>
                <div className={TIPO_COLOR[r.tipo] ?? ""}>{r.tipo}</div>
                <div className="col-span-2">{r.descripcion}{r.numeroParte ? <span className="text-gray-400"> · {r.numeroParte}</span> : ""}</div>
                <div className="text-center">{r.cantidad}</div>
                <div className="text-right">{formatCurrency(r.precioUnitario)}</div>
                <div className="text-right">{formatCurrency(r.total)}</div>
              </div>
            ))}
            {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin movimientos en el período</div>}
          </div>
        </>
      )}
    </InformeLayout>
  );
}
