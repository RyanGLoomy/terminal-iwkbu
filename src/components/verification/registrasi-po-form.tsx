"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Building2, LockKeyhole } from "lucide-react";
import { registerPO } from "@/lib/supabase/queries/verification.client";
import {
   passwordSchema,
   PASSWORD_REQUIREMENTS,
   isPasswordLeaked,
} from "@/lib/auth/password-policy";

const formSchema = z
   .object({
      email: z.string().email("Email tidak valid"),
      password: passwordSchema,
      confirmPassword: z.string(),
      kode_po: z.string().min(3, "Kode PO minimal 3 karakter"),
      nama_perusahaan: z.string().min(3, "Nama perusahaan wajib diisi"),
      nama_pemilik: z.string().optional(),
      telepon: z.string().optional(),
      alamat: z.string().optional(),
      npwp: z.string().optional(),
   })
   .refine((data) => data.password === data.confirmPassword, {
      message: "Password tidak cocok",
      path: ["confirmPassword"],
   });

function FieldError({ message }: { message?: string }) {
   if (!message) return null;

   return <p className="text-xs font700 text-destructive">{message}</p>;
}

export function RegistrasiPOForm() {
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState(false);
   const router = useRouter();

   const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
         email: "",
         password: "",
         confirmPassword: "",
         kode_po: "",
         nama_perusahaan: "",
         nama_pemilik: "",
         telepon: "",
         alamat: "",
         npwp: "",
      },
   });

   const passwordValue = form.watch("password");

   async function onSubmit(values: z.infer<typeof formSchema>) {
      setLoading(true);
      setError(null);

      try {
         // AUTH-02 mitigation: reject passwords known to be leaked (HIBP).
         // Fail-open on HIBP outage; the strong-policy check still applies.
         if (await isPasswordLeaked(values.password)) {
            setError(
               "Password ini ditemukan dalam data kebocoran publik (HaveIBeenPwned). Mohon gunakan password lain.",
            );
            return;
         }

         await registerPO({
            email: values.email,
            password: values.password,
            kode_po: values.kode_po,
            nama_perusahaan: values.nama_perusahaan,
            nama_pemilik: values.nama_pemilik,
            telepon: values.telepon,
            alamat: values.alamat,
            npwp: values.npwp,
         });
         setSuccess(true);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Registrasi gagal. Silakan coba lagi.");
      } finally {
         setLoading(false);
      }
   }

   if (success) {
      return (
         <Card className="command-panel rounded-3xl">
            <CardContent className="pb-8 pt-8 text-center">
               <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-green/15 ring-1 ring-brand-green/30">
                   <CheckCircle className="h-7 w-7 text-brand-green dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 text-xl font800 tracking-tight text-foreground">
                   Registrasi Berhasil!
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
                   Akun Anda telah terdaftar dan sedang menunggu verifikasi dari
                   Staf IW Jasa Raharja. Anda akan menerima email notifikasi
                   setelah akun diverifikasi.
                </p>
               <Button
                  onClick={() => router.push("/login")}
                  className="h-11 w-full"
                >
                  Kembali ke Login
               </Button>
            </CardContent>
         </Card>
      );
   }

   return (
      <Card className="command-panel rounded-3xl">
         <CardHeader className="border-b border-border pb-5">
            <div className="mb-3 inline-flex w-fit rounded-full border border-brand-sky/20 bg-secondary px-3 py-1 text-xs font800 uppercase tracking-[0.12em] text-brand-navy dark:text-brand-sky">
               Data pengajuan
            </div>
            <CardTitle>Form Registrasi PO</CardTitle>
            <CardDescription>
               Lengkapi data perusahaan Anda. Semua field bertanda * wajib
               diisi.
            </CardDescription>
         </CardHeader>
         <form onSubmit={form.handleSubmit(onSubmit)}>
             <CardContent className="space-y-5 pt-6">
                {error && (
                   <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                   </Alert>
                )}

                <div className="flex items-center gap-3 rounded-2xl border border-brand-sky/20 bg-secondary/70 px-4 py-3">
                   <Building2 className="h-5 w-5 text-brand-sky" />
                   <div>
                      <p className="text-sm font800 text-foreground">Identitas perusahaan</p>
                      <p className="text-xs text-muted-foreground">Data ini digunakan untuk proses verifikasi PO.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                     <Label htmlFor="kode_po">Kode PO *</Label>
                      <Input
                         id="kode_po"
                         placeholder="PO001"
                         autoCapitalize="characters"
                         aria-invalid={!!form.formState.errors.kode_po}
                         {...form.register("kode_po")}
                      />
                      <FieldError message={form.formState.errors.kode_po?.message} />
                   </div>
                  <div className="space-y-2">
                     <Label htmlFor="nama_perusahaan">Nama Perusahaan *</Label>
                      <Input
                         id="nama_perusahaan"
                         placeholder="PT. Sinar Jaya"
                         aria-invalid={!!form.formState.errors.nama_perusahaan}
                         {...form.register("nama_perusahaan")}
                      />
                       <FieldError message={form.formState.errors.nama_perusahaan?.message} />
                    </div>
                 </div>

               <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                     id="email"
                     type="email"
                     autoComplete="email"
                     placeholder="po@perusahaan.com"
                     aria-invalid={!!form.formState.errors.email}
                     {...form.register("email")}
                  />
                  <FieldError message={form.formState.errors.email?.message} />
                 </div>

                 <div className="flex items-center gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/10 px-4 py-3">
                    <LockKeyhole className="h-5 w-5 text-brand-green" />
                    <div>
                       <p className="text-sm font800 text-foreground">Akses akun</p>
                       <p className="text-xs text-muted-foreground">Password akan dipakai setelah akun diverifikasi.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                   <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                         id="password"
                         type="password"
                         autoComplete="new-password"
                         aria-invalid={!!form.formState.errors.password}
                         {...form.register("password")}
                      />
                       <FieldError message={form.formState.errors.password?.message} />
                    </div>
                   <div className="space-y-2">
                     <Label htmlFor="confirmPassword">
                        Konfirmasi Password *
                     </Label>
                       <Input
                         id="confirmPassword"
                         type="password"
                         autoComplete="new-password"
                         aria-invalid={!!form.formState.errors.confirmPassword}
                         {...form.register("confirmPassword")}
                      />
                        <FieldError message={form.formState.errors.confirmPassword?.message} />
                     </div>
                  </div>

                  <ul
                     className="grid grid-cols-1 gap-1.5 rounded-2xl border border-border/70 bg-card/50 px-4 py-3 sm:grid-cols-2"
                     aria-describedby="password"
                  >
                     {PASSWORD_REQUIREMENTS.map((req) => {
                        const ok = req.test(passwordValue || "");
                        return (
                           <li
                              key={req.label}
                              className={`flex items-center gap-2 text-xs font700 ${
                                 ok ? "text-brand-green dark:text-emerald-400" : "text-muted-foreground"
                              }`}
                           >
                              <CheckCircle
                                 className={`h-3.5 w-3.5 shrink-0 ${ok ? "opacity-100" : "opacity-30"}`}
                              />
                              {req.label}
                           </li>
                        );
                     })}
                  </ul>

                  <div className="space-y-2">
                     <Label htmlFor="nama_pemilik">Nama Pemilik/Direktur</Label>
                  <Input id="nama_pemilik" {...form.register("nama_pemilik")} />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="telepon">Nomor Telepon</Label>
                  <Input
                     id="telepon"
                     placeholder="0812xxxxxxx"
                     inputMode="tel"
                     autoComplete="tel"
                     {...form.register("telepon")}
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input id="alamat" {...form.register("alamat")} />
               </div>

                <div className="space-y-2">
                   <Label htmlFor="npwp">NPWP</Label>
                   <Input
                      id="npwp"
                      placeholder="00.000.000.0-000.000"
                      inputMode="numeric"
                      {...form.register("npwp")}
                   />
                </div>
             </CardContent>
             <CardFooter className="flex-col gap-3 border-t border-border pt-5">
                <Button
                   type="submit"
                   className="h-11 w-full text-[15px]"
                   disabled={loading}
                >
                  {loading ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim registrasi...
                     </>
                  ) : (
                     <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Kirim registrasi
                     </>
                  )}
                </Button>
            </CardFooter>
         </form>
      </Card>
   );
}
