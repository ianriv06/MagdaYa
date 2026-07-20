"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders the mobile bottom bar on document.body so it isn't clipped or
 * broken by parent flex/transform stacking (common iOS Safari bug).
 */
export function MobileBottomNav({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav className="mobile-bottom-nav" aria-label="Navegación">
      {children}
    </nav>,
    document.body
  );
}
