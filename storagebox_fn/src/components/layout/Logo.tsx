import { cn } from "@/lib/utils";

export function Logo({ className, isLight = false }: { className?: string; isLight?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/logo.svg" alt="" className="size-9" />
      <span className={cn("text-xl font-extrabold tracking-tight", isLight ? "text-white" : "text-foreground")}>
        Storage<span className={isLight ? "text-indigo-200" : "text-primary"}>Box</span>
      </span>
    </span>
  );
}
