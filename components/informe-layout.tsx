"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

interface Props {
  titulo: string;
  children: React.ReactNode;
  onImprimir?: () => void;
}

export function InformeLayout({ titulo, children, onImprimir }: Props) {
  const router = useRouter();

  function imprimir() {
    if (onImprimir) { onImprimir(); return; }
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      <div className="p-6 space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <h1 className="text-xl font-bold text-gray-800">{titulo}</h1>
          <div className="flex gap-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={imprimir}>
              <Printer className="h-4 w-4" />Imprimir
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />Volver
            </Button>
          </div>
        </div>

        <div className="print-only mb-4">
          <h1 className="text-2xl font-bold">{titulo}</h1>
        </div>

        {children}
      </div>
    </>
  );
}
