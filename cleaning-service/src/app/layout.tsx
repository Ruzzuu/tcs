import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cuci Premium - Layanan Cuci Profesional",
  description: "Layanan cuci sepatu, tas, helm, sofa, karpet dengan kualitas premium. Penjemputan gratis ke lokasi Anda.",
  keywords: ["cuci sepatu", "cuci tas", "cuci helm", "cuci sofa", "cuci karpet", "laundry"],
  authors: [{ name: "Cuci Premium" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1152d4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light" suppressHydrationWarning>
      <head>
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#f6f6f8] dark:bg-[#101622] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
