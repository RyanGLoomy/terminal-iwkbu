import { LoginForm } from "@/components/auth/login-form";
import { Bus } from "lucide-react";

export default function LoginPage() {
   return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
         {/* Fullscreen background */}
         <div className="fixed inset-0 -z-10 bg-gradient-to-br from-brand-navy via-brand-ink to-brand-navy" />

         {/* Radial glow */}
         <div
            className="fixed inset-0 -z-10"
            style={{
               background:
                  "radial-gradient(circle at 50% 30%, hsl(var(--brand-sky) / 0.18), transparent 40rem)",
            }}
         />

         {/* Grid pattern overlay */}
         <div
            className="fixed inset-0 -z-10 opacity-[0.07]"
            style={{
               backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
               backgroundSize: "48px 48px",
               maskImage:
                  "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
         />

         {/* Gold accent glow */}
         <div
            className="fixed bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full opacity-20 blur-[100px]"
            style={{ background: "hsl(var(--brand-gold))" }}
         />

         {/* Glass card */}
         <div className="glass w-full max-w-md rounded-3xl border-white/20 p-8 shadow-2xl sm:p-10">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
               <div className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                  <Bus className="size-7 text-brand-gold" />
               </div>
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                     IWKBU Terminal
                  </h1>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                     Jasa Raharja
                  </p>
               </div>
            </div>

            <LoginForm />
         </div>
      </main>
   );
}
