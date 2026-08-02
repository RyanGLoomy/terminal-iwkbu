import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import SentryInit from "@/components/sentry-init";
import { SWRegister } from "@/components/sw-register";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
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
      default: "IWKBU Terminal — Jasa Raharja Banten",
      template: "%s — IWKBU Terminal",
   },
   description:
      "Sistem pencatatan dan pengelolaan operasional terminal IWKBU Jasa Raharja khusus wilayah Banten",
   applicationName: "IWKBU Terminal",
   creator: "Jasa Raharja Banten",
   publisher: "Jasa Raharja Banten",
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

const THEME_COOKIE_MAP: Record<string, string> = {
   light: "jr",
   dark: "jr-dark",
};

export default async function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get("theme")?.value;
    const sidebarCookie = cookieStore.get("sidebar-collapsed")?.value;

    // Map theme cookie value → DaisyUI data-theme attribute
    const dataTheme = THEME_COOKIE_MAP[themeCookie ?? ""] ?? "jr";
    const sidebarCollapsed = sidebarCookie === "true";

    return (
      <html
         lang="id"
         suppressHydrationWarning
         data-theme={dataTheme}
         {...(sidebarCollapsed ? { "data-sidebar-collapsed": "true" } : {})}
      >
         <body
             className={`${jakartaSans.variable} ${geistMono.variable} font-sans antialiased`}
          >
             <ThemeProvider>
                <SentryInit />
                <SWRegister />
                <SpeedInsights />
                <Analytics />
                {children}
                <Toaster richColors closeButton position="top-center" />
             </ThemeProvider>
         </body>
      </html>
    );
}
