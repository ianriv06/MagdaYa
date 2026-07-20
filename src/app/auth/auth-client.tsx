"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDashboardPath,
  cn,
  ROLE_LABELS,
  normalizePhone,
  phoneToAuthEmail,
} from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { AppLogo } from "@/components/layout/app-logo";
import { Bike, ChefHat, ShoppingBag, Shield, ArrowLeft } from "lucide-react";

const ROLES: {
  id: UserRole;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "customer",
    label: "Cliente",
    description: "Pide comida a domicilio o para recoger",
    icon: ShoppingBag,
  },
  {
    id: "restaurant",
    label: "Restaurante",
    description: "Administra tu menú y pedidos",
    icon: ChefHat,
  },
  {
    id: "driver",
    label: "Repartidor",
    description: "Entrega pedidos y gana dinero",
    icon: Bike,
  },
  {
    id: "admin",
    label: "Super Admin",
    description: "Controla toda la plataforma",
    icon: Shield,
  },
];

function usesPhoneAuth(r: UserRole) {
  return r === "customer" || r === "restaurant" || r === "driver";
}

export default function AuthPage() {
  const [mode, setMode] = useState<"select" | "login" | "signup">("select");
  const [role, setRole] = useState<UserRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const supabase = createClient();

  const selectRole = (r: UserRole, m: "login" | "signup") => {
    setRole(r);
    setMode(m);
    setError("");
    setEmail("");
    setPhone("");
    setPassword("");
    setFullName("");
  };

  const formatError = (err: unknown) => {
    if (!err) return "Error desconocido";
    if (typeof err === "string" && err.trim()) return err;
    if (err instanceof Error) {
      const e = err as Error & {
        code?: string;
        status?: number;
        error_description?: string;
      };
      const parts = [e.message, e.error_description, e.code].filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      );
      if (parts.length) return parts.join(" — ");
    }
    if (typeof err === "object" && err !== null) {
      const o = err as Record<string, unknown>;
      for (const key of ["message", "msg", "error_description", "error"]) {
        const v = o[key];
        if (typeof v === "string" && v.trim() && v !== "{}") return v;
      }
      try {
        const raw = JSON.stringify(err);
        if (raw && raw !== "{}") return raw;
      } catch {
        /* ignore */
      }
    }
    return "No se pudo crear la cuenta. Si el error persiste, ejecuta supabase/fix-signup-trigger.sql en el SQL Editor.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const phoneAuth = usesPhoneAuth(role);
      let authEmail = email.trim();
      let phoneDigits = "";

      if (phoneAuth) {
        phoneDigits = normalizePhone(phone);
        if (phoneDigits.length < 7) {
          throw new Error("Ingresa un número de teléfono válido.");
        }
        authEmail = phoneToAuthEmail(phoneDigits);
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phoneAuth ? phoneDigits : phone.trim() || null,
              role,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) {
          throw new Error(
            "La cuenta no se creó (respuesta vacía). Revisa Authentication → Users en Supabase."
          );
        }
        await new Promise((r) => setTimeout(r, 400));
        router.push(next || getDashboardPath(role));
        router.refresh();
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          });
        if (signInError) throw signInError;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile && profile.role !== role) {
          await supabase.auth.signOut();
          const roleLabel =
            ROLE_LABELS[profile.role as UserRole] || profile.role;
          throw new Error(
            `Esta cuenta es de ${roleLabel}. Usa el acceso de ${roleLabel}.`
          );
        }

        router.push(next || getDashboardPath(profile?.role || role));
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-dvh bg-white">
        <div className="sticky top-0 z-10 bg-white safe-top px-4 pt-3 pb-2 border-b border-border">
          <AppLogo size="sm" />
        </div>
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-8 animate-fade-in">
            <p className="text-muted text-[15px]">
              Comida a domicilio y para recoger
            </p>
          </div>

          <div className="space-y-3 animate-slide-up">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-border p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-subtle text-ink flex items-center justify-center shrink-0">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-[15px]">{r.label}</h2>
                      <p className="text-[13px] text-muted leading-snug">
                        {r.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => selectRole(r.id, "login")}
                    >
                      Entrar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => selectRole(r.id, "signup")}
                    >
                      Registrarse
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted mt-8">
            <Link
              href="/"
              className="hover:text-ink font-semibold underline-offset-2 hover:underline"
            >
              Seguir explorando
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const roleMeta = ROLES.find((r) => r.id === role)!;
  const Icon = roleMeta.icon;
  const phoneAuth = usesPhoneAuth(role);

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="sticky top-0 z-10 bg-canvas safe-top px-4 pt-3 pb-2 border-b border-border">
        <AppLogo size="sm" />
      </div>
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => setMode("select")}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-6"
        >
          <ArrowLeft className="size-4" /> Atrás
        </button>

        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-12 rounded-2xl bg-brand-light text-brand flex items-center justify-center">
              <Icon className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                {mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
              </h1>
              <p className="text-sm text-muted">{roleMeta.label}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Input
                id="fullName"
                label="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            )}

            {phoneAuth ? (
              <Input
                id="phone"
                label="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                placeholder="71234567"
              />
            ) : (
              <Input
                id="email"
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            )}

            <Input
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />

            {error && (
              <div className="rounded-2xl bg-red-50 text-danger text-sm p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  className={cn("text-brand font-semibold")}
                  onClick={() => setMode("signup")}
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  className="text-brand font-semibold"
                  onClick={() => setMode("login")}
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
