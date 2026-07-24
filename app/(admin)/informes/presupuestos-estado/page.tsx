"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEstadoPresupuesto, formatCurrency } from "@/lib/constants";

interface Row { id: string; numero: string; fecha: string; estado: string; total: number; clienteNombre: string; ordenNumero: string | null; }
interface Resumen { estado: string; cantidad: number; total: number; }

const mesAtras = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; };
const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (s: string) => s ? new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

const ESTADO_ORDER = ["PENDIENTE", "APROBADO", "RECHAZADO", "VENCIDO"];

export default function Page() {
  const [desde, setDesde] = useState(mesAtras());
  const [hasta, setHasta] = useState(hoy());
  const [rows, setRows] = useState<Row[]>([]);
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch(`/api/informes/presupuestos-estado?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setResumen(data.resumen ?? []);
    setBuscado(true);
    setLoading(false);
  }

  const totalGeneral = resumen.reduce((s, r) => s + r.total, 0);
  const totalCantidad = resumen.reduce((s, r) => s + r.cantidad, 0);
  const filtrosTexto = buscado ? `Período: ${fmt(desde)} al ${fmt(hasta)}  ·  ${totalCantidad} presupuestos` : undefined;

  const estadosConDatos = ESTADO_ORDER.filter(e => rows.some(r => r.estado === e));

  const printTable = (
    <table className="data">
      <thead>
        <tr><th>N° Presupuesto</th><th>Fecha</th><th>Cliente</th><th>N° Orden</th><th className="right">Total</th></tr>
      </thead>
      {estadosConDatos.map(estado => {
        const grupo = rows.filter(r => r.estado === estado);
        const subtotal = grupo.reduce((s, r) => s + r.total, 0);
        const info = getEstadoPresupuesto(estado);
        return (
          <tbody key={estado}>
            <tr style={{ background: "#1e3a5f", color: "#fff" }}>
              <td colSpan={4} style={{ fontWeight: "bold", fontSize: "11pt" }}>{info?.label ?? estado} — {grupo.length} {grupo.length === 1 ? "presupuesto" : "presupuestos"}</td>
              <td className="right" style={{ fontWeight: "bold", fontSize: "11pt" }}>{formatCurrency(subtotal)}</td>
            </tr>
            {grupo.map((r, i) => (
              <tr key={r.id} className={i % 2 === 1 ? "alt" : ""}>
                <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{r.numero}</td>
                <td>{fmt(r.fecha)}</td>
                <td>{r.clienteNombre}</td>
                <td>{r.ordenNumero ?? "—"}</td>
                <td className="right">{formatCurrency(r.total)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={4} style={{ textAlign: "right" }}>SUBTOTAL {info?.label ?? estado}</td>
              <td className="right">{formatCurrency(subtotal)}</td>
            </tr>
          </tbody>
        );
      })}
      <tbody>
        <tr className="total">
          <td colSpan={4} style={{ textAlign: "right", fontSize: "11pt" }}>TOTAL GENERAL · {totalCantidad} presupuestos</td>
          <td className="right" style={{ fontSize: "11pt" }}>{formatCurrency(totalGeneral)}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <InformeLayout titulo="Presupuestos por Estado" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" /></div>
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Consultando…" : "Consultar"}</Button>
      </div>

      {buscado && rows.length === 0 && (
        <div className="text-center py-10 text-gray-400 border rounded-lg">No hay presupuestos en el período seleccionado.</div>
      )}

      {buscado && rows.length > 0 && (
        <div className="space-y-6">
          {/* Resumen por estado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {resumen.map(r => {
              const info = getEstadoPresupuesto(r.estado);
              return (
                <div key={r.estado} className="border rounded p-3 bg-white">
                  <div className={`text-xs font-semibold mb-1 px-2 py-0.5 rounded inline-block ${info?.color ?? "bg-gray-100 text-gray-600"}`}>{info?.label ?? r.estado}</div>
                  <div className="text-xl font-bold text-gray-800 mt-1">{r.cantidad}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(r.total)}</div>
                </div>
              );
            })}
          </div>

          {/* Detalle agrupado por estado */}
          {estadosConDatos.map(estado => {
            const grupo = rows.filter(r => r.estado === estado);
            const subtotal = grupo.reduce((s, r) => s + r.total, 0);
            const info = getEstadoPresupuesto(estado);
            return (
              <div key={estado} className="border rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 flex justify-between items-center">
                  <span className="font-bold">{info?.label ?? estado} <span className="font-normal text-sm opacity-80">· {grupo.length} {grupo.length === 1 ? "presupuesto" : "presupuestos"}</span></span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b">
                      <th className="text-left px-3 py-2">N° Presupuesto</th>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Cliente</th>
                      <th className="text-left px-3 py-2">N° Orden</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grupo.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-1.5 font-mono font-bold">{r.numero}</td>
                        <td className="px-3 py-1.5">{fmt(r.fecha)}</td>
                        <td className="px-3 py-1.5 font-medium">{r.clienteNombre}</td>
                        <td className="px-3 py-1.5">{r.ordenNumero ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 border-t-2">
                      <td colSpan={4} className="px-3 py-1.5 text-right font-bold text-xs">SUBTOTAL {info?.label ?? estado}</td>
                      <td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatCurrency(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          <div className="bg-slate-800 text-white rounded-lg px-6 py-4 flex justify-between items-center">
            <p className="font-bold">TOTAL GENERAL · {totalCantidad} presupuestos</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalGeneral)}</p>
          </div>
        </div>
      )}
    </InformeLayout>
  );
}
