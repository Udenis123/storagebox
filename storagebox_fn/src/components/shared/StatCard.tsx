import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAT_TONES = {
  brand: "bg-primary/10 text-primary",
  emerald: "bg-tone-success-bg text-tone-success",
  amber: "bg-tone-warning-bg text-tone-warning",
  slate: "bg-muted text-muted-foreground",
} as const;

type StatCardProps = {
  title: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONES;
  children?: ReactNode;
};

export function StatCard({ title, value, hint, icon: Icon, tone = "brand", children }: StatCardProps) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground md:text-base">{title}</span>
        <span className={cn("flex size-10 items-center justify-center rounded-lg", STAT_TONES[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      <span className="text-2xl font-bold tracking-tight lg:text-3xl">{value}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      {children}
    </div>
  );
}

export function UsageBar({ percent }: { percent: number }) {
  const tone = percent >= 90 ? "bg-destructive" : percent >= 70 ? "bg-tone-warning" : "bg-primary";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(percent)}>
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(percent, 1)}%` }} />
    </div>
  );
}
