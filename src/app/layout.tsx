import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PageProgress } from "@/components/ui/page-progress";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Merry Explorers",
  description: "Merry Explorers — Nurturing, inspiring young minds.",
  icons: {
    icon: "/LOGO.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${manrope.variable} h-full antialiased`}>
      <head>
        {/* ── Preconnects: establish connections early ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://merryexplorers.firebaseapp.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://apis.google.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />

        {/* ── LCP image preload (landing page logo) ── */}
        <link
          rel="preload"
          as="image"
          href="/LOGO-noBG.png"
          // @ts-ignore - fetchpriority is a valid attribute
          fetchpriority="high"
          type="image/png"
        />

        {/* ── Material Symbols — loaded after preconnects are established ── */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <PageProgress />
        {children}
      </body>
    </html>
  );
}
