"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Home, ClipboardList, User, Search } from "lucide-react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/components/providers/auth-provider";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

/** Only the most specific matching tab is active. */
function isNavActive(pathname: string, href: string, allHrefs: string[]) {
  const matches = (h: string) =>
    h === "/"
      ? pathname === "/"
      : pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  return !allHrefs.some(
    (other) => other !== href && other.length > href.length && matches(other)
  );
}

export function CustomerNav() {
  const pathname = usePathname();
  const itemCount = useCart((s) => s.itemCount());
  const { profile } = useAuth();

  // Staff roles use DashboardShell nav — don't show customer tabs on top
  if (profile && profile.role !== "customer") return null;

  const links = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/orders", icon: ClipboardList, label: "Pedidos" },
    { href: "/cart", icon: ShoppingBag, label: "Carrito", badge: itemCount },
    { href: "/account", icon: User, label: "Cuenta" },
  ];
  const hrefs = links.map((l) => l.href);

  return (
    <MobileBottomNav>
      <div className="flex items-stretch justify-around h-[58px] w-full max-w-lg mx-auto">
        {links.map(({ href, icon: Icon, label, badge }) => {
          const active = isNavActive(pathname, href, hrefs);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0 min-w-0 transition-colors text-brand"
            >
              <Icon
                className="size-[29px] shrink-0"
                strokeWidth={active ? 1.5 : 1.75}
                fill={active ? "currentColor" : "none"}
              />
              <span className="text-[13px] font-medium leading-none truncate max-w-full">
                {label}
              </span>
              {badge != null && badge > 0 && (
                <span className="absolute top-1 right-[18%] min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </MobileBottomNav>
  );
}

export function DesktopHeader() {
  const itemCount = useCart((s) => s.itemCount());
  const { profile, user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 hidden md:block bg-white/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight shrink-0"
        >
          Magda<span className="text-brand">Ya</span>
        </Link>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            readOnly
            onFocus={(e) => {
              e.target.blur();
              window.location.href = "/";
            }}
            placeholder="Comida, restaurantes…"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-subtle text-sm placeholder:text-muted focus:outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <Link href="/" className="text-sm font-semibold text-ink">
            Restaurantes
          </Link>
          <Link
            href="/orders"
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            Pedidos
          </Link>
          <Link
            href="/cart"
            className="relative text-sm font-semibold text-muted hover:text-ink"
          >
            Carrito
            {itemCount > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <span className="text-sm text-muted truncate max-w-[120px]">
                {profile?.full_name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm font-semibold text-muted hover:text-ink"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="h-10 px-4 rounded-lg bg-brand text-white text-sm font-bold inline-flex items-center"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
