"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/constants";
import { getEstadoOrden } from "@/lib/constants";

const añoAtras = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (s: string) => s ? new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

interface PorEstado { estado: string; cantidad: number; }

export default function Page() {
  const [desde, setDesde] = useState(añoAtras());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<{ totalOrdenes: number; terminadas: number; canceladas: number; noReparables: number; promedioDias: number; montoTotal: number; porEstado: PorEstado[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/mi-productividad?desde=${desde}&hasta=${hasta}`);
    const d = await res.json();
    setData(d); setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado && data ? `Período: ${fmt(desde)} al ${fmt(hasta)}  ·  ${data.totalOrdenes} órdenes totales  ·  ${data.terminadas} terminadas` : undefined;

  const printTable = data ? (
    <table className="data">
      <thead><tr>
        <th>Métrica</th><th className="right">Valor</th>
      </tr></thead>
      <tbody>
        <tr><td>Total órdenes en el período</td><td className="right" style={{ fontWeight: "bold" }}>{data.totalOrdenes}</td></tr>
        <tr className="alt"><td>Terminadas / Entregadas</td><td className="right" style={{ fontWeight: "bold", color: "#166534" }}>{data.terminadas}</td></tr>
        <tr><td>Canceladas</td><td className="right">{data.canceladas}</td></tr>
        <tr className="alt"><td>No reparables</td><td className="right">{data.noReparables}</td></tr>
        <tr><td>Tiempo promedio de reparación</td><td className="right">{data.promedioDias ?? "—"} días</td></tr>
        <tr className="alt"><td>Monto total facturado</td><td className="right" style={{ fontWeight: "bold" }}>{formatCurrency(data.montoTotal)}</td></tr>
      </tbody>
      {data.porEstado.length > 0 && <>
        <thead><tr><th>Estado</th><th className="center">Cantidad</th></tr></thead>
        <tbody>
          {data.porEstado.map((r, i) => (
            <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
              <td>{getEstadoOrden(r.estado)?.label ?? r.estado}</td>
              <td className="center" style={{ fontWeight: "bold" }}>{r.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </>}
    </table>
  ) : <table className="data"><tbody></tbody></table>;

  return (
    <InformeLayout titulo="Mi Productividad" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Calculando…" : "Consultar"}</Button>
      </div>

      {buscado && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Total órdenes", value: data.totalOrdenes, color: "text-gray-800" },
              { label: "Terminadas / Entregadas", value: data.terminadas, color: "text-green-700 font-bold" },
              { label: "Canceladas", value: data.canceladas, color: "text-gray-500" },
              { label: "No reparables", value: data.noReparables, color: "text-gray-500" },
              { label: "Prom. días reparación", value: `${data.promedioDias ?? "—"} días`, color: "text-blue-700" },
              { label: "Monto facturado", value: formatCurrency(data.montoTotal), color: "text-purple-700 font-bold" },
            ].map((m, i) => (
              <div key={i} className="border rounded p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                <div className={`text-xl ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          {data.porEstado.length > 0 && (
            <div className="border rounded overflow-hidden text-sm">
              <div className="grid grid-cols-2 bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2">
                <div>Estado</div><div className="text-center">Cantidad</div>
              </div>
              {data.porEstado.map((r, i) => (
                <div key={i} className={`grid grid-cols-2 px-3 py-2 border-t text-xs ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                  <div>{getEstadoOrden(r.estado)?.label ?? r.estado}</div>
                  <div className="text-center font-bold">{r.cantidad}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </InformeLayout>
  );
}
