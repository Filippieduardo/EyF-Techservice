"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Row { descripcion: string; numeroParte: string | null; categoria: string; cantidad: number; movimientos: number; }

const mesAtras = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (s: string) => s ? new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export default function Page() {
  const [desde, setDesde] = useState(mesAtras());
  const [hasta, setHasta] = useState(hoy());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/repuestos-top?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows); setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado ? `Período: ${fmt(desde)} al ${fmt(hasta)}  ·  Top ${rows.length} repuestos por salidas` : undefined;

  const printTable = (
    <table className="data">
      <thead><tr>
        <th className="center">#</th><th>N° Parte</th><th>Repuesto</th><th>Categoría</th><th className="center">Unidades usadas</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
            <td className="center" style={{ fontWeight: "bold", color: "#9ca3af" }}>{i + 1}</td>
            <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{r.numeroParte ?? "—"}</td>
            <td style={{ fontWeight: "500" }}>{r.descripcion}</td>
            <td>{r.categoria}</td>
            <td className="center" style={{ fontWeight: "bold", color: "#1d4ed8" }}>{r.cantidad}</td>
          </tr>
        ))}
      </tbody>
      <tbody><tr className="total"><td colSpan={4}>TOTAL UNIDADES</td><td className="center">{rows.reduce((s, r) => s + r.cantidad, 0)}</td></tr></tbody>
    </table>
  );

  return (
    <InformeLayout titulo="Repuestos más Utilizados (Top 20)" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex flex-wrap gap-3 items-end mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2" style={{ gridTemplateColumns: "2rem 9rem 1fr 8rem 6rem" }}>
            <div>#</div><div>N° Parte</div><div>Repuesto</div><div>Categoría</div><div className="text-center">Unidades</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid px-3 py-1.5 border-t text-xs items-center ${i % 2 === 1 ? "bg-gray-50" : ""}`} style={{ gridTemplateColumns: "2rem 9rem 1fr 8rem 6rem" }}>
              <div className="font-bold text-gray-400">{i + 1}</div>
              <div className="font-mono font-bold truncate">{r.numeroParte ?? "—"}</div>
              <div className="font-medium truncate">{r.descripcion}</div>
              <div className="text-gray-600 truncate">{r.categoria}</div>
              <div className="text-center font-bold text-blue-700">{r.cantidad}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin movimientos de salida en el período</div>}
          {rows.length > 0 && <div className="grid grid-cols-5 px-3 py-2 border-t bg-gray-100 font-bold text-sm"><div className="col-span-4">TOTAL UNIDADES</div><div className="text-center">{rows.reduce((s, r) => s + r.cantidad, 0)}</div></div>}
        </div>
      )}
    </InformeLayout>
  );
}
