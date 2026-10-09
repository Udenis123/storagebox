import { useState } from "react";
import { Activity, FileUp, FileX, Folder, KeyRound, Settings, ShieldCheck, Webhook } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { ACTIVITY_PAGE_SIZE, useActivity } from "@/features/developer/hooks";
import { formatDateTime, timeAgo } from "@/lib/format";

const ACTION_TEXT: Record<string, string> = {
  "file.uploaded": "uploaded",
  "file.updated": "updated",
  "file.deleted": "deleted",
  "collection.created": "created collection",
  "collection.updated": "updated collection",
  "collection.deleted": "deleted collection",
  "api_key.created": "created API key",
  "api_key.revoked": "revoked API key",
  "webhook.created": "added webhook",
  "webhook.deleted": "removed webhook",
  "admin.account_updated": "updated account",
  "admin.account_approved": "approved account",
  "admin.account_rejected": "rejected account",
  "admin.storage_approved": "upgraded storage for",
  "admin.storage_declined": "declined a storage request from",
  "storage.requested": "requested storage of",
};

const iconFor = (action: string) => {
  if (action === "file.deleted") return FileX;
  if (action.startsWith("file.")) return FileUp;
  if (action.startsWith("collection.")) return Folder;
  if (action.startsWith("api_key.")) return KeyRound;
  if (action.startsWith("webhook.")) return Webhook;
  if (action.startsWith("admin.")) return ShieldCheck;
  return Settings;
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useActivity(page);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorDisplay error={error} />;

  return (
    <>
      <PageHeader title="Activity" description="Everything that happened in your account, newest first." />
      {data.items.length === 0 ? (
        <EmptyState icon={<Activity />} title="No activity yet" />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {data.items.map((entry) => {
            const Icon = iconFor(entry.action);
            return (
              <li key={entry.id} className="flex items-start gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="text-base">
                    <span className="font-semibold">{entry.actor}</span> {ACTION_TEXT[entry.action] ?? entry.action}{" "}
                    {entry.target && <span className="font-medium break-all">“{entry.target}”</span>}
                  </p>
                  <p className="text-sm text-muted-foreground" title={formatDateTime(entry.createdAt)}>
                    {timeAgo(entry.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(data.total / ACTIVITY_PAGE_SIZE)} pageSize={ACTIVITY_PAGE_SIZE} total={data.total} onChange={setPage} />
    </>
  );
}
