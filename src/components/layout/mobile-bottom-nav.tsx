"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

const navStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2147483000,
  display: "flex",
  width: "100%",
  maxWidth: "100vw",
  boxSizing: "border-box",
  background: "#2c2c2c",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  transform: "translateZ(0)",
  WebkitTransform: "translateZ(0)",
};

/**
 * Bottom tab bar for phones. Portaled to document.body + inline styles so
 * parent layout / Leaflet / Tailwind can't hide it. CSS only hides it on
 * real desktops (wide + fine pointer), not phones in "Desktop site" mode.
 */
export function MobileBottomNav({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bar = (
    <nav
      className="mobile-bottom-nav"
      aria-label="Navegación"
      style={navStyle}
    >
      {children}
    </nav>
  );

  if (!mounted) {
    // SSR / first paint — still render so layout padding is reserved
    return bar;
  }

  return createPortal(bar, document.body);
}
