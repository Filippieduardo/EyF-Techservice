"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("La contraseña no puede estar vacía");
      return;
    }
    setLoading(true);
    const res = await signIn("staff-login", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.93 0.004 270)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.jpeg" alt="EyF-TechService" width={80} height={80} className="rounded mb-3 shadow" />
          <h1 className="text-2xl font-bold" style={{ color: "oklch(0.42 0.14 292)" }}>EyF-TechService</h1>
          <p className="text-base font-bold mt-1" style={{ color: "oklch(0.42 0.14 292)" }}>
            Sistema de Gestión de Servicio Técnico
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso al Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="usuario@eyftechservice.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar al Sistema"}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t text-center">
              <a
                href="/portal/login"
                className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                style={{ color: "oklch(0.42 0.14 292)" }}
              >
                <DoorOpen className="h-4 w-4" />
                ¿Sos cliente? Accedé al portal
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
