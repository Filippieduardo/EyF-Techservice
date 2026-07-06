"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Marca {
  id: string;
  nombre: string;
}

interface MarcaSelectProps {
  value: string;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  hideAdd?: boolean;
}

export function MarcaSelect({ value, onValueChange, placeholder = "Seleccionar marca", disabled, hideAdd }: MarcaSelectProps) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [adding, setAdding] = useState(false);
  const [nuevaMarca, setNuevaMarca] = useState("");

  async function fetchMarcas() {
    const res = await fetch("/api/marcas");
    setMarcas(await res.json());
  }

  useEffect(() => { fetchMarcas(); }, []);

  async function handleAddMarca() {
    if (!nuevaMarca.trim()) return;
    const res = await fetch("/api/marcas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaMarca.trim().toUpperCase() }),
    });
    if (res.ok) {
      const marca = await res.json();
      toast.success(`Marca "${marca.nombre}" agregada`);
      await fetchMarcas();
      onValueChange(marca.id);
      setAdding(false);
      setNuevaMarca("");
    } else {
      toast.error("Error al agregar marca");
    }
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={nuevaMarca}
          onChange={e => setNuevaMarca(e.target.value)}
          placeholder="Nombre de la marca"
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); handleAddMarca(); }
            if (e.key === "Escape") setAdding(false);
          }}
        />
        <Button type="button" size="sm" onClick={handleAddMarca}>Agregar</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Cancelar</Button>
      </div>
    );
  }

  const displayValue = value === "none"
    ? "Sin marca"
    : marcas.find(m => m.id === value)?.nombre ?? placeholder;

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin marca</SelectItem>
          {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
        </SelectContent>
      </Select>
      {!disabled && !hideAdd && (
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)} title="Agregar nueva marca">
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
