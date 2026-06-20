import { cn } from "@/lib/utils";

/** Returns a tone class for a signed number (green up / red down / muted flat). */
export function toneClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0)
    return "text-muted-foreground";
  return value > 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]";
}

export function ChangeText({
  value,
  children,
  className,
}: {
  value: number | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("tabular", toneClass(value), className)}>{children}</span>;
}
