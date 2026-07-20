"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QrCode, ClipboardList, Wallet } from "lucide-react";

const nav = [
  {
    href: "/admin",
    label: "Pedidos",
    icon: <ClipboardList className="size-[26px]" />,
  },
  {
    href: "/admin/pagos",
    label: "Pagos",
    icon: <Wallet className="size-[26px]" />,
  },
  {
    href: "/admin/payment",
    label: "QR",
    icon: <QrCode className="size-[26px]" />,
  },
];

export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "admin") {
      router.replace("/auth");
    }
  }, [user, profile, loading, router]);

  if (loading || !profile || profile.role !== "admin") {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Cargando…
      </div>
    );
  }

  return (
    <DashboardShell title={title} nav={nav} roleLabel="Super Admin">
      {children}
    </DashboardShell>
  );
}
