import { useState } from "react";
import { Ban, Building2, CheckCircle2, Clock, Files, HardDrive, Inbox, Mail, UserCheck, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, UsageBar } from "@/components/shared/StatCard";
import { ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccounts, usePlatformStats, useUpdateAccount } from "@/features/developer/hooks";
import { formatBytes, formatDate, percentOf } from "@/lib/format";
import type { AdminAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

const BYTES_PER_GB = 1024 ** 3;
const DEFAULT_QUOTA_GB = 5;
const QUOTA_PRESETS_GB = [1, 5, 10, 25, 50, 100];

type StorageDialogState = { account: AdminAccount; mode: "approve" | "quota" } | null;

const toGb = (bytes: number): string => String(+(bytes / BYTES_PER_GB).toFixed(2));

function StorageDialog({ state, onClose }: { state: NonNullable<StorageDialogState>; onClose: () => void }) {
  const { account, mode } = state;
  const isApproval = mode === "approve";
  const [quotaGb, setQuotaGb] = useState(isApproval ? String(DEFAULT_QUOTA_GB) : toGb(account.quotaBytes));
  const updateAccount = useUpdateAccount();
  const value = Number(quotaGb);

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      icon={isApproval ? <UserCheck /> : <HardDrive />}
      title={isApproval ? `Approve ${account.owner?.name ?? account.name}` : `Storage for ${account.name}`}
      description={isApproval ? "Choose how much storage this account gets. You can change it later." : `Currently using ${formatBytes(account.storageBytes)}.`}
      submitLabel={isApproval ? "Approve account" : "Save storage"}
      isPending={updateAccount.isPending}
      canSubmit={value >= 0.1}
      onSubmit={() =>
        updateAccount.mutate({ id: account.id, quotaGb: value, ...(isApproval && { status: "ACTIVE" as const }) }, { onSuccess: onClose })
      }
    >
      <FormField label="Storage (GB)" htmlFor="quota-gb">
        <Input
          id="quota-gb"
          inputMode="decimal"
          autoFocus
          value={quotaGb}
          onChange={(event) => setQuotaGb(event.target.value.replace(/[^\d.]/g, ""))}
          className={INPUT_CLASS}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        {QUOTA_PRESETS_GB.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuotaGb(String(preset))}
            className={cn(
              "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
              value === preset ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {preset} GB
          </button>
        ))}
      </div>
    </FormDialog>
  );
}

function StatusBadge({ account }: { account: AdminAccount }) {
  if (account.status === "PENDING") return <Badge className="bg-tone-warning-bg text-tone-warning">Pending</Badge>;
  if (account.status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  if (account.isSuspended) return <Badge variant="destructive">Suspended</Badge>;
  return <Badge className="bg-tone-success-bg text-tone-success">Active</Badge>;
}

type RequestActions = { onApprove: (account: AdminAccount) => void; onReject: (account: AdminAccount) => void };

function AccessRequests({ requests, onApprove, onReject }: { requests: AdminAccount[] } & RequestActions) {
  return (
    <section className="mt-6 grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-tone-warning-bg text-tone-warning">
          <Inbox className="size-5" />
        </span>
        <div className="grid">
          <h2 className="text-lg font-semibold">Access requests</h2>
          <p className="text-sm text-muted-foreground">
            {requests.length ? `${requests.length} waiting for your review` : "No one is waiting — you're all caught up."}
          </p>
        </div>
      </div>
      {requests.length > 0 && (
        <ul className="grid gap-2">
          {requests.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid min-w-0 gap-0.5">
                <span className="truncate text-base font-semibold">{account.owner?.name ?? account.name}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{account.owner?.email}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" /> {account.name} · <Clock className="size-3.5" /> {formatDate(account.createdAt)}
                </span>
              </div>
              <span className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => onReject(account)}>
                  <XCircle /> Reject
                </Button>
                <Button onClick={() => onApprove(account)}>
                  <CheckCircle2 /> Approve
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const stats = usePlatformStats();
  const accounts = useAdminAccounts();
  const updateAccount = useUpdateAccount();
  const [storageDialog, setStorageDialog] = useState<StorageDialogState>(null);
  const [rejecting, setRejecting] = useState<AdminAccount | null>(null);

  if (stats.isLoading || accounts.isLoading) return <PageSkeleton />;
  if (stats.error || accounts.error) return <ErrorDisplay error={stats.error ?? accounts.error} />;

  const requests = accounts.data?.filter((account) => account.status === "PENDING") ?? [];
  const reviewed = accounts.data?.filter((account) => account.status !== "PENDING") ?? [];
  const approve = (account: AdminAccount) => setStorageDialog({ account, mode: "approve" });

  return (
    <>
      <PageHeader title="Admin" description="Review access requests and decide how much storage each account gets." />
      {stats.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending requests" value={stats.data.pendingCount} icon={Inbox} tone="amber" />
          <StatCard title="Accounts" value={stats.data.accountCount} icon={Building2} hint={`${stats.data.userCount} users`} />
          <StatCard title="Files" value={stats.data.fileCount.toLocaleString()} icon={Files} tone="emerald" />
          <StatCard title="Total storage" value={formatBytes(stats.data.storageBytes)} icon={HardDrive} tone="slate" />
        </div>
      )}

      <AccessRequests requests={requests} onApprove={approve} onReject={setRejecting} />

      <h2 className="mt-8 mb-3 text-lg font-semibold">Accounts</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              <TableHead className="min-w-48">Storage</TableHead>
              <TableHead className="hidden lg:table-cell">Files</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviewed.map((account) => {
              const isOwn = account.id === user?.accountId;
              const isRejected = account.status === "REJECTED";
              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <span className="grid">
                      <span className="text-base font-medium">{account.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{account.cloudName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="grid">
                      <span>{account.owner?.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{account.owner?.email}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="grid gap-1.5">
                      <span className="text-sm">
                        {formatBytes(account.storageBytes)} / {formatBytes(account.quotaBytes)}
                      </span>
                      <UsageBar percent={percentOf(account.storageBytes, account.quotaBytes)} />
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{account.fileCount}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(account.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge account={account} />
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-2">
                      {isRejected ? (
                        <Button variant="outline" size="sm" onClick={() => approve(account)}>
                          <CheckCircle2 /> Approve
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setStorageDialog({ account, mode: "quota" })}>
                          <HardDrive /> Storage
                        </Button>
                      )}
                      {!isOwn && !isRejected && (
                        <Button
                          variant={account.isSuspended ? "outline" : "destructive"}
                          size="sm"
                          disabled={updateAccount.isPending}
                          onClick={() => updateAccount.mutate({ id: account.id, isSuspended: !account.isSuspended })}
                        >
                          {account.isSuspended ? <CheckCircle2 /> : <Ban />}
                          {account.isSuspended ? "Reactivate" : "Suspend"}
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {storageDialog && <StorageDialog key={storageDialog.account.id} state={storageDialog} onClose={() => setStorageDialog(null)} />}
      <ConfirmDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.owner?.name ?? rejecting?.name ?? ""}?`}
        description="They won't be able to sign in. You can still approve the account later from the accounts table."
        confirmLabel="Reject request"
        isDestructive
        isPending={updateAccount.isPending}
        onConfirm={() => rejecting && updateAccount.mutate({ id: rejecting.id, status: "REJECTED" }, { onSuccess: () => setRejecting(null) })}
      />
    </>
  );
}
