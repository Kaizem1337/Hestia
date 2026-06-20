import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground",
        className
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

type BadgeTone = "neutral" | "positive" | "negative" | "accent" | "warning";
const tones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-[hsl(var(--positive)/0.15)] text-[hsl(var(--positive))]",
  negative: "bg-[hsl(var(--negative)/0.15)] text-[hsl(var(--negative))]",
  accent: "bg-accent text-accent-foreground",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--negative)/0.4)] bg-[hsl(var(--negative)/0.08)] p-4 text-sm text-[hsl(var(--negative))]">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-semibold underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
