import { LoginForm } from "@/components/auth/login-form";
import { JRBrand } from "@/components/brand/jr-brand";

export default function LoginPage() {
   return (
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
         {/* Background watermark */}
         <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]"
            aria-hidden="true"
         >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
               src="/jr-logo.png"
               alt=""
               width={400}
               height={400}
               className="select-none"
            />
         </div>

         <div className="card relative w-full max-w-md rounded-2xl border border-base-300 bg-base-100/95 p-8 shadow-lg backdrop-blur-sm sm:p-10">
            {/* Brand identity */}
            <div className="mb-8 flex justify-center">
               <JRBrand size="lg" orientation="stacked" />
            </div>

            <div className="mb-6 flex items-center gap-3">
               <div className="h-px flex-1 bg-base-300" />
               <span className="text-xs font-medium uppercase tracking-widest text-base-content/40">
                  Masuk
               </span>
               <div className="h-px flex-1 bg-base-300" />
            </div>

             <LoginForm />
         </div>
      </main>
   );
}
