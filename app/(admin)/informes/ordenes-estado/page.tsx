"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEstadoOrden, formatCurrency } from "@/lib/constants";

interface Row { estado: string; cantidad: number; porcentaje: number; }

const mesAtras = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (s: string) => s ? new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export default function Page() {
  const [desde, setDesde] = useState(mesAtras());
  const [hasta, setHasta] = useState(hoy());
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/ordenes-estado?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows); setTotal(data.total); setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado ? `Período: ${fmt(desde)} al ${fmt(hasta)}  ·  Total: ${total} órdenes` : undefined;

  const printTable = (
    <table className="data">
      <thead><tr>
        <th>Estado</th>
        <th className="center">Cantidad</th>
        <th className="center">Porcentaje</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
            <td>{getEstadoOrden(r.estado)?.label ?? r.estado}</td>
            <td className="center" style={{ fontWeight: "bold" }}>{r.cantidad}</td>
            <td className="center">{r.porcentaje}%</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr>
        <td>TOTAL</td>
        <td className="center">{total}</td>
        <td className="center">100%</td>
      </tr></tfoot>
    </table>
  );

  return (
    <InformeLayout titulo="Órdenes por Estado" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex flex-wrap gap-3 items-end mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid grid-cols-4 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
            <div>Estado</div><div className="text-center">Cantidad</div><div className="text-center">%</div><div className="text-center">Barra</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-4 px-3 py-2 border-t items-center ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
              <div className="font-medium">{getEstadoOrden(r.estado)?.label ?? r.estado}</div>
              <div className="text-center font-bold">{r.cantidad}</div>
              <div className="text-center text-gray-500">{r.porcentaje}%</div>
              <div className="pr-4"><div className="h-3 rounded-full bg-blue-500" style={{ width: `${r.porcentaje}%`, minWidth: r.cantidad > 0 ? "4px" : "0" }} /></div>
            </div>
          ))}
          <div className="grid grid-cols-4 px-3 py-2 border-t bg-gray-100 font-bold">
            <div>TOTAL</div><div className="text-center">{total}</div><div className="text-center">100%</div><div />
          </div>
        </div>
      )}
    </InformeLayout>
  );
}
