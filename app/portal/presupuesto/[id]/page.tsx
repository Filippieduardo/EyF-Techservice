"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/constants";

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

const PRES_ESTADO: Record<string, { bg: string; label: string }> = {
  PENDIENTE: { bg: "bg-amber-500",  label: "Pendiente" },
  APROBADO:  { bg: "bg-green-600",  label: "Aprobado" },
  RECHAZADO: { bg: "bg-red-600",    label: "Rechazado" },
  VENCIDO:   { bg: "bg-gray-500",   label: "Vencido" },
};

// ── Número a letras ───────────────────────────────────────
const UNIDADES = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve",
  "diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve"];
const DECENAS = ["","","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
const CENTENAS = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];
function menosDeМil(n: number): string {
  if (n === 0) return ""; if (n === 100) return "cien"; if (n < 20) return UNIDADES[n];
  if (n < 30) return n === 20 ? "veinte" : "veinti" + UNIDADES[n - 20];
  if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return DECENAS[d] + (u ? " y " + UNIDADES[u] : ""); }
  const c = Math.floor(n / 100), resto = n % 100; return CENTENAS[c] + (resto ? " " + menosDeМил(resto) : "");
}
function menosDeМил(n: number): string { return menosDeМil(n); }
function numeroALetras(total: number): string {
  const entero = Math.floor(total), centavos = Math.round((total - entero) * 100);
  if (entero === 0) return "cero";
  let res = ""; const miles = Math.floor(entero / 1000), resto = entero % 1000;
  if (miles > 0) { res += miles === 1 ? "mil" : menosDeМil(miles) + " mil"; if (resto > 0) res += " "; }
  res += menosDeМil(resto);
  return res.trim() + (centavos > 0 ? ` con ${String(centavos).padStart(2, "0")}/100` : " con 00/100");
}
function fmtCuit(cuit: string | null | undefined): string {
  if (!cuit) return ""; const d = cuit.replace(/[-\s]/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : cuit;
}
function calcVencimiento(fecha: string, dias: number): string {
  const d = new Date(fecha); d.setDate(d.getDate() + dias); return formatDate(d.toISOString());
}

// ── Portal de impresión ───────────────────────────────────
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
    presTitle: { fontWeight: "bold", fontSize: "13pt", textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0", marginBottom: "6px" } as React.CSSProperties,
    presGrid: { width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" },
    presGridCell: { padding: "2px 4px", border: "none" },
    presGridLabel: { padding: "2px 4px", border: "none", color: "#555", fontWeight: "bold" as const },
    clienteBox: { borderTop: "1px solid #000", padding: "6px 10px", fontSize: "9pt" },
    clienteLabel: { fontWeight: "bold", fontSize: "8.5pt", color: "#555" },
    clienteNombre: { fontWeight: "bold", fontSize: "11pt" },
    itemsTable: { width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", fontSize: "9pt" },
    thCell: { background: "#e8e8e8", fontWeight: "bold", padding: "5px 8px", border: "1px solid #bbb", fontSize: "8.5pt" },
    tdCell: { padding: "4px 8px", border: "none", borderBottom: "1px solid #e0e0e0", backgroundColor: "#fff" },
    footerTable: { width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", backgroundColor: "#fff" },
    footerLeft: { padding: "8px 10px", verticalAlign: "top", border: "none", borderRight: "1px solid #000", width: "55%", fontSize: "9pt", backgroundColor: "#fff" },
    footerRow: { display: "flex", justifyContent: "space-between", padding: "2px 10px", borderBottom: "1px solid #e8e8e8", backgroundColor: "#fff" } as React.CSSProperties,
    footerTotal: { display: "flex", justifyContent: "space-between", padding: "5px 10px", fontWeight: "bold", fontSize: "11pt", backgroundColor: "#f0f0f0" } as React.CSSProperties,
  };

  const printStyle = `
    @media print {
      @page { size: A4 portrait; margin: 15mm 12mm; }
      html, body { background: #fff !important; }
      body > *:not(#print-portal-pres-detail) { display: none !important; }
      #print-portal-pres-detail { display: block !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    @media screen { #print-portal-pres-detail { display: none !important; } }
  `;

  return createPortal(
    <div id="print-portal-pres-detail">
      <style dangerouslySetInnerHTML={{ __html: printStyle }} />
      <div style={s.page}>
        <div style={{ border: "1px solid #000", boxSizing: "border-box", width: "100%" }}>
          <table style={s.headerTable}><tbody><tr>
            <td style={s.headerLeftCell}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                {empresa?.logoPath && <img src={`${empresa.logoPath}?t=1`} alt="Logo" style={{ width: "60px", height: "60px", objectFit: "contain", flexShrink: 0 }} />}
                <div>
                  <div style={s.empresaNombre}>{empresa?.nombre ?? "TechService"}</div>
                  <div style={s.empresaDetalle}>
                    {empresa?.domicilio && <div><strong>Domicilio:</strong> {empresa.domicilio}</div>}
                    {(empresa?.telefono || empresa?.whatsapp) && <div>{empresa?.telefono && <><strong>Teléfono:</strong> {empresa.telefono}</>}{empresa?.telefono && empresa?.whatsapp && "  ·  "}{empresa?.whatsapp && <><strong>WhatsApp:</strong> {empresa.whatsapp}</>}</div>}
                    {empresa?.email && <div><strong>E-Mail:</strong> {empresa.email}</div>}
                    <div><strong>I.V.A.:</strong> {empresa?.condicionIva ?? "INSCRIPTO"}{empresa?.dniCuit && <>&nbsp;&nbsp;<strong>CUIT:</strong> {fmtCuit(empresa.dniCuit)}</>}</div>
                  </div>
                </div>
              </div>
            </td>
            <td style={s.headerRightCell}>
              <div style={s.presTitle as React.CSSProperties}>PRESUPUESTO</div>
              <table style={s.presGrid}><tbody>
                <tr><td style={s.presGridLabel}>Comprobante N°</td><td style={{ ...s.presGridCell, fontWeight: "bold" }}>{pres.numero}</td></tr>
                <tr><td style={s.presGridLabel}>Emisión</td><td style={s.presGridCell}>{formatDate(pres.fecha)}</td></tr>
                <tr><td style={s.presGridLabel}>Vencimiento</td><td style={s.presGridCell}>{calcVencimiento(pres.fecha, pres.validezDias)}</td></tr>
                <tr><td style={s.presGridLabel}>Validez</td><td style={s.presGridCell}>{pres.validezDias} días</td></tr>
              </tbody></table>
            </td>
          </tr></tbody></table>

          <div style={s.clienteBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div><span style={s.clienteLabel}>Presupuestado a:&nbsp;</span><span style={s.clienteNombre}>{pres.clienteNombre}</span></div>
              <span style={{ ...s.clienteNombre, background: "#000", color: "#fff", padding: "2px 10px", borderRadius: "3px" } as React.CSSProperties}>{PRES_ESTADO[pres.estado]?.label ?? pres.estado}</span>
            </div>
            <div style={{ marginTop: "3px", fontSize: "8.5pt", color: "#333", display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {pres.clienteDireccion && <span><strong>Domicilio:</strong> {pres.clienteDireccion}</span>}
              {pres.clienteTelefono && <span><strong>Tel:</strong> {pres.clienteTelefono}</span>}
              {pres.clienteCondicionIva && <span><strong>Cond. IVA:</strong> {pres.clienteCondicionIva}</span>}
              {pres.clienteDniCuit && <span><strong>CUIT/DNI:</strong> {pres.clienteDniCuit}</span>}
              {pres.orden && <span><strong>Orden N°:</strong> {pres.orden.numero}{pres.orden.marca?.nombre ? " · " + pres.orden.marca.nombre : ""}{pres.orden.modelo ? " " + pres.orden.modelo : ""}</span>}
            </div>
          </div>

          <table style={s.itemsTable}>
            <thead><tr>
              <th style={{ ...s.thCell, textAlign: "left", width: "55%" }}>Descripción</th>
              <th style={{ ...s.thCell, textAlign: "center", width: "8%" }}>Cant.</th>
              <th style={{ ...s.thCell, textAlign: "right", width: "18%" }}>Precio Unitario</th>
              <th style={{ ...s.thCell, textAlign: "right", width: "19%" }}>Subtotal</th>
            </tr></thead>
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
                <tr key={`e${i}`}><td style={{ ...s.tdCell, height: "20px" }}>&nbsp;</td><td style={s.tdCell}></td><td style={s.tdCell}></td><td style={s.tdCell}></td></tr>
              ))}
            </tbody>
          </table>

          <table style={s.footerTable}><tbody><tr>
            <td style={s.footerLeft}>
              <div style={{ fontStyle: "italic", fontSize: "8.5pt", color: "#555", marginBottom: "4px" }}>Son Pesos:</div>
              <div style={{ fontWeight: "bold", fontSize: "9pt" }}>{numeroALetras(totalGeneral).charAt(0).toUpperCase() + numeroALetras(totalGeneral).slice(1)}.--</div>
              {pres.observacionesCliente && <div style={{ marginTop: "8px", fontSize: "8pt", color: "#333", borderTop: "1px solid #ddd", paddingTop: "4px" }}><strong>Observaciones:</strong> {pres.observacionesCliente}</div>}
              {pres.notas && <div style={{ marginTop: "8px", fontSize: "8pt", color: "#444", borderTop: "1px solid #ddd", paddingTop: "4px" }}><strong>Notas:</strong> {pres.notas}</div>}
            </td>
            <td style={{ padding: 0, verticalAlign: "top", border: "none", backgroundColor: "#fff" }}>
              <div style={s.footerRow}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div style={s.footerRow}><span>Descuento</span><span>{formatCurrency(descuentoEfectivo)}</span></div>
              <div style={s.footerRow}><span>Neto Gravado</span><span>{formatCurrency(neto)}</span></div>
              <div style={s.footerRow}><span>IVA {inscripto ? "21%" : "(no aplica)"}</span><span>{formatCurrency(iva)}</span></div>
              <div style={s.footerTotal}><span>TOTAL</span><span>{formatCurrency(totalGeneral)}</span></div>
            </td>
          </tr></tbody></table>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Página ────────────────────────────────────────────────
export default function PortalPresupuestoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pres, setPres] = useState<PresPortal | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [printing, setPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirm, setConfirm] = useState<"APROBADO" | "RECHAZADO" | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetch("/api/empresa").then(r => r.ok ? r.json() : null).then(setEmpresa); }, []);
  useEffect(() => {
    fetch(`/api/portal/presupuestos/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPres(data); else router.replace("/portal"); });
  }, [id]);

  useEffect(() => {
    if (printing) {
      const t = setTimeout(() => { window.print(); setPrinting(false); }, 80);
      return () => clearTimeout(t);
    }
  }, [printing]);

  async function responder() {
    if (!confirm || !pres) return;
    const accion = confirm;
    setConfirm(null);
    const res = await fetch("/api/portal/presupuestos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pres.id, accion }),
    });
    if (res.ok) {
      toast.success(accion === "APROBADO" ? "Presupuesto aprobado" : "Presupuesto rechazado");
      setPres(p => p ? { ...p, estado: accion } : p);
    } else {
      toast.error("Error al procesar");
    }
  }

  if (!pres) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  const descuentoEfectivo = Number(pres.descuento);
  const subtotal = Number(pres.subtotal);
  const neto = subtotal - descuentoEfectivo;
  const inscripto = pres.clienteCondicionIva === "INSCRIPTO";
  const iva = inscripto ? neto * 0.21 : 0;
  const totalGeneral = neto + iva;
  const estadoInfo = PRES_ESTADO[pres.estado] ?? { bg: "bg-gray-500", label: pres.estado };

  return (
    <>
      {mounted && printing && <PrintPortal pres={pres} empresa={empresa} />}

      <div className="space-y-4">
        {/* Cabecera */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-mono font-bold">{pres.numero}</h1>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold text-white ${estadoInfo.bg}`}>{estadoInfo.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(pres.fecha)} · Válido {pres.validezDias} días · Vence {calcVencimiento(pres.fecha, pres.validezDias)}
            </p>
            {pres.orden && (
              <p className="text-xs text-gray-400 mt-0.5">Orden: {pres.orden.numero}{pres.orden.marca?.nombre ? " · " + pres.orden.marca.nombre : ""}{pres.orden.modelo ? " " + pres.orden.modelo : ""}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />Volver
          </Button>
        </div>

        {/* Ítems */}
        <Card>
          <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded overflow-hidden">
              <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-2">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-center">Cant.</div>
                <div className="col-span-2 text-right">P. Unit.</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              {pres.items.map((item, i) => (
                <div key={i} className={`grid grid-cols-12 gap-1 text-sm px-3 py-2 border-t ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                  <div className="col-span-5">{item.descripcion}</div>
                  <div className="col-span-2 text-center">{item.cantidad}</div>
                  <div className="col-span-2 text-right text-gray-600">{formatCurrency(item.precioUnitario)}</div>
                  <div className="col-span-3 text-right font-medium">{formatCurrency(item.precioTotal)}</div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mt-4 border rounded overflow-hidden text-sm">
              <div className="flex justify-between px-4 py-1.5 text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between px-4 py-1.5 text-gray-500 border-t"><span>Descuento</span><span>{formatCurrency(descuentoEfectivo)}</span></div>
              <div className="flex justify-between px-4 py-1.5 text-gray-500 border-t"><span>Neto Gravado</span><span>{formatCurrency(neto)}</span></div>
              <div className="flex justify-between px-4 py-1.5 text-gray-500 border-t"><span>IVA {inscripto ? "21%" : "(no aplica)"}</span><span>{formatCurrency(iva)}</span></div>
              <div className="flex justify-between px-4 py-2 font-bold text-base bg-gray-100 border-t"><span>TOTAL</span><span>{formatCurrency(totalGeneral)}</span></div>
            </div>

            {pres.observacionesCliente && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700">
                <p className="font-semibold text-xs text-green-700 mb-1">Observaciones:</p>
                {pres.observacionesCliente}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPrinting(true)}>
            <Printer className="h-4 w-4" />Imprimir
          </Button>
          {pres.estado === "PENDIENTE" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={() => setConfirm("APROBADO")}>
                <CheckCircle className="h-4 w-4" />Aprobar
              </Button>
              <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => setConfirm("RECHAZADO")}>
                <XCircle className="h-4 w-4" />Rechazar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{confirm === "APROBADO" ? "¿Aprobar presupuesto?" : "¿Rechazar presupuesto?"}</h3>
                <p className="text-sm text-gray-500 mt-1"><strong>Atención:</strong> una vez que confirmes este cambio, el estado no podrá volver a modificarse.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancelar</Button>
              {confirm === "APROBADO"
                ? <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={responder}><CheckCircle className="h-4 w-4" />Confirmar aprobación</Button>
                : <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2" onClick={responder}><XCircle className="h-4 w-4" />Confirmar rechazo</Button>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}
