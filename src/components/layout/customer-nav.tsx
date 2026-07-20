"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Home, ClipboardList, User } from "lucide-react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

export function CustomerNav() {
  const pathname = usePathname();
  const itemCount = useCart((s) => s.itemCount());
  const { profile } = useAuth();

  if (profile && profile.role !== "customer") return null;

  const links = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/orders", icon: ClipboardList, label: "Orders" },
    { href: "/cart", icon: ShoppingBag, label: "Cart", badge: itemCount },
    { href: "/account", icon: User, label: "Account" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map(({ href, icon: Icon, label, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 min-w-[64px]",
                active ? "text-brand" : "text-muted"
              )}
            >
              <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
              {badge != null && badge > 0 && (
                <span className="absolute top-0 right-1 size-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopHeader() {
  const itemCount = useCart((s) => s.itemCount());
  const { profile, user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          Magda<span className="text-brand">Ya</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            Restaurants
          </Link>
          <Link
            href="/orders"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Orders
          </Link>
          <Link
            href="/cart"
            className="relative text-sm font-medium text-muted hover:text-ink"
          >
            Cart
            {itemCount > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-muted truncate max-w-[140px]">
                {profile?.full_name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="h-10 px-4 rounded-2xl bg-brand text-white text-sm font-semibold inline-flex items-center"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
