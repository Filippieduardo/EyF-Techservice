"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, Printer, AlertTriangle, LogOut, CheckCircle, XCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { getTipoEquipo, formatDate, formatCurrency } from "@/lib/constants";

// ── Estilos de estado de orden (idénticos a lib/constants.ts) ────────────────
const ORDEN_ESTADO: Record<string, { color: string; label: string }> = {
  INGRESADO:          { color: "bg-green-600 text-white",            label: "INGRESADO" },
  EN_DIAGNOSTICO:     { color: "bg-green-600 text-white",            label: "EN DIAGNÓSTICO" },
  DIAGNOSTICADO:      { color: "bg-green-600 text-white",            label: "DIAGNOSTICADO" },
  ESPERANDO_REPUESTO: { color: "bg-purple-600 text-white",           label: "ESPERANDO REPUESTO" },
  EN_REPARACION:      { color: "bg-yellow-400 text-black",           label: "EN REPARACIÓN" },
  TERMINADO:          { color: "bg-sky-400 text-white",              label: "TERMINADO" },
  ENTREGADO:          { color: "bg-sky-400 text-white",              label: "ENTREGADO" },
  NO_REPARABLE:       { color: "bg-red-600 text-white",              label: "NO REPARABLE" },
  CANCELADO:          { color: "bg-red-600 text-white",              label: "CANCELADO" },
  RMA:                { color: "bg-orange-500 text-black font-bold", label: "RMA" },
};

// ── Estilos de estado de presupuesto ─────────────────────
const PRES_ESTADO: Record<string, { bg: string; label: string }> = {
  PENDIENTE: { bg: "bg-amber-500",  label: "Pendiente" },
  APROBADO:  { bg: "bg-green-600",  label: "Aprobado" },
  RECHAZADO: { bg: "bg-red-600",    label: "Rechazado" },
  VENCIDO:   { bg: "bg-gray-500",   label: "Vencido" },
};

function OrdenEstadoBadge({ estado }: { estado: string }) {
  const s = ORDEN_ESTADO[estado] ?? { color: "bg-gray-500 text-white", label: estado };
  return <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.color}`}>{s.label}</span>;
}

function PresEstadoBadge({ estado }: { estado: string }) {
  const s = PRES_ESTADO[estado] ?? { bg: "bg-gray-500", label: estado };
  return <span className={`text-xs px-3 py-1 rounded-full font-semibold text-white ${s.bg}`}>{s.label}</span>;
}

// ── Número a letras ───────────────────────────────────────
const UNIDADES = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve",
  "diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve"];
const DECENAS = ["","","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
const CENTENAS = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];

function menosDeМil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  if (n < 20) return UNIDADES[n];
  if (n < 30) return n === 20 ? "veinte" : "veinti" + UNIDADES[n - 20];
  if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return DECENAS[d] + (u ? " y " + UNIDADES[u] : ""); }
  const c = Math.floor(n / 100), resto = n % 100;
  return CENTENAS[c] + (resto ? " " + menosDeМil(resto) : "");
}

function numeroALetras(total: number): string {
  const entero = Math.floor(total);
  const centavos = Math.round((total - entero) * 100);
  if (entero === 0) return "cero";
  let res = "";
  const miles = Math.floor(entero / 1000), resto = entero % 1000;
  if (miles > 0) { res += miles === 1 ? "mil" : menosDeМil(miles) + " mil"; if (resto > 0) res += " "; }
  res += menosDeМil(resto);
  return res.trim() + (centavos > 0 ? ` con ${String(centavos).padStart(2, "0")}/100` : " con 00/100");
}

function fmtCuit(cuit: string | null | undefined): string {
  if (!cuit) return "";
  const d = cuit.replace(/[-\s]/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : cuit;
}

function calcVencimiento(fecha: string, dias: number): string {
  const d = new Date(fecha); d.setDate(d.getDate() + dias); return formatDate(d.toISOString());
}

// ── Interfaces ────────────────────────────────────────────
interface PresupuestoInline {
  id: string;
  numero: string;
  estado: string;
}

interface OrdenPortal {
  id: string;
  numero: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  numeroSerie: string | null;
  marca: string | null;
  fechaIngreso: string;
  fechaEstimada: string | null;
  observacionesCliente: string | null;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  historial: Array<{ estado: string; nota: string | null; createdAt: string }>;
  presupuesto: PresupuestoInline | null;
}

interface PresPortal {
  id: string; numero: string; estado: string;
  subtotal: number; descuento: number; total: number;
  fecha: string; validezDias: number; notas: string | null; observacionesCliente: string | null;
  clienteNombre: string; clienteCondicionIva: string;
  clienteTelefono: string | null; clienteDireccion: string | null; clienteDniCuit: string | null;
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; precioTotal: number }>;
  orden: { numero: string; modelo: string | null; marca: { nombre: string } | null } | null;
}

interface EmpresaData {
  nombre: string; domicilio: string | null; condicionIva: string;
  dniCuit: string | null; telefono: string | null; whatsapp: string | null;
  email: string | null; logoPath: string | null;
}

// ── Portal de impresión de presupuesto ───────────────────
function PrintPortal({ pres, empresa }: { pres: PresPortal; empresa: EmpresaData | null }) {
  const descuentoEfectivo = Number(pres.descuento);
  const subtotal = Number(pres.subtotal);
  const neto = subtotal - descuentoEfectivo;
  const inscripto = pres.clienteCondicionIva === "INSCRIPTO";
  const iva = inscripto ? neto * 0.21 : 0;
  const totalGeneral = neto + iva;

  const s: Record<string, React.CSSProperties> = {
    page: { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", background: "#fff", width: "100%", boxSizing: "border-box" },
    headerTable: { width: "100%", borderCollapse: "collapse", marginBottom: 0 },
    headerLeftCell: { padding: "8px 10px", verticalAlign: "top" as const, width: "65%" },
    headerRightCell: { borderLeft: "1px solid #000", padding: "6px 10px", verticalAlign: "top" as const, width: "35%" },
    empresaNombre: { fontWeight: "bold", fontSize: "14pt", marginBottom: "3px" },
    empresaDetalle: { fontSize: "8.5pt", lineHeight: "1.5", color: "#333" },
    presTitle: { fontWeight: "bold", fontSize: "13pt", textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0 4px", marginBottom: "6px" } as React.CSSProperties,
    presGrid: { width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" },
    presGridCell: { padding: "2px 4px", border: "none" },
    presGridLabel: { padding: "2px 4px", border: "none", color: "#555", fontWeight: "bold" as const },
    clienteBox: { borderTop: "1px solid #000", padding: "6px 10px", marginBottom: 0, fontSize: "9pt" },
    clienteLabel: { fontWeight: "bold", fontSize: "8.5pt", color: "#555" },
    clienteNombre: { fontWeight: "bold", fontSize: "11pt" },
    itemsTable: { width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", fontSize: "9pt" },
    thCell: { background: "#e8e8e8", fontWeight: "bold", padding: "5px 8px", border: "1px solid #bbb", fontSize: "8.5pt" },
    tdCell: { padding: "4px 8px", border: "none", borderBottom: "1px solid #e0e0e0", backgroundColor: "#fff" },
    footerTable: { width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", marginTop: 0, backgroundColor: "#fff" },
    footerLeft: { padding: "8px 10px", verticalAlign: "top", border: "none", borderRight: "1px solid #000", width: "55%", fontSize: "9pt", backgroundColor: "#fff" },
    footerRight: { padding: "4px 0", border: "none", width: "45%", fontSize: "9.5pt", backgroundColor: "#fff" },
    footerRow: { display: "flex", justifyContent: "space-between", padding: "2px 10px", borderBottom: "1px solid #e8e8e8", backgroundColor: "#fff" } as React.CSSProperties,
    footerTotal: { display: "flex", justifyContent: "space-between", padding: "5px 10px", fontWeight: "bold", fontSize: "11pt", backgroundColor: "#f0f0f0" } as React.CSSProperties,
  };

  const printStyle = `
    @media print {
      @page { size: A4 portrait; margin: 15mm 12mm; }
      html, body { background: #fff !important; }
      body > *:not(#print-portal-portal-pres) { display: none !important; }
      #print-portal-portal-pres { display: block !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    @media screen { #print-portal-portal-pres { display: none !important; } }
  `;

  return createPortal(
    <div id="print-portal-portal-pres">
      <style dangerouslySetInnerHTML={{ __html: printStyle }} />
      <div style={s.page}>
        <div style={{ border: "1px solid #000", boxSizing: "border-box", width: "100%" }}>

        <table style={s.headerTable}>
          <tbody><tr>
            <td style={s.headerLeftCell}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                {empresa?.logoPath && (
                  <img src={`${empresa.logoPath}?t=1`} alt="Logo" style={{ width: "60px", height: "60px", objectFit: "contain", flexShrink: 0 }} />
                )}
                <div>
                  <div style={s.empresaNombre}>{empresa?.nombre ?? "TechService"}</div>
                  <div style={s.empresaDetalle}>
                    {empresa?.domicilio && <div><strong>Domicilio:</strong> {empresa.domicilio}</div>}
                    {(empresa?.telefono || empresa?.whatsapp) && (
                      <div>
                        {empresa?.telefono && <><strong>Teléfono:</strong> {empresa.telefono}</>}
                        {empresa?.telefono && empresa?.whatsapp && "  ·  "}
                        {empresa?.whatsapp && <><strong>WhatsApp:</strong> {empresa.whatsapp}</>}
                      </div>
                    )}
                    {empresa?.email && <div><strong>E-Mail:</strong> {empresa.email}</div>}
                    <div>
                      <strong>I.V.A.:</strong> {empresa?.condicionIva ?? "INSCRIPTO"}
                      {empresa?.dniCuit && <>&nbsp;&nbsp;<strong>CUIT:</strong> {fmtCuit(empresa.dniCuit)}</>}
                    </div>
                  </div>
                </div>
              </div>
            </td>
            <td style={s.headerRightCell}>
              <div style={s.presTitle as React.CSSProperties}>PRESUPUESTO</div>
              <table style={s.presGrid}>
                <tbody>
                  <tr><td style={s.presGridLabel}>Comprobante N°</td><td style={{ ...s.presGridCell, fontWeight: "bold" }}>{pres.numero}</td></tr>
                  <tr><td style={s.presGridLabel}>Emisión</td><td style={s.presGridCell}>{formatDate(pres.fecha)}</td></tr>
                  <tr><td style={s.presGridLabel}>Vencimiento</td><td style={s.presGridCell}>{calcVencimiento(pres.fecha, pres.validezDias)}</td></tr>
                  <tr><td style={s.presGridLabel}>Validez</td><td style={s.presGridCell}>{pres.validezDias} días</td></tr>
                </tbody>
              </table>
            </td>
          </tr></tbody>
        </table>

        <div style={s.clienteBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={s.clienteLabel}>Presupuestado a:&nbsp;</span>
              <span style={s.clienteNombre}>{pres.clienteNombre}</span>
            </div>
            <span style={{ ...s.clienteNombre, background: "#000", color: "#fff", padding: "2px 10px", borderRadius: "3px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
              {PRES_ESTADO[pres.estado]?.label ?? pres.estado}
            </span>
          </div>
          <div style={{ marginTop: "3px", fontSize: "8.5pt", color: "#333", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {pres.clienteDireccion && <span><strong>Domicilio:</strong> {pres.clienteDireccion}</span>}
            {pres.clienteTelefono && <span><strong>Tel:</strong> {pres.clienteTelefono}</span>}
            {pres.clienteCondicionIva && <span><strong>Cond. IVA:</strong> {pres.clienteCondicionIva}</span>}
            {pres.clienteDniCuit && <span><strong>CUIT/DNI:</strong> {pres.clienteDniCuit}</span>}
            {pres.orden && (
              <span>
                <strong>Orden N°:</strong> {pres.orden.numero}
                {pres.orden.marca?.nombre ? " · " + pres.orden.marca.nombre : ""}
                {pres.orden.modelo ? " " + pres.orden.modelo : ""}
              </span>
            )}
          </div>
        </div>

        <table style={s.itemsTable}>
          <thead>
            <tr>
              <th style={{ ...s.thCell, textAlign: "left", width: "55%" }}>Descripción</th>
              <th style={{ ...s.thCell, textAlign: "center", width: "8%" }}>Cant.</th>
              <th style={{ ...s.thCell, textAlign: "right", width: "18%" }}>Precio Unitario</th>
              <th style={{ ...s.thCell, textAlign: "right", width: "19%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pres.items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                <td style={{ ...s.tdCell, textAlign: "left" }}>{item.descripcion}</td>
                <td style={{ ...s.tdCell, textAlign: "center" }}>{item.cantidad}</td>
                <td style={{ ...s.tdCell, textAlign: "right" }}>{formatCurrency(item.precioUnitario)}</td>
                <td style={{ ...s.tdCell, textAlign: "right" }}>{formatCurrency(item.precioTotal)}</td>
              </tr>
            ))}
            {pres.items.length < 8 && Array.from({ length: Math.max(0, 8 - pres.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ ...s.tdCell, height: "20px" }}>&nbsp;</td>
                <td style={s.tdCell}></td><td style={s.tdCell}></td><td style={s.tdCell}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={s.footerTable}>
          <tbody><tr>
            <td style={s.footerLeft}>
              <div style={{ fontStyle: "italic", fontSize: "8.5pt", color: "#555", marginBottom: "4px" }}>Son Pesos:</div>
              <div style={{ fontWeight: "bold", fontSize: "9pt" }}>
                {numeroALetras(totalGeneral).charAt(0).toUpperCase() + numeroALetras(totalGeneral).slice(1)}.--
              </div>
              {pres.observacionesCliente && (
                <div style={{ marginTop: "8px", fontSize: "8pt", color: "#333", borderTop: "1px solid #ddd", paddingTop: "4px" }}>
                  <strong>Observaciones:</strong> {pres.observacionesCliente}
                </div>
              )}
              {pres.notas && (
                <div style={{ marginTop: "8px", fontSize: "8pt", color: "#444", borderTop: "1px solid #ddd", paddingTop: "4px" }}>
                  <strong>Notas:</strong> {pres.notas}
                </div>
              )}
            </td>
            <td style={{ padding: 0, verticalAlign: "top", border: "none", backgroundColor: "#fff" }}>
              <div style={s.footerRow}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div style={s.footerRow}><span>Descuento</span><span>{formatCurrency(descuentoEfectivo)}</span></div>
              <div style={s.footerRow}><span>Neto Gravado</span><span>{formatCurrency(neto)}</span></div>
              <div style={s.footerRow}><span>IVA {inscripto ? "21%" : "(no aplica)"}</span><span>{formatCurrency(iva)}</span></div>
              <div style={s.footerTotal}><span>TOTAL</span><span>{formatCurrency(totalGeneral)}</span></div>
            </td>
          </tr></tbody>
        </table>

        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Página principal ──────────────────────────────────────
export default function PortalPage() {
  const [ordenes, setOrdenes] = useState<OrdenPortal[]>([]);
  const [presupuestosMap, setPresupuestosMap] = useState<Map<string, PresPortal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [printingPres, setPrintingPres] = useState<PresPortal | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; accion: "APROBADO" | "RECHAZADO" } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/empresa").then(r => r.ok ? r.json() : null).then(setEmpresa).catch(() => {});
  }, []);

  async function fetchData() {
    const [resO, resP] = await Promise.all([
      fetch("/api/portal/ordenes"),
      fetch("/api/portal/presupuestos"),
    ]);
    if (resO.ok) setOrdenes(await resO.json());
    if (resP.ok) {
      const list: PresPortal[] = await resP.json();
      setPresupuestosMap(new Map(list.map(p => [p.id, p])));
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (printingPres) {
      const t = setTimeout(() => { window.print(); setPrintingPres(null); }, 80);
      return () => clearTimeout(t);
    }
  }, [printingPres]);

  async function confirmarYResponder() {
    if (!confirm) return;
    const { id, accion } = confirm;
    setConfirm(null);
    const res = await fetch("/api/portal/presupuestos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion }),
    });
    if (res.ok) {
      toast.success(accion === "APROBADO" ? "Presupuesto aprobado" : "Presupuesto rechazado");
      fetchData();
    } else {
      toast.error("Error al procesar");
    }
  }

  function handleImprimir(presId: string) {
    const pres = presupuestosMap.get(presId);
    if (pres) setPrintingPres(pres);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <>
      {mounted && printingPres && <PrintPortal pres={printingPres} empresa={empresa} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis Equipos</h1>
            <p className="text-gray-500 text-sm">Consultá el estado de tus equipos y presupuestos</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => signOut({ callbackUrl: "/portal/login" })}>
            <LogOut className="h-4 w-4" />Salir
          </Button>
        </div>

        {ordenes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No tenés órdenes registradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ordenes.map((o) => (
              <Card key={o.id} className="overflow-hidden">
                {/* ── Cabecera de la card ── */}
                <CardHeader className="pb-0" style={{ background: "oklch(0.38 0.14 292)" }}>
                  <div className="flex items-start justify-between flex-wrap gap-2 pb-3">
                    <div className="space-y-1">
                      {/* Nro orden + estado */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl font-mono text-white tracking-wide">{o.numero}</CardTitle>
                        <OrdenEstadoBadge estado={o.estado} />
                      </div>
                      {/* Equipo */}
                      <p className="text-sm font-medium text-white">
                        {getTipoEquipo(o.tipoEquipo)}
                        {o.marca ? ` · ${o.marca}` : ""}
                        {o.modelo ? ` ${o.modelo}` : ""}
                        {o.numeroSerie ? <span className="opacity-75"> · SN: {o.numeroSerie}</span> : ""}
                      </p>
                      {/* Fechas */}
                      <p className="text-xs" style={{ color: "oklch(0.85 0.05 292)" }}>
                        Ingreso: <span className="text-white font-medium">{formatDate(o.fechaIngreso)}</span>
                        {o.fechaEstimada && (
                          <> · Estimado: <span className="text-white font-medium">{formatDate(o.fechaEstimada)}</span></>
                        )}
                      </p>
                      {/* Presupuesto inline */}
                      {o.presupuesto && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-xs font-medium" style={{ color: "oklch(0.85 0.05 292)" }}>Presupuesto:</span>
                          <Link href={`/portal/presupuesto/${o.presupuesto.id}`} className="text-xl font-mono text-white tracking-wide hover:underline underline-offset-2">
                            {o.presupuesto.numero}
                          </Link>
                          <PresEstadoBadge estado={o.presupuesto.estado} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  {o.observacionesCliente && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                      <p className="font-semibold text-xs text-blue-600 mb-1">Observaciones:</p>
                      {o.observacionesCliente}
                    </div>
                  )}
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-800">
                    <p className="font-semibold text-xs text-gray-500 mb-1">Diagnóstico:</p>
                    {o.diagnostico
                      ? <span>{o.diagnostico}</span>
                      : <span className="text-gray-400 italic">Sin diagnóstico registrado</span>}
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900">
                    <p className="font-semibold text-xs text-green-600 mb-1">Trabajo Realizado:</p>
                    {o.trabajoRealizado
                      ? <span>{o.trabajoRealizado}</span>
                      : <span className="text-green-700 italic opacity-60">Sin trabajo registrado aún</span>}
                  </div>

                  {o.historial.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Historial reciente:</p>
                      <div className="space-y-1.5">
                        {o.historial.map((h, i) => {
                          const s = ORDEN_ESTADO[h.estado] ?? { color: "bg-gray-500 text-white", label: h.estado };
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${s.color}`}>{s.label}</span>
                              {h.nota && <span className="text-gray-700">{h.nota}</span>}
                              <span className="text-gray-500 ml-auto flex-shrink-0 font-medium">{formatDate(h.createdAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Acciones presupuesto */}
                  {o.presupuesto && (
                    <div className="flex gap-2 pt-1 border-t">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleImprimir(o.presupuesto!.id)}>
                        <Printer className="h-4 w-4" />Imprimir presupuesto
                      </Button>
                      {o.presupuesto.estado === "PENDIENTE" && (
                        <>
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 gap-1.5" onClick={() => setConfirm({ id: o.presupuesto!.id, accion: "APROBADO" })}>
                            <CheckCircle className="h-4 w-4" />Aprobar
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => setConfirm({ id: o.presupuesto!.id, accion: "RECHAZADO" })}>
                            <XCircle className="h-4 w-4" />Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {confirm.accion === "APROBADO" ? "¿Aprobar presupuesto?" : "¿Rechazar presupuesto?"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Atención:</strong> una vez que confirmes este cambio, el estado del presupuesto no podrá volver a modificarse.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancelar</Button>
              {confirm.accion === "APROBADO" ? (
                <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={confirmarYResponder}>
                  <CheckCircle className="h-4 w-4" />Confirmar aprobación
                </Button>
              ) : (
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2" onClick={confirmarYResponder}>
                  <XCircle className="h-4 w-4" />Confirmar rechazo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
