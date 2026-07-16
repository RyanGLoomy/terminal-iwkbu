import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { ShieldCheck, Bus, FileCheck2, TrendingUp } from "lucide-react";

export default function LoginPage() {
   return (
      <main className="relative flex min-h-screen items-stretch">
         {/* === LEFT: Brand panel === */}
         <div className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-[#0050b3] via-[#003e8f] to-[#0f172a] lg:flex lg:flex-col lg:justify-between lg:p-12">
            {/* Decorative pattern */}
            <div
               className="pointer-events-none absolute inset-0 opacity-[0.07]"
               style={{
                  backgroundImage:
                     "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "32px 32px",
               }}
               aria-hidden="true"
            />

            {/* Large watermark logo */}
            <div className="pointer-events-none absolute -bottom-12 -right-12 opacity-[0.08]" aria-hidden="true">
               <Image
                  src="/jr-mark.png"
                  alt=""
                  width={420}
                  height={420}
                  className="select-none"
               />
            </div>

            {/* Top: Logo + system name */}
            <div className="relative z-10 flex flex-col gap-6">
               <div className="flex items-center gap-3">
                  <Image
                     src="/jr-mark.png"
                     alt="Logo Jasa Raharja"
                     width={48}
                     height={48}
                     priority
                     className="drop-shadow-lg"
                  />
                  <div className="leading-tight">
                     <p className="text-lg font-bold tracking-tight text-white">
                        IWKBU Terminal
                     </p>
                     <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                        Jasa Raharja
                     </p>
                  </div>
               </div>
            </div>

            {/* Center: Tagline */}
            <div className="relative z-10 max-w-sm">
               <h1 className="text-3xl font-extrabold leading-snug tracking-tight text-white">
                  Sistem Integrasi
                  <br />
                  Terminal IWKBU
               </h1>
               <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Pencatatan, verifikasi, dan rekonsiliasi operasional terminal
                  yang terintegrasi dengan sistem pusat Jasa Raharja.
               </p>
            </div>

            {/* Bottom: Feature highlights */}
            <div className="relative z-10 grid grid-cols-1 gap-3">
               {[
                  { icon: ShieldCheck, label: "Verifikasi & Validasi Terjamin" },
                  { icon: Bus, label: "Manajemen Armada Real-Time" },
                  { icon: FileCheck2, label: "Rekonsiliasi Otomatis" },
                  { icon: TrendingUp, label: "Analitik & Laporan Terpadu" },
               ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                     <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                        <f.icon className="size-4.5 text-white/90" aria-hidden="true" />
                     </div>
                     <span className="text-sm font-medium text-white/80">
                        {f.label}
                     </span>
                  </div>
               ))}
            </div>
         </div>

         {/* === RIGHT: Form panel === */}
         <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
            <div className="w-full max-w-sm">
               {/* Mobile logo (hidden on desktop where left panel shows) */}
               <div className="mb-8 flex justify-center lg:hidden">
                  <div className="flex flex-col items-center gap-3">
                     <Image
                        src="/jr-mark.png"
                        alt="Logo Jasa Raharja"
                        width={56}
                        height={56}
                        priority
                        className="object-contain"
                     />
                     <div className="text-center leading-tight">
                        <p className="text-lg font-bold tracking-tight text-base-content">
                           IWKBU Terminal
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-base-content/50">
                           Jasa Raharja
                        </p>
                     </div>
                  </div>
               </div>

               {/* Form heading */}
               <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-base-content">
                     Selamat Datang
                  </h2>
                  <p className="mt-1 text-sm text-base-content/60">
                     Masuk ke dashboard untuk melanjutkan
                  </p>
               </div>

               <LoginForm />

               {/* Footer */}
               <p className="mt-8 text-center text-xs text-base-content/40">
                  &copy; {new Date().getFullYear()} PT Jasa Raharja (Persero)
               </p>
            </div>
         </div>
      </main>
   );
}
