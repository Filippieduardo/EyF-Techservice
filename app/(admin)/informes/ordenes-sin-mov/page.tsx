"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEstadoOrden, formatDate } from "@/lib/constants";

interface Row { numero: string; cliente: string; estado: string; tecnico: string; fechaIngreso: string; ultimoMovimiento: string; diasSinMovimiento: number; }

export default function Page() {
  const [dias, setDias] = useState("7");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/ordenes-sin-mov?dias=${dias}`);
    const data = await res.json();
    setRows(data.rows); setBuscado(true); setLoading(false);
  }

  return (
    <InformeLayout titulo="Órdenes sin Movimiento">
      <div className="flex flex-wrap gap-3 items-end no-print mb-2">
        <div className="space-y-1"><Label>Sin movimiento hace más de (días)</Label><Input type="number" min={1} value={dias} onChange={e => setDias(e.target.value)} className="w-24" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>
      <p className="text-xs text-gray-500 no-print">Excluye órdenes TERMINADAS, ENTREGADAS, CANCELADAS y NO REPARABLES.</p>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid grid-cols-6 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
            <div>N° Orden</div><div>Cliente</div><div>Estado</div><div>Técnico</div><div className="text-center">Último mov.</div><div className="text-center">Días sin mov.</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-6 px-3 py-2 border-t text-xs items-center ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
              <div className="font-mono font-bold">{r.numero}</div>
              <div>{r.cliente}</div>
              <div>{getEstadoOrden(r.estado)?.label ?? r.estado}</div>
              <div>{r.tecnico}</div>
              <div className="text-center">{formatDate(r.ultimoMovimiento)}</div>
              <div className={`text-center font-bold ${r.diasSinMovimiento > 14 ? "text-red-600" : "text-orange-500"}`}>{r.diasSinMovimiento}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">No hay órdenes sin movimiento en ese período</div>}
        </div>
      )}
    </InformeLayout>
  );
}
