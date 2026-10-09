import { useState } from "react";
import { Ban, Building2, CheckCircle2, Files, HardDrive, Users } from "lucide-react";
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

const BYTES_PER_GB = 1024 ** 3;

function QuotaDialog({ account, onClose }: { account: AdminAccount | null; onClose: () => void }) {
  const [quotaGb, setQuotaGb] = useState("");
  const updateAccount = useUpdateAccount();
  const value = Number(quotaGb);
  return (
    <FormDialog
      open={Boolean(account)}
      onOpenChange={(open) => {
        if (open && account) setQuotaGb(String(+(account.quotaBytes / BYTES_PER_GB).toFixed(2)));
        if (!open) onClose();
      }}
      title={`Storage quota — ${account?.name ?? ""}`}
      submitLabel="Save quota"
      isPending={updateAccount.isPending}
      canSubmit={value >= 0.1}
      onSubmit={() => account && updateAccount.mutate({ id: account.id, quotaGb: value }, { onSuccess: onClose })}
    >
      <FormField label="Quota (GB)" htmlFor="quota-gb" hint={account ? `Currently using ${formatBytes(account.storageBytes)}` : undefined}>
        <Input id="quota-gb" inputMode="decimal" value={quotaGb} onChange={(event) => setQuotaGb(event.target.value.replace(/[^\d.]/g, ""))} className={INPUT_CLASS} />
      </FormField>
    </FormDialog>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const stats = usePlatformStats();
  const accounts = useAdminAccounts();
  const updateAccount = useUpdateAccount();
  const [editing, setEditing] = useState<AdminAccount | null>(null);

  if (stats.isLoading || accounts.isLoading) return <PageSkeleton />;
  if (stats.error || accounts.error) return <ErrorDisplay error={stats.error ?? accounts.error} />;

  return (
    <>
      <PageHeader title="Admin" description="Platform-wide accounts, storage and quotas." />
      {stats.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Accounts" value={stats.data.accountCount} icon={Building2} />
          <StatCard title="Users" value={stats.data.userCount} icon={Users} tone="emerald" />
          <StatCard title="Files" value={stats.data.fileCount.toLocaleString()} icon={Files} tone="amber" />
          <StatCard title="Total storage" value={formatBytes(stats.data.storageBytes)} icon={HardDrive} tone="slate" />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
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
            {accounts.data?.map((account) => {
              const isOwn = account.id === user?.accountId;
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
                  <TableCell>{account.isSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(account)}>
                        Quota
                      </Button>
                      {!isOwn && (
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
      <QuotaDialog account={editing} onClose={() => setEditing(null)} />
    </>
  );
}
