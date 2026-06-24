import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import SentryInit from "@/components/sentry-init";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
   variable: "--font-geist-sans",
   subsets: ["latin"],
   weight: ["400", "500", "600", "700", "800"],
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

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="id" suppressHydrationWarning>
         <body
            className={`${jakartaSans.variable} ${geistMono.variable} antialiased`}
         >
             <ThemeProvider>
                <SentryInit />
                {children}
                <Toaster richColors closeButton />
             </ThemeProvider>
         </body>
      </html>
   );
}
