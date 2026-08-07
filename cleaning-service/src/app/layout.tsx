import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ACTIVE_TENANT } from "@/config/tenant";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${ACTIVE_TENANT.name} - Layanan Cuci Profesional`,
  description: ACTIVE_TENANT.formDescription,
  keywords: ["cuci sepatu", "cuci tas", "laundry"],
  authors: [{ name: ACTIVE_TENANT.name }],
  manifest: "/manifest.webmanifest",
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
        {/* Prevent flash of unstyled content for dark mode - Must run before any content renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = storedTheme || (prefersDark ? 'dark' : 'light');
                
                // Remove any existing theme classes first
                document.documentElement.classList.remove('light', 'dark');
                
                // Add the correct theme class
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  console.log('Dark mode applied');
                } else {
                  document.documentElement.classList.add('light');
                  console.log('Light mode applied');
                }
              } catch (e) {
                console.error('Theme initialization error:', e);
              }
            `,
          }}
        />
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* PWA & Favicon */}
        <link rel="icon" type="image/png" href={ACTIVE_TENANT.logoUrl} />
        <link rel="apple-touch-icon" href={ACTIVE_TENANT.logoUrl} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={ACTIVE_TENANT.name} />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#f6f6f8] dark:bg-[#101622] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
