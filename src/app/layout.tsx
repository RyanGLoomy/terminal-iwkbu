import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import SentryInit from "@/components/sentry-init";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
   variable: "--font-jakarta",
   subsets: ["latin"],
   display: "swap",
   preload: true,
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

export const metadata: Metadata = {
   title: {
      default: "IWKBU Terminal — Jasa Raharja",
      template: "%s — IWKBU Terminal",
   },
   description:
      "Sistem pencatatan dan pengelolaan operasional terminal IWKBU Jasa Raharja",
   applicationName: "IWKBU Terminal",
   creator: "Jasa Raharja",
   publisher: "Jasa Raharja",
   formatDetection: { telephone: false },
   manifest: "/manifest.json",
   appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "IWKBU Terminal",
   },
   icons: {
      icon: [
         { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
         { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
   },
};

export const viewport: Viewport = {
   viewportFit: "cover",
   themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#0050b3" },
      { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
   ],
};

export default async function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
    // Membaca nonce dari proxy.ts agar Next.js otomatis menerapkan nonce ke
    // semua inline script milik framework. Tanpa ini, CSP script-src 'nonce-...'
    // memblokir script framework → React gagal hydrate → #418.
    const nonce = (await headers()).get("x-nonce") ?? undefined;

    return (
       <html lang="id">
          <body
             className={`${jakartaSans.variable} ${geistMono.variable} font-sans antialiased`}
          >
             <ThemeProvider>
                <SentryInit />
                <SWRegister />
                {children}
                <Toaster richColors closeButton position="top-center" />
             </ThemeProvider>
         </body>
      </html>
    );
}
