"use client";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Printer, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { formatCurrency } from "@/lib/constants";

interface OrdenRow {
  id: string;
  numero: string;
  fechaIngreso: string;
  estado: string;
  tipoEquipo: string;
  modelo: string | null;
  numeroSerie: string | null;
  costoTecnico: number;
  cliente: { nombre: string };
  marca: { nombre: string } | null;
  tecnico: { id: string; nombre: string; role: string } | null;
}

interface EmpresaData {
  nombre: string;
  domicilio: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  logoPath: string | null;
  condicionIva: string;
  dniCuit: string | null;
}

interface MonthGroup { label: string; ordenes: OrdenRow[]; subtotal: number; }
interface PersonGroup { nombre: string; role: string; months: MonthGroup[]; subtotal: number; }

function fmt(date: string) {
  return new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${names[parseInt(m) - 1]} ${y}`;
}
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByMonth(ordenes: OrdenRow[]): MonthGroup[] {
  const map = new Map<string, OrdenRow[]>();
  for (const o of ordenes) {
    const k = monthKey(o.fechaIngreso);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(o);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({
      label: monthLabel(key),
      ordenes: rows,
      subtotal: rows.reduce((s, r) => s + Number(r.costoTecnico), 0),
    }));
}

function groupByPerson(ordenes: OrdenRow[], isAdmin: boolean, fallbackNombre?: string): PersonGroup[] {
  if (!isAdmin) {
    // Técnico: una sola sección con su nombre
    const months = groupByMonth(ordenes);
    const subtotal = months.reduce((s, g) => s + g.subtotal, 0);
    const nombre = ordenes[0]?.tecnico?.nombre ?? fallbackNombre ?? "Sin asignar";
    return [{ nombre, role: "TECNICO", months, subtotal }];
  }
  // Admin: agrupar por persona
  const map = new Map<string, { nombre: string; role: string; ordenes: OrdenRow[] }>();
  for (const o of ordenes) {
    const key = o.tecnico?.id ?? "__sin__";
    if (!map.has(key)) {
      map.set(key, { nombre: o.tecnico?.nombre ?? "Sin asignar", role: o.tecnico?.role ?? "", ordenes: [] });
    }
    map.get(key)!.ordenes.push(o);
  }
  return Array.from(map.values())
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(({ nombre, role, ordenes: ords }) => {
      const months = groupByMonth(ords);
      return { nombre, role, months, subtotal: months.reduce((s, g) => s + g.subtotal, 0) };
    });
}

export default function OrdenesPagarPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const printRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const now = new Date();
  const today = localDateStr(now);
  const firstOfMonth = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

  const [desde, setDesde] = useState(firstOfMonth);
  const [hasta, setHasta] = useState(today);
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<PersonGroup[] | null>(null);
  const [total, setTotal] = useState(0);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);

  async function handleSearch() {
    if (!desde || !hasta) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/ordenes-pagar?desde=${desde}&hasta=${hasta}`);
      const data = await r.json();
      const grps = groupByPerson(data.ordenes ?? [], isAdmin, userName);
      setPersons(grps);
      setTotal(grps.reduce((s, g) => s + g.subtotal, 0));
      setEmpresa(data.empresa ?? null);
    } catch {
      setPersons([]);
    } finally {
      setLoading(false);
    }
  }

  const userName = session?.user?.name ?? "";
  const userRole = (session?.user as any)?.role ?? "";
  const tituloListado = isAdmin ? "Total Órdenes a Pagar" : "Total Órdenes a Cobrar";
  const totalOrdenes = persons?.reduce((s, p) => s + p.months.reduce((ms, m) => ms + m.ordenes.length, 0), 0) ?? 0;

  return (
    <>
      {mounted && persons && persons.length > 0 && createPortal(
        <div id="print-portal" style={{ display: "none", fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#000" }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              html, body { background: #fff !important; }
              body > *:not(#print-portal) { display: none !important; }
              #print-portal { display: block !important; }
              #print-portal table { border-collapse: collapse; width: 100%; font-size: 10pt; }
              #print-portal th, #print-portal td { border: 1px solid #999; padding: 4px 7px; text-align: left; }
              #print-portal th { background: #e8e8e8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #print-portal td.right { text-align: right; }
              #print-portal .person-header { background: #1e3a5f !important; color: #fff !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #print-portal .month-header { background: #555 !important; color: #fff !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #print-portal .subtotal-row td { background: #ddd !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #print-portal .person-total-row td { background: #c8d8ec !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #print-portal .alt-row td { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}</style>
          {/* Encabezado empresa */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", border: "none" }}>
            <tbody><tr>
              {empresa?.logoPath && (
                <td style={{ width: "70px", verticalAlign: "middle", border: "none", padding: "0 10px 0 0" }}>
                  <img src={`${empresa.logoPath}?t=1`} alt="Logo" style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain" }} />
                </td>
              )}
              <td style={{ verticalAlign: "middle", border: "none", padding: 0 }}>
                <div style={{ fontSize: "14pt", fontWeight: "bold" }}>{empresa?.nombre ?? ""}</div>
                {empresa?.domicilio   && <div style={{ fontSize: "9pt", color: "#444" }}>{empresa.domicilio}</div>}
                {empresa?.dniCuit     && <div style={{ fontSize: "9pt", color: "#444" }}>CUIT: {empresa.dniCuit}</div>}
                {empresa?.condicionIva && <div style={{ fontSize: "9pt", color: "#444" }}>Cond. IVA: {empresa.condicionIva}</div>}
                <div style={{ fontSize: "9pt", color: "#444" }}>
                  {[empresa?.telefono && `Tel: ${empresa.telefono}`, empresa?.whatsapp && `WhatsApp: ${empresa.whatsapp}`, empresa?.email].filter(Boolean).join("  ·  ")}
                </div>
              </td>
              <td style={{ verticalAlign: "top", border: "none", textAlign: "right", padding: 0 }}>
                <div style={{ fontSize: "13pt", fontWeight: "bold" }}>{tituloListado}</div>
                <div style={{ fontSize: "9pt", color: "#444" }}>{fmt(desde + "T00:00:00")} al {fmt(hasta + "T00:00:00")}</div>
                <div style={{ fontSize: "9pt", color: "#444" }}>Usuario: {userName} ({userRole})</div>
              </td>
            </tr></tbody>
          </table>
          <hr style={{ borderTop: "2px solid #555", marginBottom: "10px" }} />

          {persons.map((person) => (
            <div key={person.nombre} style={{ marginBottom: "20px" }}>
              {/* Encabezado persona */}
              <table style={{ marginBottom: "6px" }}>
                <tbody>
                  <tr className="person-header">
                    <td style={{ padding: "6px 10px", fontSize: "12pt" }}>
                      {person.nombre} {person.role === "ADMIN" ? "(Administrador)" : "(Técnico)"}
                    </td>
                    <td className="right" style={{ padding: "6px 10px", fontSize: "12pt" }}>
                      TOTAL: {formatCurrency(person.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {person.months.map((grp) => (
                <div key={grp.label} style={{ marginBottom: "8px" }}>
                  <table>
                    <thead>
                      <tr className="month-header">
                        <th colSpan={5} style={{ textAlign: "left" }}>{grp.label.toUpperCase()} — {grp.ordenes.length} {grp.ordenes.length === 1 ? "orden" : "órdenes"}</th>
                        <th style={{ textAlign: "right" }}>{formatCurrency(grp.subtotal)}</th>
                      </tr>
                      <tr>
                        <th>Nro. Orden</th>
                        <th>Fecha Ingreso</th>
                        <th>Cliente</th>
                        <th>Equipo</th>
                        <th>Estado</th>
                        <th style={{ textAlign: "right" }}>Costo Técnico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.ordenes.map((o, i) => (
                        <tr key={o.id} className={i % 2 !== 0 ? "alt-row" : ""}>
                          <td style={{ fontFamily: "monospace" }}>{o.numero}</td>
                          <td>{fmt(o.fechaIngreso)}</td>
                          <td>{o.cliente.nombre}</td>
                          <td>{[o.marca?.nombre, o.modelo].filter(Boolean).join(" ")}</td>
                          <td>{o.estado.replace(/_/g, " ")}</td>
                          <td className="right" style={{ fontWeight: "bold" }}>{formatCurrency(o.costoTecnico)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="subtotal-row">
                        <td colSpan={5} style={{ textAlign: "right" }}>SUBTOTAL {grp.label.toUpperCase()}</td>
                        <td className="right">{formatCurrency(grp.subtotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>
          ))}

          {/* Total general */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
            <tbody>
              <tr className="month-header">
                <td style={{ padding: "7px 10px", fontWeight: "bold", fontSize: "12pt" }}>
                  TOTAL GENERAL · {totalOrdenes} órdenes
                </td>
                <td className="right" style={{ padding: "7px 10px", fontWeight: "bold", fontSize: "14pt" }}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
        document.body
      )}

      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{tituloListado}</h1>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label>Fecha desde</Label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label>Fecha hasta</Label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-1" />
                {loading ? "Buscando..." : "Generar"}
              </Button>
              {persons && persons.length > 0 && (
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" />Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {persons !== null && (
          <div ref={printRef}>
            {/* Cabecera de impresión */}
            <div className="border rounded-lg p-4 mb-4 flex items-start justify-between bg-white">
              <div className="flex items-center gap-3">
                {empresa?.logoPath && (
                  <Image src={`${empresa.logoPath}?t=1`} alt="Logo" width={56} height={56} className="object-contain rounded" unoptimized />
                )}
                <div>
                  <p className="font-bold text-lg">{empresa?.nombre ?? "EyF TechService"}</p>
                  {empresa?.domicilio && <p className="text-sm text-muted-foreground">{empresa.domicilio}</p>}
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-base">{tituloListado}</p>
                <p className="text-muted-foreground">{fmt(desde + "T00:00:00")} al {fmt(hasta + "T00:00:00")}</p>
                <p className="text-xs text-muted-foreground mt-1">Usuario: <span className="font-medium">{userName}</span> ({userRole})</p>
              </div>
            </div>

            {persons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-white">
                No hay órdenes con costo técnico en el período seleccionado.
              </div>
            ) : (
              <div className="space-y-8">
                {persons.map((person) => (
                  <div key={person.nombre} className="space-y-3">
                    {/* Encabezado persona */}
                    <div className="flex items-center justify-between bg-blue-900 text-white px-4 py-2.5 rounded-lg">
                      <span className="font-bold text-base">
                        {person.nombre}
                        <span className="ml-2 text-sm font-normal opacity-80">
                          {person.role === "ADMIN" ? "Administrador" : "Técnico"}
                        </span>
                      </span>
                      <span className="font-bold text-base">{formatCurrency(person.subtotal)}</span>
                    </div>

                    {person.months.map((grp) => (
                      <div key={grp.label} className="border rounded-lg overflow-hidden bg-white ml-4">
                        <div className="bg-slate-600 text-white px-4 py-1.5 flex justify-between items-center">
                          <span className="font-semibold text-sm uppercase tracking-wide">{grp.label}</span>
                          <span className="text-sm">{grp.ordenes.length} {grp.ordenes.length === 1 ? "orden" : "órdenes"} · {formatCurrency(grp.subtotal)}</span>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b">
                              <th className="text-left px-3 py-2 font-semibold">Nro. Orden</th>
                              <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                              <th className="text-left px-3 py-2 font-semibold">Cliente</th>
                              <th className="text-left px-3 py-2 font-semibold">Equipo</th>
                              <th className="text-left px-3 py-2 font-semibold">Estado</th>
                              <th className="text-right px-3 py-2 font-semibold">Costo Técnico</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {grp.ordenes.map((o, i) => (
                              <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                <td className="px-3 py-1.5 font-mono font-medium">{o.numero}</td>
                                <td className="px-3 py-1.5">{fmt(o.fechaIngreso)}</td>
                                <td className="px-3 py-1.5 font-medium">{o.cliente.nombre}</td>
                                <td className="px-3 py-1.5">
                                  {o.marca?.nombre ?? ""} {o.modelo ?? ""}
                                  {o.tipoEquipo && <span className="text-muted-foreground"> ({o.tipoEquipo.replace(/_/g, " ")})</span>}
                                </td>
                                <td className="px-3 py-1.5 uppercase">{o.estado.replace(/_/g, " ")}</td>
                                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(o.costoTecnico)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-200 border-t-2 border-slate-400">
                              <td colSpan={5} className="px-3 py-1.5 text-right font-bold text-xs">SUBTOTAL {grp.label.toUpperCase()}</td>
                              <td className="px-3 py-1.5 text-right font-bold text-xs tabular-nums">{formatCurrency(grp.subtotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Total general */}
                <div className="border-2 border-slate-800 rounded-lg bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-75">Período: {fmt(desde + "T00:00:00")} — {fmt(hasta + "T00:00:00")}</p>
                    <p className="font-bold text-base mt-0.5">TOTAL GENERAL · {totalOrdenes} órdenes</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
