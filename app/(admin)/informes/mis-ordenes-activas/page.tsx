"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { getEstadoOrden, formatDate } from "@/lib/constants";

interface Row { id: string; numero: string; estado: string; fechaIngreso: string; tipoEquipo: string; modelo: string | null; clienteNombre: string; marcaNombre: string | null; ultimoMovimiento: string; diasSinMovimiento: number; }

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch("/api/informes/mis-ordenes-activas");
    const data = await res.json();
    setRows(data.rows); setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado ? `${rows.length} orden${rows.length !== 1 ? "es" : ""} activa${rows.length !== 1 ? "s" : ""} asignadas · Ordenadas por días sin movimiento` : undefined;

  const printTable = (
    <table className="data">
      <thead><tr>
        <th>N° Orden</th><th>Cliente</th><th>Equipo</th><th>Estado</th><th className="center">Ingreso</th><th className="center">Últ. mov.</th><th className="center">Días</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.diasSinMovimiento > 14 ? "danger" : r.diasSinMovimiento > 7 ? "warn" : i % 2 === 1 ? "alt" : ""}>
            <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{r.numero}</td>
            <td>{r.clienteNombre}</td>
            <td>{r.marcaNombre ? `${r.marcaNombre} ` : ""}{r.modelo ?? ""}</td>
            <td>{getEstadoOrden(r.estado)?.label ?? r.estado}</td>
            <td className="center">{formatDate(r.fechaIngreso)}</td>
            <td className="center">{formatDate(r.ultimoMovimiento)}</td>
            <td className="center" style={{ fontWeight: "bold" }}>{r.diasSinMovimiento}</td>
          </tr>
        ))}
        <tr className="total"><td colSpan={7}>{rows.length} órdenes activas · Rojo: +14 días sin movimiento · Amarillo: +7 días</td></tr>
      </tbody>
    </table>
  );

  return (
    <InformeLayout titulo="Mis Órdenes Activas" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex gap-3 items-end mb-2">
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Consultando…" : "Consultar"}</Button>
      </div>
      <p className="text-xs text-gray-500">Muestra tus órdenes en curso, ordenadas por días sin movimiento.</p>

      {buscado && (
        <div className="border rounded overflow-hidden text-sm">
          <div className="grid bg-gray-100 font-semibold text-gray-600 text-xs px-3 py-2" style={{ gridTemplateColumns: "7rem 1fr 1fr 8rem 6rem 6rem 4rem" }}>
            <div>N° Orden</div><div>Cliente</div><div>Equipo</div><div>Estado</div><div className="text-center">Ingreso</div><div className="text-center">Últ. mov.</div><div className="text-center">Días</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid px-3 py-2 border-t text-xs items-center ${r.diasSinMovimiento > 14 ? "bg-red-50" : r.diasSinMovimiento > 7 ? "bg-yellow-50" : i % 2 === 1 ? "bg-gray-50" : ""}`} style={{ gridTemplateColumns: "7rem 1fr 1fr 8rem 6rem 6rem 4rem" }}>
              <div className="font-mono font-bold">{r.numero}</div>
              <div className="font-medium truncate">{r.clienteNombre}</div>
              <div className="truncate">{r.marcaNombre ? `${r.marcaNombre} ` : ""}{r.modelo ?? ""}</div>
              <div>{getEstadoOrden(r.estado)?.label ?? r.estado}</div>
              <div className="text-center">{formatDate(r.fechaIngreso)}</div>
              <div className="text-center">{formatDate(r.ultimoMovimiento)}</div>
              <div className={`text-center font-bold ${r.diasSinMovimiento > 14 ? "text-red-600" : r.diasSinMovimiento > 7 ? "text-orange-500" : ""}`}>{r.diasSinMovimiento}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">No tenés órdenes activas asignadas</div>}
          {rows.length > 0 && <div className="px-3 py-2 border-t bg-gray-100 text-xs font-semibold">{rows.length} órdenes activas</div>}
        </div>
      )}
    </InformeLayout>
  );
}
