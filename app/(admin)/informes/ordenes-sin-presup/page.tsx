"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEstadoOrden, formatDate } from "@/lib/constants";

interface Row { numero: string; cliente: string; estado: string; tecnico: string; fechaIngreso: string; }

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
    const res = await fetch(`/api/informes/ordenes-sin-presup?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows); setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado ? `Período: ${fmt(desde)} al ${fmt(hasta)}  ·  ${rows.length} orden${rows.length !== 1 ? "es" : ""} con diagnóstico sin presupuesto` : undefined;

  const printTable = (
    <table className="data">
      <thead><tr>
        <th>N° Orden</th><th>Cliente</th><th>Estado</th><th>Técnico</th><th className="center">Ingreso</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
            <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{r.numero}</td>
            <td>{r.cliente}</td>
            <td>{getEstadoOrden(r.estado)?.label ?? r.estado}</td>
            <td>{r.tecnico}</td>
            <td className="center">{formatDate(r.fechaIngreso)}</td>
          </tr>
        ))}
      </tbody>
      <tbody><tr className="total"><td colSpan={5}>{rows.length} orden{rows.length !== 1 ? "es" : ""} encontrada{rows.length !== 1 ? "s" : ""}</td></tr></tbody>
    </table>
  );

  return (
    <InformeLayout titulo="Órdenes con Diagnóstico sin Presupuesto" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex flex-wrap gap-3 items-end mb-2">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Buscando…" : "Consultar"}</Button>
      </div>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid grid-cols-5 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
            <div>N° Orden</div><div>Cliente</div><div>Estado</div><div>Técnico</div><div>Ingreso</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-5 px-3 py-2 border-t text-xs ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
              <div className="font-mono font-bold">{r.numero}</div>
              <div>{r.cliente}</div>
              <div>{getEstadoOrden(r.estado)?.label ?? r.estado}</div>
              <div>{r.tecnico}</div>
              <div>{formatDate(r.fechaIngreso)}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin resultados</div>}
          {rows.length > 0 && <div className="px-3 py-2 border-t bg-gray-100 font-bold text-sm">{rows.length} órdenes encontradas</div>}
        </div>
      )}
    </InformeLayout>
  );
}
