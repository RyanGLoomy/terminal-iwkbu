import { LoginForm } from "@/components/auth/login-form";
import { Bus } from "lucide-react";

export default function LoginPage() {
   return (
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
         <div className="card w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm sm:p-10">
            {/* Logo + judul */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
               <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-content">
                  <Bus className="size-7" aria-hidden="true" />
               </div>
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-base-content">
                     IWKBU Terminal
                  </h1>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-base-content/60">
                     Jasa Raharja
                  </p>
               </div>
            </div>

            <h2 className="mb-6 text-center text-lg font-semibold text-base-content">
               Masuk ke dashboard
            </h2>

            <LoginForm />
         </div>
      </main>
   );
}
