"use client";
import { useState } from "react";
import { InformeLayout } from "@/components/informe-layout";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/constants";

interface Row { descripcion: string; numeroParte: string | null; categoria: string; stock: number; precioVenta: number; precioCosto: number; valorVenta: number; valorCosto: number; }

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totales, setTotales] = useState({ venta: 0, costo: 0 });
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  async function buscar() {
    setLoading(true);
    const res = await fetch("/api/informes/valorizacion");
    const data = await res.json();
    setRows(data.rows); setTotales({ venta: data.totalVenta, costo: data.totalCosto });
    setBuscado(true); setLoading(false);
  }

  const filtrosTexto = buscado ? `Valor a costo: ${formatCurrency(totales.costo)}  ·  Valor a venta: ${formatCurrency(totales.venta)}  ·  ${rows.length} artículos en stock` : undefined;

  const printTable = (
    <table className="data">
      <thead><tr>
        <th>Repuesto</th><th>Categoría</th><th className="center">Stock</th><th className="right">P. Costo</th><th className="right">P. Venta</th><th className="right">Valor costo</th><th className="right">Valor venta</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
            <td>
              <div style={{ fontWeight: "500" }}>{r.descripcion}</div>
              {r.numeroParte && <div style={{ color: "#6b7280", fontSize: "0.85em" }}>{r.numeroParte}</div>}
            </td>
            <td>{r.categoria}</td>
            <td className="center" style={{ fontWeight: "bold", color: r.stock === 0 ? "#ef4444" : "inherit" }}>{r.stock}</td>
            <td className="right">{formatCurrency(r.precioCosto)}</td>
            <td className="right">{formatCurrency(r.precioVenta)}</td>
            <td className="right">{formatCurrency(r.valorCosto)}</td>
            <td className="right" style={{ fontWeight: "600" }}>{formatCurrency(r.valorVenta)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr>
        <td colSpan={5}>TOTAL</td>
        <td className="right">{formatCurrency(totales.costo)}</td>
        <td className="right">{formatCurrency(totales.venta)}</td>
      </tr></tfoot>
    </table>
  );

  return (
    <InformeLayout titulo="Valorización de Stock" filtrosTexto={filtrosTexto} printTable={printTable}>
      <div className="flex gap-3 items-end mb-2">
        <Button onClick={buscar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? "Calculando…" : "Calcular"}</Button>
      </div>

      {buscado && (
        <>
          <div className="flex gap-6 text-sm mb-2 font-semibold">
            <span>Valor a costo: <span className="text-blue-700">{formatCurrency(totales.costo)}</span></span>
            <span>Valor a venta: <span className="text-green-700">{formatCurrency(totales.venta)}</span></span>
          </div>
          <div className="border rounded overflow-hidden text-xs overflow-x-auto">
            <div className="grid grid-cols-7 bg-gray-100 font-semibold text-gray-600 px-3 py-2 min-w-[700px]">
              <div className="col-span-2">Repuesto</div><div>Categoría</div><div className="text-center">Stock</div><div className="text-right">P. Costo</div><div className="text-right">P. Venta</div><div className="text-right">Valor venta</div>
            </div>
            {rows.map((r, i) => (
              <div key={i} className={`grid grid-cols-7 px-3 py-1.5 border-t items-center min-w-[700px] ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                <div className="col-span-2">
                  <div className="font-medium">{r.descripcion}</div>
                  {r.numeroParte && <div className="text-gray-400">{r.numeroParte}</div>}
                </div>
                <div>{r.categoria}</div>
                <div className={`text-center font-bold ${r.stock === 0 ? "text-red-500" : ""}`}>{r.stock}</div>
                <div className="text-right">{formatCurrency(r.precioCosto)}</div>
                <div className="text-right">{formatCurrency(r.precioVenta)}</div>
                <div className="text-right font-semibold">{formatCurrency(r.valorVenta)}</div>
              </div>
            ))}
            {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400">Sin repuestos en stock</div>}
            <div className="grid grid-cols-7 px-3 py-2 border-t bg-gray-100 font-bold min-w-[700px]">
              <div className="col-span-3">TOTAL</div><div /><div className="text-right">{formatCurrency(totales.costo)}</div><div className="text-right">{formatCurrency(totales.venta)}</div><div />
            </div>
          </div>
        </>
      )}
    </InformeLayout>
  );
}
