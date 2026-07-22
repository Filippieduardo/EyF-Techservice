export const ESTADOS_ORDEN = [
  { value: "INGRESADO",          label: "INGRESADO",          color: "bg-green-600 text-white" },
  { value: "SIN_DIAGNOSTICAR",   label: "SIN DIAGNOSTICAR",   color: "bg-green-500 text-white font-bold" },
  { value: "EN_DIAGNOSTICO",     label: "EN DIAGNÓSTICO",     color: "bg-green-600 text-white" },
  { value: "DIAGNOSTICADO",      label: "DIAGNOSTICADO",      color: "bg-green-600 text-white" },
  { value: "ESPERANDO_REPUESTO", label: "ESPERANDO REPUESTO", color: "bg-purple-600 text-white" },
  { value: "EN_REPARACION",      label: "EN REPARACIÓN",      color: "bg-yellow-400 text-black" },
  { value: "TERMINADO",          label: "TERMINADO",          color: "bg-sky-400 text-white" },
  { value: "ENTREGADO",          label: "ENTREGADO",          color: "bg-sky-400 text-white" },
  { value: "NO_REPARABLE",       label: "NO REPARABLE",       color: "bg-red-600 text-white" },
  { value: "CANCELADO",          label: "CANCELADO",          color: "bg-red-600 text-white" },
  { value: "RMA",                label: "RMA",                color: "bg-orange-500 text-black font-bold" },
];

export const TIPOS_EQUIPO = [
  { value: "IMPRESORA_LASER", label: "Impresora Láser" },
  { value: "IMPRESORA_INKJET", label: "Impresora Inkjet" },
  { value: "IMPRESORA_MATRICIAL", label: "Impresora Matricial" },
  { value: "PLOTTER", label: "Plotter" },
  { value: "NOTEBOOK", label: "Notebook" },
  { value: "NETBOOK", label: "Netbook" },
  { value: "PC", label: "PC" },
  { value: "TABLET", label: "Tablet" },
  { value: "OTRO", label: "Otro" },
];

export const CATEGORIAS_REPUESTO = [
  { value: "TONER", label: "Tóner" },
  { value: "FUSOR", label: "Fusor" },
  { value: "CABEZAL", label: "Cabezal" },
  { value: "MEMORIA", label: "Memoria" },
  { value: "DISCO", label: "Disco" },
  { value: "BATERIA", label: "Batería" },
  { value: "FUENTE", label: "Fuente" },
  { value: "PANTALLA", label: "Pantalla" },
  { value: "TECLADO", label: "Teclado" },
  { value: "OTRO", label: "Otro" },
];

export const ESTADOS_PRESUPUESTO = [
  { value: "PENDIENTE",  label: "PENDIENTE",  color: "bg-yellow-400 text-black font-bold" },
  { value: "APROBADO",   label: "APROBADO",   color: "bg-sky-400 text-black font-bold" },
  { value: "RECHAZADO",  label: "RECHAZADO",  color: "bg-red-600 text-black font-bold" },
  { value: "VENCIDO",    label: "VENCIDO",    color: "bg-red-600 text-black font-bold" },
];

export function getEstadoOrden(value: string) {
  return ESTADOS_ORDEN.find((e) => e.value === value) ?? ESTADOS_ORDEN[0];
}

export function getTipoEquipo(value: string) {
  return TIPOS_EQUIPO.find((t) => t.value === value)?.label ?? value;
}

export function getEstadoPresupuesto(value: string) {
  return ESTADOS_PRESUPUESTO.find((e) => e.value === value) ?? ESTADOS_PRESUPUESTO[0];
}

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}
