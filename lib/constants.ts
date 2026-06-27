export const ESTADOS_ORDEN = [
  { value: "INGRESADO", label: "Ingresado", color: "bg-gray-100 text-gray-700" },
  { value: "EN_DIAGNOSTICO", label: "En Diagnóstico", color: "bg-blue-100 text-blue-700" },
  { value: "ESPERANDO_REPUESTO", label: "Esperando Repuesto", color: "bg-yellow-100 text-yellow-700" },
  { value: "EN_REPARACION", label: "En Reparación", color: "bg-orange-100 text-orange-700" },
  { value: "TERMINADO", label: "Terminado", color: "bg-green-100 text-green-700" },
  { value: "ENTREGADO", label: "Entregado", color: "bg-gray-100 text-gray-500" },
  { value: "NO_REPARABLE", label: "No Reparable", color: "bg-red-100 text-red-700" },
  { value: "CANCELADO", label: "Cancelado", color: "bg-red-100 text-red-400" },
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
  { value: "PENDIENTE", label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  { value: "APROBADO", label: "Aprobado", color: "bg-green-100 text-green-700" },
  { value: "RECHAZADO", label: "Rechazado", color: "bg-red-100 text-red-700" },
  { value: "VENCIDO", label: "Vencido", color: "bg-gray-100 text-gray-500" },
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
