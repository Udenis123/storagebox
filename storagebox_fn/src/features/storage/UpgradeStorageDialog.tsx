import { useState } from "react";
import { Check, Clock, HardDrive, Rocket, XCircle } from "lucide-react";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { UsageBar } from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BYTES_PER_GB, formatBytes, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLatestStorageRequest, useRequestStorage, useStorageHealth } from "./hooks";

const PLAN_SIZES_GB = [10, 25, 50, 100, 250, 500, 1000];
const PLANS_SHOWN = 4;

function RequestStatus() {
  const { data: request } = useLatestStorageRequest();
  if (!request || request.status === "APPROVED") return null;
  const isPending = request.status === "PENDING";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-3 text-sm ring-1",
        isPending ? "bg-tone-warning-bg text-tone-warning ring-tone-warning/20" : "bg-destructive/5 text-destructive ring-destructive/20",
      )}
    >
      {isPending ? <Clock className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
      <p>
        {isPending ? (
          <>
            You asked for <strong>{formatBytes(request.requestedBytes)}</strong> {timeAgo(request.createdAt)}. It is waiting for review —
            sending a new request replaces it.
          </>
        ) : (
          <>Your last request for {formatBytes(request.requestedBytes)} was declined. You can ask again with more details.</>
        )}
      </p>
    </div>
  );
}

export function UpgradeStorageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const health = useStorageHealth();
  const currentGb = (health?.quotaBytes ?? 0) / BYTES_PER_GB;
  const plans = PLAN_SIZES_GB.filter((size) => size > currentGb).slice(0, PLANS_SHOWN);
  const [quotaGb, setQuotaGb] = useState(String(plans[0] ?? Math.ceil(currentGb * 2)));
  const [reason, setReason] = useState("");
  const request = useRequestStorage(onClose);
  const value = Number(quotaGb);

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      icon={<Rocket />}
      title="Upgrade storage"
      description="Choose how much space you need. An administrator reviews the request and raises your limit."
      submitLabel="Send request"
      isPending={request.isPending}
      canSubmit={value > currentGb}
      onSubmit={() => request.mutate({ quotaGb: value, reason: reason.trim() || undefined })}
      size="lg"
    >
      {health && (
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <HardDrive className="size-4 text-muted-foreground" /> Current storage
            </span>
            <span className="text-muted-foreground">
              {formatBytes(health.usedBytes)} of {formatBytes(health.quotaBytes)}
            </span>
          </div>
          <UsageBar percent={health.percent} />
        </div>
      )}
      <RequestStatus />

      <div className="grid gap-2">
        <span className="text-sm font-medium md:text-base">New storage limit</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {plans.map((size) => {
            const isSelected = value === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setQuotaGb(String(size))}
                className={cn(
                  "relative grid gap-0.5 rounded-xl border p-3 text-left transition",
                  isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <span className="text-xl font-bold">{size >= 1000 ? `${size / 1000} TB` : `${size} GB`}</span>
                <span className="text-xs text-muted-foreground">+{formatBytes((size - currentGb) * BYTES_PER_GB)} more</span>
              </button>
            );
          })}
        </div>
      </div>

      <FormField label="Or enter an amount (GB)" htmlFor="upgrade-gb" error={value > currentGb || !quotaGb ? undefined : "Must be more than your current storage"}>
        <Input
          id="upgrade-gb"
          inputMode="decimal"
          value={quotaGb}
          onChange={(event) => setQuotaGb(event.target.value.replace(/[^\d.]/g, ""))}
          className={INPUT_CLASS}
        />
      </FormField>
      <FormField label="What do you need it for? (optional)" htmlFor="upgrade-reason">
        <Textarea
          id="upgrade-reason"
          rows={3}
          maxLength={500}
          placeholder="e.g. Product photos for the new online shop"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="text-base"
        />
      </FormField>
    </FormDialog>
  );
}
