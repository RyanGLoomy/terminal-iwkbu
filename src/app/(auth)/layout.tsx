import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-base-200 text-base-content">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent)",
        }}
      />
      <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-end px-4 py-4 sm:px-6 lg:px-8">
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
