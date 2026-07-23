"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Printer, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ESTADOS_PRESUPUESTO, getEstadoPresupuesto, getTipoEquipo, formatDate, formatCurrency } from "@/lib/constants";
import { useEmpresa } from "@/lib/empresa-context";
import { useSession } from "next-auth/react";

interface Presupuesto {
  id: string;
  numero: string;
  estado: string;
  fecha: string;
  validezDias: number;
  subtotal: number;
  descuento: number;
  total: number;
  notas: string | null;
  observacionesCliente: string | null;
  cliente: { nombre: string; email: string | null; telefono: string | null; direccion: string | null; condicionIva?: string; dniCuit?: string | null };
  orden: { id: string; numero: string; tipoEquipo: string | null; modelo: string | null; numeroSerie: string | null; descripcionProblema: string | null; presupuestoAbonado: number | null; marca: { nombre: string } | null } | null;
  items: Array<{ id: string; descripcion: string; cantidad: number; precioUnitario: number; precioTotal: number }>;
}

// ──────────────────────────────────────────────
// Convierte número a palabras en español
// ──────────────────────────────────────────────
const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menosDeМil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  if (n < 20) return UNIDADES[n];
  if (n < 30) return n === 20 ? "veinte" : "veinti" + UNIDADES[n - 20];
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return DECENAS[d] + (u ? " y " + UNIDADES[u] : "");
  }
  const c = Math.floor(n / 100), resto = n % 100;
  return CENTENAS[c] + (resto ? " " + menosDeМil(resto) : "");
}

function numeroALetras(total: number): string {
  const entero = Math.floor(total);
  const centavos = Math.round((total - entero) * 100);
  if (entero === 0) return "cero";
  let resultado = "";
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  if (miles > 0) {
    resultado += (miles === 1 ? "mil" : menosDeМil(miles) + " mil");
    if (resto > 0) resultado += " ";
  }
  resultado += menosDeМil(resto);
  return resultado.trim() + (centavos > 0 ? ` con ${String(centavos).padStart(2, "0")}/100` : " con 00/100");
}

function fmtCuit(cuit: string | null | undefined): string {
  if (!cuit) return "";
  const d = cuit.replace(/[-\s]/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : cuit;
}

function calcVencimiento(fecha: string, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return formatDate(d.toISOString());
}

// ──────────────────────────────────────────────
// Componente de impresión (portal)
// ──────────────────────────────────────────────
function PrintPortal({ pres, empresa }: { pres: Presupuesto; empresa: ReturnType<typeof useEmpresa> }) {
  const descuentoEfectivo = Math.max(Number(pres.descuento), Number(pres.orden?.presupuestoAbonado ?? 0));
  const subtotal = Number(pres.subtotal);
  const neto = subtotal - descuentoEfectivo;
  const inscripto = pres.cliente.condicionIva === "INSCRIPTO";
  const iva = inscripto ? neto * 0.21 : 0;
  const totalGeneral = neto + iva;

  const s: Record<string, React.CSSProperties> = {
    page: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "10pt",
      color: "#000",
      background: "#fff",
      width: "100%",
      boxSizing: "border-box",
    },
    // ── Cabecera ──────────────────────────────
    headerTable: { width: "100%", borderCollapse: "collapse", marginBottom: 0 },
    headerLeftCell: { padding: "8px 10px", verticalAlign: "top" as const, width: "65%" },
    headerRightCell: { borderLeft: "1px solid #000", padding: "6px 10px", verticalAlign: "top" as const, width: "35%" },
    empresaNombre: { fontWeight: "bold", fontSize: "14pt", marginBottom: "3px" },
    empresaDetalle: { fontSize: "8.5pt", lineHeight: "1.5", color: "#333" },
    presTitle: { fontWeight: "bold", fontSize: "13pt", textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0 4px", marginBottom: "6px" } as React.CSSProperties,
    presGrid: { width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" },
    presGridCell: { padding: "2px 4px", border: "none" },
    presGridLabel: { padding: "2px 4px", border: "none", color: "#555", fontWeight: "bold" as const },
    // ── Cliente ───────────────────────────────
    clienteBox: { borderTop: "1px solid #000", padding: "6px 10px", marginBottom: 0, fontSize: "9pt" },
    clienteLabel: { fontWeight: "bold", fontSize: "8.5pt", color: "#555" },
    clienteNombre: { fontWeight: "bold", fontSize: "11pt" },
    // ── Tabla items ───────────────────────────
    itemsTable: { width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", fontSize: "9pt" },
    thCell: { background: "#e8e8e8", fontWeight: "bold", padding: "5px 8px", border: "1px solid #bbb", fontSize: "8.5pt" },
    tdCell: { padding: "4px 8px", border: "none", borderBottom: "1px solid #e0e0e0" },
    // ── Pie ───────────────────────────────────
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
      body > *:not(#print-portal-pres) { display: none !important; }
      #print-portal-pres { display: block !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    @media screen {
      #print-portal-pres { display: none !important; }
    }
  `;

  return createPortal(
    <div id="print-portal-pres">
      <style dangerouslySetInnerHTML={{ __html: printStyle }} />
      <div style={s.page}>
        <div style={{ border: "1px solid #000", boxSizing: "border-box", width: "100%" }}>

        {/* ── CABECERA ─────────────────────────── */}
        <table style={s.headerTable}>
          <tbody>
            <tr>
              {/* Datos empresa */}
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
              {/* Box PRESUPUESTO */}
              <td style={s.headerRightCell}>
                <div style={s.presTitle as React.CSSProperties}>PRESUPUESTO</div>
                <table style={s.presGrid}>
                  <tbody>
                    <tr>
                      <td style={s.presGridLabel}>Comprobante N°</td>
                      <td style={{ ...s.presGridCell, fontWeight: "bold" }}>{pres.numero}</td>
                    </tr>
                    <tr>
                      <td style={s.presGridLabel}>Emisión</td>
                      <td style={s.presGridCell}>{formatDate(pres.fecha)}</td>
                    </tr>
                    <tr>
                      <td style={s.presGridLabel}>Vencimiento</td>
                      <td style={s.presGridCell}>{calcVencimiento(pres.fecha, pres.validezDias)}</td>
                    </tr>
                    <tr>
                      <td style={s.presGridLabel}>Validez</td>
                      <td style={s.presGridCell}>{pres.validezDias} días</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DATOS DEL CLIENTE ────────────────── */}
        <div style={s.clienteBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={s.clienteLabel}>Presupuestado a:&nbsp;</span>
              <span style={s.clienteNombre}>{pres.cliente.nombre}</span>
            </div>
            <span style={{ ...s.clienteNombre, background: "#000", color: "#fff", padding: "2px 10px", borderRadius: "3px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>{getEstadoPresupuesto(pres.estado).label}</span>
          </div>
          <div style={{ marginTop: "3px", fontSize: "8.5pt", color: "#333", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {pres.cliente.direccion && <span><strong>Domicilio:</strong> {pres.cliente.direccion}</span>}
            {pres.cliente.telefono && <span><strong>Tel:</strong> {pres.cliente.telefono}</span>}
            {pres.cliente.condicionIva && <span><strong>Cond. IVA:</strong> {pres.cliente.condicionIva}</span>}
            {pres.cliente.dniCuit && <span><strong>CUIT/DNI:</strong> {pres.cliente.dniCuit}</span>}
            {pres.orden && (
              <span>
                <strong>Orden N°:</strong> {pres.orden.numero}
                {pres.orden.tipoEquipo ? " · " + getTipoEquipo(pres.orden.tipoEquipo) : ""}
                {pres.orden.marca?.nombre ? " · " + pres.orden.marca.nombre : ""}
                {pres.orden.modelo ? " " + pres.orden.modelo : ""}
                {pres.orden.numeroSerie ? " (N/S: " + pres.orden.numeroSerie + ")" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── TABLA DE ÍTEMS ───────────────────── */}
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
              <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                <td style={{ ...s.tdCell, textAlign: "left" }}>{item.descripcion}</td>
                <td style={{ ...s.tdCell, textAlign: "center" }}>{item.cantidad}</td>
                <td style={{ ...s.tdCell, textAlign: "right" }}>{formatCurrency(item.precioUnitario)}</td>
                <td style={{ ...s.tdCell, textAlign: "right" }}>{formatCurrency(item.precioTotal)}</td>
              </tr>
            ))}
            {/* Relleno mínimo para que la tabla tenga altura */}
            {pres.items.length < 8 && Array.from({ length: Math.max(0, 8 - pres.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ ...s.tdCell, height: "20px" }}>&nbsp;</td>
                <td style={s.tdCell}></td>
                <td style={s.tdCell}></td>
                <td style={s.tdCell}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── PIE: SON PESOS + TOTALES ─────────── */}
        <table style={s.footerTable}>
          <tbody>
            <tr>
              {/* Son Pesos */}
              <td style={s.footerLeft}>
                <div style={{ fontStyle: "italic", fontSize: "8.5pt", color: "#555", marginBottom: "4px" }}>Son Pesos:</div>
                <div style={{ fontWeight: "bold", fontSize: "9pt" }}>
                  {numeroALetras(totalGeneral).charAt(0).toUpperCase() + numeroALetras(totalGeneral).slice(1)}.--
                </div>
                {pres.notas && (
                  <div style={{ marginTop: "8px", fontSize: "8pt", color: "#444", borderTop: "1px solid #ddd", paddingTop: "4px" }}>
                    <strong>Notas:</strong> {pres.notas}
                  </div>
                )}
              </td>
              {/* Totales */}
              <td style={{ padding: 0, verticalAlign: "top", border: "none" }}>
                <div style={s.footerRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div style={s.footerRow}>
                  <span>Descuento</span>
                  <span>{formatCurrency(descuentoEfectivo)}</span>
                </div>
                <div style={s.footerRow}>
                  <span>Neto Gravado</span>
                  <span>{formatCurrency(neto)}</span>
                </div>
                <div style={s.footerRow}>
                  <span>IVA {inscripto ? "21%" : "(no aplica)"}</span>
                  <span>{formatCurrency(iva)}</span>
                </div>
                <div style={s.footerTotal}>
                  <span>TOTAL</span>
                  <span>{formatCurrency(totalGeneral)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        </div>{/* fin recuadro exterior */}
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────
interface EditItem { descripcion: string; cantidad: number; precioUnitario: number; _editingPrecio?: boolean; }

export default function PresupuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const empresa = useEmpresa();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  useEffect(() => { if (session && !isAdmin) router.replace("/dashboard"); }, [session, isAdmin]);
  const [pres, setPres] = useState<Presupuesto | null>(null);
  const [estado, setEstado] = useState("");
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Modo edición
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editValidez, setEditValidez] = useState(5);
  const [editDescuento, setEditDescuento] = useState(0);
  const [editDescuentoEditing, setEditDescuentoEditing] = useState(false);
  const [editNotas, setEditNotas] = useState("");
  const [editObsCliente, setEditObsCliente] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function fetchPres() {
    const res = await fetch(`/api/presupuestos/${id}`);
    const data = await res.json();
    setPres(data);
    setEstado(data.estado);
  }
  useEffect(() => { fetchPres(); }, [id]);

  function startEditing(p: Presupuesto) {
    setEditItems(p.items.map(i => ({ descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: Number(i.precioUnitario) })));
    setEditValidez(p.validezDias);
    setEditDescuento(Math.max(Number(p.descuento), Number(p.orden?.presupuestoAbonado ?? 0)));
    setEditNotas(p.notas ?? "");
    setEditObsCliente((p as any).observacionesCliente ?? "");
    setIsEditing(true);
  }

  function setEditItem(idx: number, field: keyof EditItem, value: string | number | boolean) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleSaveEdit() {
    const itemsValidos = editItems.filter(i => i.descripcion.trim());
    if (!itemsValidos.length) { toast.error("Agregar al menos un ítem"); return; }
    setSaving(true);
    const subtotalCalc = itemsValidos.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
    const totalCalc = subtotalCalc - editDescuento;
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullUpdate: true,
        validezDias: editValidez,
        descuento: editDescuento,
        notas: editNotas,
        observacionesCliente: editObsCliente,
        subtotal: subtotalCalc,
        total: totalCalc,
        items: itemsValidos,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Presupuesto actualizado");
      setIsEditing(false);
      fetchPres();
    } else {
      toast.error("Error al guardar");
    }
  }

  async function handleEstado(nuevoEstado: string | null) {
    if (!nuevoEstado) return;
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) { toast.success("Estado actualizado"); setEstado(nuevoEstado); fetchPres(); }
    else toast.error("Error al actualizar");
  }

  async function handleDelete() {
    const res = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Presupuesto eliminado"); router.back(); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error ?? "Error al eliminar"); }
  }

  if (!pres) return <div className="p-6 text-gray-400">Cargando...</div>;

  const estadoInfo = getEstadoPresupuesto(pres.estado);
  const descuentoEfectivo = Math.max(Number(pres.descuento), Number(pres.orden?.presupuestoAbonado ?? 0));
  const total = Number(pres.subtotal) - descuentoEfectivo;
  const iva = pres.cliente.condicionIva === "INSCRIPTO" ? total * 0.21 : 0;

  // Totales en modo edición
  const editSubtotal = editItems.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const editTotal = editSubtotal - editDescuento;
  const editIva = pres.cliente.condicionIva === "INSCRIPTO" ? editTotal * 0.21 : 0;

  return (
    <>
      {mounted && pres && <PrintPortal pres={pres} empresa={empresa} />}

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">

        {/* ── CABECERA ── */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{pres.numero}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoInfo.color}`}>{estadoInfo.label}</span>
            </div>
            <p className="text-gray-500 text-sm">
              {pres.cliente.nombre} · <strong>{formatDate(pres.fecha)}</strong> · Válido <strong>{pres.validezDias} días</strong>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isEditing ? (
              <>
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={handleSaveEdit}>
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                </div>
                <Button size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Volver
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />Eliminar
                  </Button>
                  <Button size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-1" />Imprimir
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => startEditing(pres)}>Editar</Button>
                  <Button size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" />Volver
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── PANEL CLIENTE (siempre visible) ── */}
        <dl className="text-sm space-y-1 bg-blue-50 rounded p-3 border border-blue-200">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 flex-shrink-0 font-medium">Cliente:</dt>
            <dd className="font-semibold">{pres.cliente.nombre}</dd>
          </div>
          {pres.cliente.telefono && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Teléfono:</dt><dd>{pres.cliente.telefono}</dd></div>}
          {(pres.cliente as any).whatsapp && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">WhatsApp:</dt><dd>{(pres.cliente as any).whatsapp}</dd></div>}
          {pres.cliente.dniCuit && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">DNI/CUIT:</dt><dd>{fmtCuit(pres.cliente.dniCuit)}</dd></div>}
          {pres.cliente.condicionIva && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Cond. IVA:</dt><dd>{pres.cliente.condicionIva}</dd></div>}
          {pres.cliente.email && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Email:</dt><dd>{pres.cliente.email}</dd></div>}
          {pres.cliente.direccion && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Dirección:</dt><dd>{pres.cliente.direccion}</dd></div>}
        </dl>

        {/* ── PANEL EQUIPO (si hay orden vinculada) ── */}
        {pres.orden && (
          <dl className="text-sm space-y-1 bg-amber-50 rounded p-3 border border-amber-200">
            <p className="font-medium text-xs text-amber-700 mb-2">
              Equipo de la orden:{" "}
              <Link href={`/ordenes/${pres.orden.id}`} className="font-mono font-bold text-blue-600 hover:underline">{pres.orden.numero}</Link>
            </p>
            {pres.orden.tipoEquipo && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Tipo:</dt><dd className="font-medium">{getTipoEquipo(pres.orden.tipoEquipo)}</dd></div>}
            {(pres.orden.marca?.nombre || pres.orden.modelo) && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Equipo:</dt><dd className="font-semibold">{[pres.orden.marca?.nombre, pres.orden.modelo].filter(Boolean).join(" — ")}</dd></div>}
            {pres.orden.numeroSerie && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">N/S:</dt><dd>{pres.orden.numeroSerie}</dd></div>}
            {pres.orden.descripcionProblema && <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0 mt-0.5">Problema:</dt><dd className="italic">{pres.orden.descripcionProblema}</dd></div>}
          </dl>
        )}

        {/* ── DATOS GENERALES (validez) en modo edición ── */}
        {isEditing && (
          <Card>
            <CardHeader><CardTitle className="text-base">Datos Generales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 w-40">
                <Label>Validez (días)</Label>
                <Input type="number" min={1} value={editValidez} onChange={e => setEditValidez(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-green-700">Observaciones para el Cliente <span className="text-xs font-normal text-gray-400">(visible en portal)</span></Label>
                <Textarea value={editObsCliente} onChange={e => setEditObsCliente(e.target.value.toUpperCase())} rows={3} className="border-green-300 focus:border-green-500" placeholder="Texto visible para el cliente en el portal..." />
              </div>
              <div className="space-y-1">
                <Label>Notas internas</Label>
                <Textarea value={editNotas} onChange={e => setEditNotas(e.target.value.toUpperCase())} rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ÍTEMS ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ítems</CardTitle>
              {isEditing && (
                <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setEditItems(prev => [...prev, { descripcion: "", cantidad: 1, precioUnitario: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" />Agregar ítem
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <div className="hidden sm:flex gap-2 text-xs font-medium text-gray-500 px-1" style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto" }}>
                  <span>Descripción</span>
                  <span className="w-16 text-center">Cant.</span>
                  <span className="w-32 text-right">Importe Unit.</span>
                  <span className="w-8"></span>
                </div>
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input value={item.descripcion} onChange={e => setEditItem(idx, "descripcion", e.target.value.toUpperCase())} placeholder="Descripción..." className={!item.descripcion.trim() ? "border-red-300" : ""} />
                    </div>
                    <div className="w-16">
                      <Input type="number" min={1} value={item.cantidad} onChange={e => setEditItem(idx, "cantidad", Number(e.target.value))} className="text-center" />
                    </div>
                    <div className="w-32">
                      <Input
                        className="text-right"
                        placeholder="$ 0,00"
                        value={item._editingPrecio ? item.precioUnitario : formatCurrency(item.precioUnitario)}
                        onFocus={() => setEditItem(idx, "_editingPrecio", true)}
                        onBlur={() => setEditItem(idx, "_editingPrecio", false)}
                        onChange={e => setEditItem(idx, "precioUnitario", Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0)}
                      />
                    </div>
                    <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 w-8 flex justify-center" title="Eliminar ítem">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                <div className="hidden sm:grid gap-2 text-xs font-medium text-gray-500 border-b pb-2 mb-2" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
                  <span>Descripción</span>
                  <span className="w-12 text-center">Cant.</span>
                  <span className="w-28 text-right">Precio Unit.</span>
                  <span className="w-28 text-right">Total</span>
                </div>
                {pres.items.map((item) => (
                  <div key={item.id} className="grid gap-2 py-2 border-b last:border-0 text-sm" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
                    <div>{item.descripcion}</div>
                    <div className="w-12 text-center">{item.cantidad}</div>
                    <div className="w-28 text-right">{formatCurrency(item.precioUnitario)}</div>
                    <div className="w-28 text-right font-medium">{formatCurrency(item.precioTotal)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            <div className="mt-4 space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span><span>{formatCurrency(isEditing ? editSubtotal : pres.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Descuento:</span>
                {isEditing ? (
                  <Input
                    className="w-36 text-right h-7"
                    value={editDescuentoEditing ? editDescuento : formatCurrency(editDescuento)}
                    onFocus={() => setEditDescuentoEditing(true)}
                    onBlur={() => setEditDescuentoEditing(false)}
                    onChange={e => setEditDescuento(Number(e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0)}
                  />
                ) : (
                  <span>- {formatCurrency(descuentoEfectivo)}</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total:</span><span>{formatCurrency(isEditing ? editTotal : total)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>IVA 21%:</span><span>{formatCurrency(isEditing ? editIva : iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total General:</span><span>{formatCurrency(isEditing ? editTotal + editIva : total + iva)}</span>
              </div>
            </div>

            {/* Observaciones / Notas — modo vista */}
            {!isEditing && (
              <>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700">
                  <p className="font-medium text-xs text-green-600 mb-1">Observaciones para el cliente (visible en portal):</p>
                  {(pres as any).observacionesCliente || <span className="text-gray-400 italic">Sin observaciones</span>}
                </div>
                {pres.notas && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600">
                    <p className="font-medium text-xs text-gray-400 mb-1">Notas internas:</p>
                    {pres.notas}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── ESTADO (siempre visible) ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estado del presupuesto</CardTitle></CardHeader>
          <CardContent>
            <Select value={estado} onValueChange={handleEstado} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS_PRESUPUESTO.map(e => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.color}`}>{e.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro desea eliminar el presupuesto <strong>{pres.numero}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
