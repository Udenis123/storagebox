import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorDisplay({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-tone-danger/30 bg-tone-danger-bg p-4 text-tone-danger">
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <p className="text-base">{message}</p>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-1/2 max-w-sm" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

type EmptyStateProps = { title: string; description?: string; action?: ReactNode; icon?: ReactNode };

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center md:p-12">
      <span className="text-muted-foreground [&_svg]:size-10">{icon ?? <Inbox />}</span>
      <p className="text-base font-semibold md:text-lg">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground md:text-base">{description}</p>}
      {action}
    </div>
  );
}
