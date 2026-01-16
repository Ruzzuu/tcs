import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Teman Cuci Sepatu - Layanan Cuci Profesional",
  description: "Layanan cuci sepatu, tas, helm, sofa, karpet dengan kualitas premium. Penjemputan gratis ke lokasi Anda.",
  keywords: ["cuci sepatu", "cuci tas", "cuci helm", "cuci sofa", "cuci karpet", "laundry"],
  authors: [{ name: "Teman Cuci Sepatu" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content for dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              })();
            `,
          }}
        />
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* PWA & Favicon */}
        <link rel="icon" type="image/png" href="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/w_32,h_32,c_fit,f_png/v1768543427/logo_tcs_keooto.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/w_180,h_180,c_fit,f_png/v1768543427/logo_tcs_keooto.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Teman Cuci Sepatu" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#f6f6f8] dark:bg-[#101622] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
