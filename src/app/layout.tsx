import type { Metadata, Viewport } from "next";
import { Geist, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ConfigBanner } from "@/components/layout/config-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MagdaYa — Comida a domicilio y para recoger",
  description:
    "Pide comida a domicilio o para recoger. Rápido, simple, pago con QR. Sigue tu pedido en tiempo real.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#06c167",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${outfit.variable} antialiased min-h-dvh`}
      >
        <AuthProvider>
          <ConfigBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
