"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

function NavIcon({ icon, filled }: { icon: ReactNode; filled: boolean }) {
  if (!isValidElement(icon)) return icon;
  return cloneElement(icon as ReactElement<{ fill?: string; strokeWidth?: number }>, {
    fill: filled ? "currentColor" : "none",
    strokeWidth: filled ? 1.5 : 1.75,
  });
}

/** Only the most specific matching tab is active (avoids parent+child both highlighted). */
function isNavActive(pathname: string, href: string, allHrefs: string[]) {
  const matches = (h: string) =>
    pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  return !allHrefs.some(
    (other) => other !== href && other.length > href.length && matches(other)
  );
}

export function DashboardShell({
  title,
  nav,
  children,
  roleLabel,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const hrefs = nav.map((item) => item.href);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-dvh bg-canvas flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:flex-col bg-ink text-white shrink-0">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="font-display text-xl font-bold">
            Magda<span className="text-brand">Ya</span>
          </Link>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">
            {roleLabel}
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href, hrefs);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <NavIcon icon={item.icon} filled={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-sm truncate px-3 mb-2">{profile?.full_name}</p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white w-full"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 h-14 flex items-center justify-between md:px-8">
          <h1 className="font-display text-lg font-bold">{title}</h1>
          <button
            onClick={handleSignOut}
            className="md:hidden text-muted p-2"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">{children}</main>

        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#2c2c2c] border-t border-white/10 safe-bottom md:hidden">
          <div className="flex items-center justify-around h-[62px]">
            {nav.map((item) => {
              const active = isNavActive(pathname, item.href, hrefs);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0 px-1.5 min-w-[56px] transition-colors",
                    active ? "text-brand" : "text-brand/55"
                  )}
                >
                  <span className={cn(active ? "text-brand" : "text-brand/55")}>
                    <NavIcon icon={item.icon} filled={active} />
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-medium leading-none",
                      active ? "text-brand" : "text-brand/55"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
