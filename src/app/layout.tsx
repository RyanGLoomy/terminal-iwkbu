import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import SentryInit from "@/components/sentry-init";
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
   title: "Sistem Integrasi Terminal | IWKBU Jasa Raharja",
   description:
      "Sistem pencatatan dan pengelolaan operasional terminal IWKBU Jasa Raharja",
};

export const viewport: Viewport = {
   viewportFit: "cover",
   themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
   ],
};

export default async function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   // Nonce dari middleware (proxy.ts) untuk CSP ketat (script-src 'nonce-...').
   const nonce = (await headers()).get("x-nonce") ?? undefined;

   return (
       <html lang="id" data-theme="jr" suppressHydrationWarning>
          <body
             className={`${jakartaSans.variable} ${geistMono.variable} font-sans antialiased`}
             suppressHydrationWarning
          >
             <script
                nonce={nonce}
                dangerouslySetInnerHTML={{
                   __html: `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.setAttribute('data-theme','jr-dark');}}catch(e){}})();`,
                }}
             />
             <ThemeProvider>
                <SentryInit />
                {children}
                <Toaster richColors closeButton position="top-center" />
             </ThemeProvider>
         </body>
      </html>
   );
}
