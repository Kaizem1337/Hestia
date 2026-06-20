import Link from "next/link";
import { LineChart } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-semibold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" />
          </span>
          Hestia
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
