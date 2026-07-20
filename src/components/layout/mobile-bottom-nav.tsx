import type { ReactNode } from "react";

/**
 * Fixed bottom bar for mobile. Rendered inline (server-side) so it shows even
 * before JS hydrates; .mobile-bottom-nav CSS handles fixed positioning,
 * z-index and hiding on desktop widths.
 */
export function MobileBottomNav({ children }: { children: ReactNode }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación">
      {children}
    </nav>
  );
}
