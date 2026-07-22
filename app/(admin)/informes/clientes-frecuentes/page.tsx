"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/constants";

interface Row { nombre: string; email: string; telefono: string; cantidadOrdenes: number; ordenesTerminadas: number; montoTotal: number; }

const añoAtras = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];

export default function Page() {
  const [desde, setDesde] = useState(añoAtras());
  const [hasta, setHasta] = useState(hoy());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/clientes-frecuentes?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows); setBuscado(true); setLoading(false);
  }

  return (
    <InformeLayout titulo="Clientes Frecuentes">
      <div className="flex flex-wrap gap-3 items-end no-print mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid grid-cols-6 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
            <div>#</div><div>Cliente</div><div>Contacto</div><div className="text-center">Órdenes</div><div className="text-center">Terminadas</div><div className="text-right">Monto total</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-6 px-3 py-2 border-t text-xs items-center ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
              <div className="font-bold text-gray-400">{i + 1}</div>
              <div className="font-medium">{r.nombre}</div>
              <div className="text-gray-500 text-xs">{r.telefono !== "—" ? r.telefono : r.email}</div>
              <div className="text-center font-bold">{r.cantidadOrdenes}</div>
              <div className="text-center text-green-700">{r.ordenesTerminadas}</div>
              <div className="text-right">{formatCurrency(r.montoTotal)}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin datos</div>}
          {rows.length > 0 && (
            <div className="grid grid-cols-6 px-3 py-2 border-t bg-gray-100 font-bold text-sm">
              <div className="col-span-3">TOTAL</div>
              <div className="text-center">{rows.reduce((s, r) => s + r.cantidadOrdenes, 0)}</div>
              <div className="text-center text-green-700">{rows.reduce((s, r) => s + r.ordenesTerminadas, 0)}</div>
              <div className="text-right">{formatCurrency(rows.reduce((s, r) => s + r.montoTotal, 0))}</div>
            </div>
          )}
        </div>
      )}
    </InformeLayout>
  );
}
