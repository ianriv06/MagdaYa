"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { getDashboardPath, ROLE_LABELS, isPhoneAuthEmail } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();

  return (
    <div className="min-h-dvh pb-20">
      <DesktopHeader />
      <div className="max-w-lg mx-auto px-4 py-6 animate-slide-up">
        <h1 className="font-display text-2xl font-bold mb-6">Cuenta</h1>

        {loading ? (
          <div className="h-32 rounded-2xl bg-surface border border-border animate-pulse" />
        ) : !user ? (
          <div className="text-center py-12">
            <p className="text-muted mb-4">Inicia sesión para administrar tu cuenta</p>
            <Link href="/auth">
              <Button>Iniciar sesión</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl bg-surface border border-border p-5">
              <div className="size-14 rounded-full bg-brand-light text-brand font-display font-bold text-xl flex items-center justify-center mb-3">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <h2 className="font-semibold text-lg">{profile?.full_name}</h2>
              {profile?.phone ? (
                <p className="text-sm text-muted">{profile.phone}</p>
              ) : null}
              {profile?.email && !isPhoneAuthEmail(profile.email) ? (
                <p className="text-sm text-muted">{profile.email}</p>
              ) : null}
              <p className="text-xs text-muted mt-2">
                Rol:{" "}
                {profile?.role
                  ? ROLE_LABELS[profile.role as UserRole] || profile.role
                  : ""}
              </p>
            </div>

            {profile && profile.role !== "customer" && (
              <Link href={getDashboardPath(profile.role)}>
                <Button variant="outline" className="w-full">
                  Ir al panel de {ROLE_LABELS[profile.role as UserRole]}
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              className="w-full text-danger"
              onClick={() => signOut()}
            >
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
