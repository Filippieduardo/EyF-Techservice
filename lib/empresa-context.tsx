"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface EmpresaData {
  id: string;
  nombre: string;
  domicilio: string | null;
  condicionIva: string;
  dniCuit: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  logoPath: string | null;
}

const EmpresaContext = createContext<EmpresaData | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);

  useEffect(() => {
    fetch("/api/empresa")
      .then((r) => r.json())
      .then((d) => setEmpresa(d))
      .catch(() => {});
  }, []);

  return <EmpresaContext.Provider value={empresa}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
