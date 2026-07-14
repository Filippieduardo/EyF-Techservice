"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const CONDICIONES_IVA = [
  "INSCRIPTO",
  "NO ALCANZADO",
  "MONOTRIBUTO",
  "EXCENTO",
  "CONS. FINAL",
];

function formatCuit(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return digits;
}

export default function EmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    domicilio: "",
    condicionIva: "INSCRIPTO",
    dniCuit: "",
    telefono: "",
    whatsapp: "",
    email: "",
  });
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoTs, setLogoTs] = useState<number>(Date.now());

  useEffect(() => {
    fetch("/api/empresa")
      .then((r) => r.json())
      .then((d) => {
        if (d) {
          setForm({
            nombre: d.nombre ?? "",
            domicilio: d.domicilio ?? "",
            condicionIva: d.condicionIva ?? "INSCRIPTO",
            dniCuit: d.dniCuit ?? "",
            telefono: d.telefono ?? "",
            whatsapp: d.whatsapp ?? "",
            email: d.email ?? "",
          });
          setLogoPath(d.logoPath ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCuit(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    set("dniCuit", digits);
  }

  async function handleSave() {
    if (!form.nombre.trim()) { toast.error("El nombre/razón social es obligatorio"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      toast.success("Datos de empresa guardados");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = document.createElement("img");

    img.onload = async () => {
      if (img.width !== 1024 || img.height !== 1024) {
        URL.revokeObjectURL(url);
        toast.error(`La imagen debe ser exactamente 1024×1024 px. La seleccionada es ${img.width}×${img.height} px.`);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      // Mostrar preview inmediatamente (NO revocar aún)
      setLogoPreview(url);
      setUploadingLogo(true);

      try {
        // Convertir a base64 en chunks para evitar stack overflow con imágenes grandes
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";

        const r = await fetch("/api/empresa/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, ext }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error");
        setLogoPath(data.logoPath);
        setLogoTs(Date.now());
        toast.success("Logotipo actualizado");
      } catch (err: any) {
        toast.error(`Error al subir el logotipo: ${err?.message ?? ""}`);
      } finally {
        setUploadingLogo(false);
        setLogoPreview(null);
        URL.revokeObjectURL(url);
        if (fileRef.current) fileRef.current.value = "";
      }
    };

    img.src = url;
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>;

  const displayCuit = formatCuit(form.dniCuit);
  const logoSrc = logoPreview ?? (logoPath ? `${logoPath}?t=${logoTs}` : null);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Datos de la Empresa</h1>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logotipo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden">
              {logoSrc ? (
                <Image src={logoSrc} alt="Logo" width={96} height={96} className="object-contain" unoptimized />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                La imagen debe ser exactamente <strong>1024 × 1024 píxeles</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadingLogo ? "Subiendo..." : "Seleccionar imagen"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Información General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre / Razón Social *</Label>
            <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value.toUpperCase())} placeholder="EyF TechService" />
          </div>

          <div className="space-y-2">
            <Label>Domicilio</Label>
            <Input value={form.domicilio} onChange={(e) => set("domicilio", e.target.value.toUpperCase())} placeholder="Calle 123, Ciudad" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condición IVA</Label>
              <Select value={form.condicionIva} onValueChange={(v) => set("condicionIva", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDICIONES_IVA.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>DNI / CUIT</Label>
              <Input
                value={displayCuit}
                onChange={(e) => handleCuit(e.target.value)}
                placeholder="20-12345678-9"
                maxLength={13}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value.toUpperCase())} placeholder="0351-1234567" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value.toUpperCase())} placeholder="+54 9 351 123-4567" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value.toLowerCase())} placeholder="contacto@empresa.com" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar datos de empresa"}
      </Button>
    </div>
  );
}
