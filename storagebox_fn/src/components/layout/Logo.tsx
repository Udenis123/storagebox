import { cn } from "@/lib/utils";

type LogoProps = { className?: string; isLight?: boolean; isCompact?: boolean };

export function Logo({ className, isLight = false, isCompact = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/logo.svg" alt="" className="size-9 shrink-0" />
      {!isCompact && (
        <span className={cn("text-xl font-extrabold tracking-tight", isLight ? "text-white" : "text-foreground")}>
          Storage<span className={isLight ? "text-indigo-200" : "text-primary"}>Box</span>
        </span>
      )}
    </span>
  );
}
