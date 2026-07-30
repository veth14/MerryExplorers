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
    apple: "/LOGO.jpg",
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
        {/* ── Preconnects: only origins used by the landing page ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <PageProgress />
        {children}
      </body>
    </html>
  );
}
