import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Rocket, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { UsageBar } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, percentOf, pluralize, timeAgo, toGb } from "@/lib/format";
import type { AdminStorageRequest } from "@/lib/types";
import { useAdminStorageRequests, useReviewStorageRequest } from "./hooks";

function ApproveDialog({ request, onClose }: { request: AdminStorageRequest; onClose: () => void }) {
  const [quotaGb, setQuotaGb] = useState(toGb(request.requestedBytes));
  const review = useReviewStorageRequest(onClose);
  const value = Number(quotaGb);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      icon={<Rocket />}
      title={`Upgrade ${request.account.name}`}
      description={`They asked for ${formatBytes(request.requestedBytes)}. You can grant a different amount.`}
      submitLabel="Approve upgrade"
      isPending={review.isPending}
      canSubmit={value >= 0.1}
      onSubmit={() => review.mutate({ id: request.id, status: "APPROVED", quotaGb: value })}
    >
      <FormField label="New storage limit (GB)" htmlFor="grant-gb" hint={`Currently ${formatBytes(request.account.quotaBytes)}`}>
        <Input
          id="grant-gb"
          inputMode="decimal"
          autoFocus
          value={quotaGb}
          onChange={(event) => setQuotaGb(event.target.value.replace(/[^\d.]/g, ""))}
          className={INPUT_CLASS}
        />
      </FormField>
    </FormDialog>
  );
}

function RequestRow({ request, onApprove, onDecline }: { request: AdminStorageRequest; onApprove: () => void; onDecline: () => void }) {
  const { account } = request;
  return (
    <li className="grid gap-3 rounded-lg border bg-muted/30 p-3 lg:grid-cols-[1fr_16rem_auto] lg:items-center">
      <div className="grid min-w-0 gap-1">
        <span className="truncate text-base font-semibold">{account.name}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-mono">{account.cloudName}</span> · <Clock className="size-3.5" /> {timeAgo(request.createdAt)}
        </span>
        {request.reason && <p className="text-sm text-foreground/80">“{request.reason}”</p>}
      </div>
      <div className="grid gap-1.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {formatBytes(account.quotaBytes)} <ArrowRight className="size-3.5 text-muted-foreground" />
          <span className="text-primary">{formatBytes(request.requestedBytes)}</span>
        </span>
        <UsageBar percent={percentOf(account.storageBytes, account.quotaBytes)} />
        <span className="text-xs text-muted-foreground">{formatBytes(account.storageBytes)} used</span>
      </div>
      <span className="flex gap-2 lg:justify-end">
        <Button variant="outline" onClick={onDecline}>
          <XCircle /> Decline
        </Button>
        <Button onClick={onApprove}>
          <CheckCircle2 /> Approve
        </Button>
      </span>
    </li>
  );
}

export function AdminStorageRequests() {
  const { data: requests = [] } = useAdminStorageRequests();
  const [approving, setApproving] = useState<AdminStorageRequest | null>(null);
  const [declining, setDeclining] = useState<AdminStorageRequest | null>(null);
  const review = useReviewStorageRequest(() => setDeclining(null));

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Rocket className="size-5" />
        </span>
        <div className="grid">
          <h2 className="text-lg font-semibold">Storage upgrade requests</h2>
          <p className="text-sm text-muted-foreground">
            {requests.length ? `${pluralize(requests.length, "account")} asking for more space` : "No upgrade requests right now."}
          </p>
        </div>
      </div>
      {requests.length > 0 && (
        <ul className="grid gap-2">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} onApprove={() => setApproving(request)} onDecline={() => setDeclining(request)} />
          ))}
        </ul>
      )}

      {approving && <ApproveDialog key={approving.id} request={approving} onClose={() => setApproving(null)} />}
      <ConfirmDialog
        open={Boolean(declining)}
        onOpenChange={(open) => !open && setDeclining(null)}
        title={`Decline ${declining?.account.name ?? ""}'s request?`}
        description="Their storage limit stays the same. They can send a new request later."
        confirmLabel="Decline request"
        isDestructive
        isPending={review.isPending}
        onConfirm={() => declining && review.mutate({ id: declining.id, status: "DECLINED" })}
      />
    </section>
  );
}
