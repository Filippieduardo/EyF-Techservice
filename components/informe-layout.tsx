"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useEmpresa } from "@/lib/empresa-context";

interface Props {
  titulo: string;
  filtrosTexto?: string;
  printTable: React.ReactNode;
  children: React.ReactNode;
}

export function InformeLayout({ titulo, filtrosTexto, printTable, children }: Props) {
  const router = useRouter();
  const empresa = useEmpresa();
  const [mounted, setMounted] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { window.print(); setPrinting(false); }, 80);
    return () => clearTimeout(t);
  }, [printing]);

  const fechaHoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const printPortal = (
    <div id="print-informe" style={{ display: "none", fontFamily: "Arial, sans-serif", fontSize: "10pt", color: "#000" }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm 12mm; }
          html, body { background: #fff !important; }
          body > *:not(#print-informe) { display: none !important; }
          #print-informe { display: block !important; }
          #print-informe table.data { border-collapse: collapse; width: 100%; font-size: 9pt; }
          #print-informe table.data th, #print-informe table.data td { border: 1px solid #999; padding: 4px 7px; text-align: left; }
          #print-informe table.data th { background: #e0e0e0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-informe .center { text-align: center; }
          #print-informe .right { text-align: right; }
          #print-informe tfoot td { background: #e0e0e0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-informe .alt td { background: #f7f7f7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-informe .warn td { background: #fff8e1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-informe .danger td { background: #ffecec !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen { #print-informe { display: none !important; } }
      `}</style>

      {/* Encabezado empresa */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", border: "none" }}>
        <tbody><tr>
          {empresa?.logoPath && (
            <td style={{ width: "70px", verticalAlign: "middle", border: "none", padding: "0 10px 0 0" }}>
              <img src={empresa.logoPath} alt="Logo" style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain" }} />
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
          <td style={{ verticalAlign: "top", border: "none", textAlign: "right", fontSize: "9pt", color: "#555", whiteSpace: "nowrap" }}>
            Fecha de emisión: {fechaHoy}
          </td>
        </tr></tbody>
      </table>

      <hr style={{ borderTop: "2px solid #444", margin: "0 0 6px 0" }} />
      <div style={{ fontWeight: "bold", fontSize: "13pt", marginBottom: "3px" }}>{titulo}</div>
      {filtrosTexto && <div style={{ fontSize: "9pt", color: "#555", marginBottom: "5px" }}>{filtrosTexto}</div>}
      <hr style={{ borderTop: "1px solid #aaa", margin: "0 0 8px 0" }} />

      {printTable}
    </div>
  );

  return (
    <>
      {mounted && createPortal(printPortal, document.body)}

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-800">{titulo}</h1>
          <div className="flex gap-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => setPrinting(true)}>
              <Printer className="h-4 w-4" />Imprimir
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />Volver
            </Button>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
