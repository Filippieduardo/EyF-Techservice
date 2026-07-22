"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarcaSelect } from "@/components/marca-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, AlertTriangle, Printer } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { useEmpresa } from "@/lib/empresa-context";

interface Repuesto {
  id: string;
  descripcion: string;
  numeroParte: string | null;
  stockActual: number;
  stockMinimo: number;
  precioVenta: number;
  marca: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string } | null;
}

type StockFiltro = "todos" | "ok" | "bajo" | "sin";

const FILTRO_LABELS: Record<StockFiltro, string> = {
  todos: "Todos los estados",
  ok:    "Stock OK",
  bajo:  "Stock Bajo",
  sin:   "Sin Stock",
};

export default function ConsultaStockPage() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [marcaFiltro, setMarcaFiltro] = useState("");
  const [stockFiltro, setStockFiltro] = useState<StockFiltro>("todos");
  const [mounted, setMounted] = useState(false);
  const empresa = useEmpresa();

  useEffect(() => { setMounted(true); }, []);

  async function fetchRepuestos(query = q, marca = marcaFiltro) {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (marca && marca !== "none") params.set("marcaId", marca);
    const res = await fetch(`/api/repuestos?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setRepuestos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchRepuestos(); }, []);

  const filtered = repuestos.filter(r => {
    if (stockFiltro === "sin")  return r.stockActual === 0;
    if (stockFiltro === "bajo") return r.stockActual > 0 && r.stockActual <= r.stockMinimo;
    if (stockFiltro === "ok")   return r.stockActual > r.stockMinimo;
    return true;
  });

  const totalUnidades = filtered.reduce((s, r) => s + r.stockActual, 0);
  const conStockBajo  = filtered.filter(r => r.stockActual <= r.stockMinimo).length;
  const fechaHoy      = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const printContent = (
    <div id="print-portal" style={{ display: "none", fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#000" }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html, body { background: #fff !important; }
          body > *:not(#print-portal) { display: none !important; }
          #print-portal { display: block !important; }
          #print-portal table { border-collapse: collapse; width: 100%; font-size: 11pt; }
          #print-portal th, #print-portal td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
          #print-portal th { background: #e8e8e8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-portal td.center { text-align: center; }
          #print-portal td.right { text-align: right; }
          #print-portal .sin-row td { background: #ffe4e4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-portal .bajo-row td { background: #fff8e1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-portal tfoot td { background: #e8e8e8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-portal a { color: #000 !important; text-decoration: none !important; }
        }
      `}</style>
      {/* Encabezado empresa */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", border: "none" }}>
        <tbody>
          <tr>
            {empresa?.logoPath && (
              <td style={{ width: "70px", verticalAlign: "middle", border: "none", padding: "0 10px 0 0" }}>
                <img src={empresa.logoPath} alt="Logo" style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain" }} />
              </td>
            )}
            <td style={{ verticalAlign: "middle", border: "none", padding: 0 }}>
              <div style={{ fontSize: "14pt", fontWeight: "bold" }}>{empresa?.nombre ?? ""}</div>
              {empresa?.domicilio  && <div style={{ fontSize: "9pt", color: "#444" }}>{empresa.domicilio}</div>}
              {empresa?.dniCuit    && <div style={{ fontSize: "9pt", color: "#444" }}>CUIT: {empresa.dniCuit}</div>}
              {empresa?.condicionIva && <div style={{ fontSize: "9pt", color: "#444" }}>Cond. IVA: {empresa.condicionIva}</div>}
              <div style={{ fontSize: "9pt", color: "#444" }}>
                {[empresa?.telefono && `Tel: ${empresa.telefono}`, empresa?.whatsapp && `WhatsApp: ${empresa.whatsapp}`, empresa?.email].filter(Boolean).join("  ·  ")}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <hr style={{ borderTop: "2px solid #555", marginBottom: "8px" }} />
      <h1 style={{ fontSize: "13pt", fontWeight: "bold", marginBottom: "3px" }}>Consulta de Stock</h1>
      <p style={{ fontSize: "9pt", color: "#555", marginBottom: "8px" }}>
        Fecha de emisión: {fechaHoy}
        {stockFiltro !== "todos" ? ` · Filtro: ${FILTRO_LABELS[stockFiltro]}` : ""}
        {" · "}{filtered.length} repuesto{filtered.length !== 1 ? "s" : ""}
        {" · "}{totalUnidades} unidades en stock
        {conStockBajo > 0 ? ` · ${conStockBajo} con stock bajo` : ""}
      </p>
      <hr style={{ borderTop: "1px solid #aaa", marginBottom: "10px" }} />
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>N° Parte</th>
            <th>Marca</th>
            <th>Categoría</th>
            <th style={{ textAlign: "center" }}>Stock Actual</th>
            <th style={{ textAlign: "center" }}>Stock Mín.</th>
            <th style={{ textAlign: "center" }}>Estado</th>
            <th style={{ textAlign: "right" }}>P. Venta</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => {
            const sinStock = r.stockActual === 0;
            const bajo = !sinStock && r.stockActual <= r.stockMinimo;
            return (
              <tr key={r.id} className={sinStock ? "sin-row" : bajo ? "bajo-row" : ""}>
                <td>{r.descripcion}</td>
                <td>{r.numeroParte ?? "—"}</td>
                <td>{r.marca?.nombre ?? "—"}</td>
                <td>{r.categoria?.nombre ?? "—"}</td>
                <td className="center" style={{ fontWeight: "bold", color: sinStock ? "#c00" : bajo ? "#b45000" : "#1a7a1a" }}>
                  {r.stockActual}
                </td>
                <td className="center">{r.stockMinimo}</td>
                <td className="center">{sinStock ? "Sin Stock" : bajo ? "Stock Bajo" : "OK"}</td>
                <td className="right">{formatCurrency(r.precioVenta)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>Total ({filtered.length} repuestos)</td>
            <td className="center">{totalUnidades}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      {mounted && createPortal(printContent, document.body)}

      <div className="p-4 md:p-6 space-y-4 max-w-6xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Consulta de Stock
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? "Cargando..." : `${filtered.length} repuesto${filtered.length !== 1 ? "s" : ""} · ${totalUnidades} unidades${conStockBajo > 0 ? ` · ${conStockBajo} con stock bajo` : ""}`}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()} disabled={loading || filtered.length === 0}>
            <Printer className="h-4 w-4 mr-2" />Imprimir
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 w-64"
              placeholder="Buscar descripción, número de parte..."
              value={q}
              onChange={e => { setQ(e.target.value); fetchRepuestos(e.target.value, marcaFiltro); }}
            />
          </div>
          <div className="w-48">
            <MarcaSelect
              value={marcaFiltro}
              onValueChange={v => { const m = v === "none" ? "" : (v ?? ""); setMarcaFiltro(m); fetchRepuestos(q, m); }}
              placeholder="Todas las marcas"
              hideAdd
            />
          </div>
          <Select value={stockFiltro} onValueChange={v => setStockFiltro(v as StockFiltro)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="ok">Stock OK</SelectItem>
              <SelectItem value="bajo">Stock Bajo</SelectItem>
              <SelectItem value="sin">Sin Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay repuestos para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase">
                  <th className="text-left px-3 py-2 font-medium">Descripción</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">N° Parte</th>
                  <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Marca</th>
                  <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Categoría</th>
                  <th className="text-center px-3 py-2 font-medium">Stock Actual</th>
                  <th className="text-center px-3 py-2 font-medium">Stock Mín.</th>
                  <th className="text-center px-3 py-2 font-medium hidden sm:table-cell">Estado</th>
                  <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">P. Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(r => {
                  const sinStock = r.stockActual === 0;
                  const bajo = !sinStock && r.stockActual <= r.stockMinimo;
                  return (
                    <tr key={r.id} className={`hover:bg-muted/40 transition-colors ${sinStock ? "bg-red-50 dark:bg-red-950/20" : bajo ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/repuestos/${r.id}`} className="hover:underline text-primary flex items-center gap-1">
                          {(sinStock || bajo) && <AlertTriangle className={`h-3 w-3 flex-shrink-0 ${sinStock ? "text-red-500" : "text-amber-500"}`} />}
                          {r.descripcion}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{r.numeroParte ?? "—"}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        {r.marca ? <Badge variant="outline" className="text-xs">{r.marca.nombre}</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        {r.categoria ? <Badge variant="secondary" className="text-xs">{r.categoria.nombre}</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-bold ${sinStock ? "text-red-600" : bajo ? "text-amber-600" : "text-green-600"}`}>{r.stockActual}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{r.stockMinimo}</td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        {sinStock
                          ? <Badge variant="destructive" className="text-xs">Sin Stock</Badge>
                          : bajo
                            ? <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Stock Bajo</Badge>
                            : <Badge variant="secondary" className="text-xs text-green-700">OK</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right hidden sm:table-cell">{formatCurrency(r.precioVenta)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted text-xs border-t font-semibold">
                  <td colSpan={4} className="px-3 py-2">Total ({filtered.length} repuestos)</td>
                  <td className="px-3 py-2 text-center">{totalUnidades}</td>
                  <td colSpan={3} className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
