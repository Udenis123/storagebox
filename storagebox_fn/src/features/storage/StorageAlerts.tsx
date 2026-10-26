import { AlertTriangle, CheckCircle2, Clock, HardDrive, Rocket, XCircle } from "lucide-react";
import { UsageBar } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { formatBytes, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLatestStorageRequest, useStorageHealth, type StorageLevel } from "./hooks";
import { useStorageUpgrade } from "./upgradeContext";

const BANNER_TEXT: Record<Exclude<StorageLevel, "ok">, { title: string; body: string }> = {
  warning: { title: "Storage is filling up", body: "You have used most of your space. Ask for more before uploads stop." },
  critical: { title: "Storage is almost full", body: "Only a little space is left. New uploads will soon be blocked." },
  full: { title: "Storage is full", body: "New uploads are blocked. Delete files or upgrade your storage." },
};

function useHasPendingRequest(): boolean {
  const { data: request } = useLatestStorageRequest();
  return request?.status === "PENDING";
}

/** Sidebar usage meter; turns amber / red as the account fills up and offers an upgrade. */
export function StorageMeter({ isCompact = false }: { isCompact?: boolean }) {
  const health = useStorageHealth();
  const { openUpgrade } = useStorageUpgrade();
  const isPending = useHasPendingRequest();
  if (!health) return null;
  const isHigh = health.level !== "ok";

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={openUpgrade}
        title={`Storage: ${formatBytes(health.usedBytes)} of ${formatBytes(health.quotaBytes)}`}
        aria-label={`Storage ${Math.round(health.percent)}% used. Upgrade storage`}
        className={cn(
          "grid justify-items-center gap-1 rounded-xl border px-1 py-2 text-xs font-semibold transition-colors hover:bg-muted",
          isHigh ? "border-tone-warning/30 bg-tone-warning-bg/60" : "bg-muted/40",
          health.level === "full" && "text-destructive",
        )}
      >
        <HardDrive className="size-4" />
        {Math.round(health.percent)}%
      </button>
    );
  }

  return (
    <div className={cn("grid gap-2 rounded-xl border p-3", isHigh ? "border-tone-warning/30 bg-tone-warning-bg/60" : "bg-muted/40")}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">Storage</span>
        <span className={cn("font-medium", health.level === "full" ? "text-destructive" : "text-muted-foreground")}>
          {Math.round(health.percent)}%
        </span>
      </div>
      <UsageBar percent={health.percent} />
      <p className="text-xs text-muted-foreground">
        {formatBytes(health.usedBytes)} of {formatBytes(health.quotaBytes)}
      </p>
      {isPending ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-tone-warning">
          <Clock className="size-3.5" /> Upgrade requested
        </p>
      ) : (
        <Button variant={isHigh ? "default" : "outline"} size="sm" className="w-full" onClick={openUpgrade}>
          <Rocket /> Upgrade storage
        </Button>
      )}
    </div>
  );
}

/** Page-wide notice once usage passes the warning threshold. */
export function StorageBanner() {
  const health = useStorageHealth();
  const { openUpgrade } = useStorageUpgrade();
  const isPending = useHasPendingRequest();
  if (!health || health.level === "ok") return null;
  const text = BANNER_TEXT[health.level];
  const isFull = health.level === "full";

  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-center",
        isFull ? "bg-destructive/5 text-destructive ring-destructive/20" : "bg-tone-warning-bg text-tone-warning ring-tone-warning/20",
      )}
    >
      <AlertTriangle className="size-5 shrink-0" />
      <div className="grid flex-1 gap-0.5">
        <p className="font-semibold">
          {text.title} — {Math.round(health.percent)}% used
        </p>
        <p className="text-sm opacity-90">{isPending ? "Your upgrade request is waiting for an administrator." : text.body}</p>
      </div>
      {!isPending && (
        <Button size="lg" variant={isFull ? "destructive" : "default"} onClick={openUpgrade}>
          <Rocket /> Upgrade storage
        </Button>
      )}
    </div>
  );
}

/** Settings card: current plan, the latest upgrade request and a way to ask for more. */
export function StoragePlanCard() {
  const health = useStorageHealth();
  const { data: request } = useLatestStorageRequest();
  const { openUpgrade } = useStorageUpgrade();
  if (!health) return null;
  const isPending = request?.status === "PENDING";

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HardDrive className="size-5" />
          </span>
          <div className="grid">
            <h2 className="text-lg font-semibold">Storage</h2>
            <p className="text-sm text-muted-foreground">{formatBytes(health.freeBytes)} free</p>
          </div>
        </div>
        {!isPending && (
          <Button onClick={openUpgrade}>
            <Rocket /> Upgrade
          </Button>
        )}
      </div>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <strong className="text-2xl font-bold">{formatBytes(health.usedBytes)}</strong>
            <span className="text-muted-foreground"> of {formatBytes(health.quotaBytes)}</span>
          </span>
          <span className="font-medium text-muted-foreground">{Math.round(health.percent)}%</span>
        </div>
        <UsageBar percent={health.percent} />
      </div>
      {request && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {request.status === "PENDING" && <Clock className="size-4 text-tone-warning" />}
          {request.status === "APPROVED" && <CheckCircle2 className="size-4 text-tone-success" />}
          {request.status === "DECLINED" && <XCircle className="size-4 text-destructive" />}
          {request.status === "PENDING" && `Upgrade to ${formatBytes(request.requestedBytes)} requested ${timeAgo(request.createdAt)}`}
          {request.status === "APPROVED" && `Upgraded to ${formatBytes(request.grantedBytes ?? request.requestedBytes)} ${timeAgo(request.reviewedAt ?? request.createdAt)}`}
          {request.status === "DECLINED" && `Upgrade request declined ${timeAgo(request.reviewedAt ?? request.createdAt)}`}
        </p>
      )}
    </section>
  );
}
