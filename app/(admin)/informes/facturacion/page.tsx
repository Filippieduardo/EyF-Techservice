"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/constants";

interface Row { periodo: string; cantidad: number; monto: number; }

const añoAtras = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];

export default function Page() {
  const [desde, setDesde] = useState(añoAtras());
  const [hasta, setHasta] = useState(hoy());
  const [agrupacion, setAgrupacion] = useState("mes");
  const [rows, setRows] = useState<Row[]>([]);
  const [totalMonto, setTotalMonto] = useState(0);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/facturacion?desde=${desde}&hasta=${hasta}&agrupacion=${agrupacion}`);
    const data = await res.json();
    setRows(data.rows); setTotalMonto(data.totalMonto); setTotalOrdenes(data.totalOrdenes);
    setBuscado(true); setLoading(false);
  }

  return (
    <InformeLayout titulo="Facturación del Período">
      <div className="flex flex-wrap gap-3 items-end no-print mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <div className="space-y-1">
          <Label>Agrupación</Label>
          <Select value={agrupacion} onValueChange={setAgrupacion}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mes">Por mes</SelectItem><SelectItem value="semana">Por semana</SelectItem></SelectContent>
          </Select>
        </div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>
      <p className="text-xs text-gray-500 no-print">Solo incluye órdenes TERMINADAS o ENTREGADAS.</p>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid grid-cols-3 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
            <div>Período</div><div className="text-center">Órdenes</div><div className="text-right">Monto</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-3 px-3 py-2 border-t ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
              <div className="font-medium">{r.periodo}</div>
              <div className="text-center">{r.cantidad}</div>
              <div className="text-right font-medium">{formatCurrency(r.monto)}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin datos</div>}
          {rows.length > 0 && (
            <div className="grid grid-cols-3 px-3 py-2 border-t bg-gray-100 font-bold">
              <div>TOTAL</div><div className="text-center">{totalOrdenes}</div><div className="text-right">{formatCurrency(totalMonto)}</div>
            </div>
          )}
        </div>
      )}
    </InformeLayout>
  );
}
