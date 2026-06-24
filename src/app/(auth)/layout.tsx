import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-80" />
      <div className="pointer-events-none absolute left-[-12rem] top-[-14rem] h-[30rem] w-[30rem] rounded-full bg-brand-sky/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-brand-gold/15 blur-3xl" />
      <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-end px-4 py-4 sm:px-6 lg:px-8">
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
