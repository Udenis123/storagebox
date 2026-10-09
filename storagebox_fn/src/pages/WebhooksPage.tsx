import { useState } from "react";
import { Plus, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { CodeBlock, CopyField } from "@/components/shared/CopyField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { PageHeader, SectionTitle } from "@/components/shared/PageHeader";
import { EmptyState, ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useCreateWebhook, useDeleteWebhook, useTestWebhook, useUpdateWebhook, useWebhooks } from "@/features/developer/hooks";
import { timeAgo } from "@/lib/format";
import type { Webhook, WebhookEvent } from "@/lib/types";

const EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "file.uploaded", label: "File uploaded" },
  { value: "file.deleted", label: "File deleted" },
];

const VERIFY_SNIPPET = `import crypto from "node:crypto";

// Express: app.post("/hooks/storagebox", express.raw({ type: "application/json" }), handler)
function isValidSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
// signature = req.headers["x-storagebox-signature"]`;

function NewWebhookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["file.uploaded"]);
  const createWebhook = useCreateWebhook(() => {
    onOpenChange(false);
    setUrl("");
  });
  const isValidUrl = /^https?:\/\/\S+$/.test(url.trim());
  const toggle = (event: WebhookEvent) =>
    setEvents((current) => (current.includes(event) ? current.filter((value) => value !== event) : [...current, event]));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add webhook"
      description="StorageBox will POST a JSON event to this URL."
      icon={<WebhookIcon />}
      submitLabel="Add webhook"
      isPending={createWebhook.isPending}
      canSubmit={isValidUrl && events.length > 0}
      onSubmit={() => createWebhook.mutate({ url: url.trim(), events })}
    >
      <FormField label="Endpoint URL" htmlFor="webhook-url">
        <Input id="webhook-url" placeholder="https://example.com/hooks/storagebox" value={url} onChange={(event) => setUrl(event.target.value)} className={INPUT_CLASS} />
      </FormField>
      <div className="grid gap-2">
        <span className="text-sm font-medium md:text-base">Events</span>
        {EVENTS.map((event) => (
          <label key={event.value} className="flex min-h-11 items-center gap-3 rounded-lg border px-3">
            <Checkbox checked={events.includes(event.value)} onCheckedChange={() => toggle(event.value)} />
            <span className="text-base">{event.label}</span>
            <code className="ml-auto font-mono text-xs text-muted-foreground">{event.value}</code>
          </label>
        ))}
      </div>
    </FormDialog>
  );
}

function WebhookCard({ webhook, onDelete }: { webhook: Webhook; onDelete: () => void }) {
  const updateWebhook = useUpdateWebhook();
  const testWebhook = useTestWebhook();
  const isHealthy = webhook.lastStatus !== undefined && webhook.lastStatus >= 200 && webhook.lastStatus < 300;
  return (
    <li className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <span className="truncate font-mono text-base font-medium">{webhook.url}</span>
          <span className="flex flex-wrap gap-1.5">
            {webhook.events.map((event) => (
              <Badge key={event} variant="secondary">
                {event}
              </Badge>
            ))}
            {!webhook.isActive && <Badge variant="outline">Paused</Badge>}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={testWebhook.isPending} onClick={() => testWebhook.mutate(webhook.id)}>
            <Send /> Send test
          </Button>
          <Button variant="outline" onClick={() => updateWebhook.mutate({ id: webhook.id, isActive: !webhook.isActive })}>
            {webhook.isActive ? "Pause" : "Resume"}
          </Button>
          <Button variant="destructive" size="icon-lg" onClick={onDelete} aria-label="Delete webhook">
            <Trash2 />
          </Button>
        </div>
      </div>
      <CopyField label="Signing secret" value={webhook.secret} isSecret />
      <p className="text-sm text-muted-foreground">
        {webhook.lastAttemptAt ? (
          <>
            Last delivery {timeAgo(webhook.lastAttemptAt)} —{" "}
            <span className={isHealthy ? "text-tone-success" : "text-destructive"}>{webhook.lastStatus ? `HTTP ${webhook.lastStatus}` : "no response"}</span>
          </>
        ) : (
          "No deliveries yet"
        )}
      </p>
    </li>
  );
}

export default function WebhooksPage() {
  const { data: webhooks, isLoading, error } = useWebhooks();
  const [isCreating, setIsCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Webhook | null>(null);
  const deleteWebhook = useDeleteWebhook();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Get notified in your app when files are uploaded or deleted."
        actions={
          <Button size="lg" className="h-11 px-4 text-base" onClick={() => setIsCreating(true)}>
            <Plus /> Add webhook
          </Button>
        }
      />
      {!webhooks?.length ? (
        <EmptyState icon={<WebhookIcon />} title="No webhooks yet" action={<Button onClick={() => setIsCreating(true)}>Add a webhook</Button>} />
      ) : (
        <ul className="grid gap-4">
          {webhooks.map((webhook) => (
            <WebhookCard key={webhook.id} webhook={webhook} onDelete={() => setToDelete(webhook)} />
          ))}
        </ul>
      )}

      <section className="mt-8 grid gap-3">
        <SectionTitle>Verify the signature</SectionTitle>
        <p className="text-base text-muted-foreground">
          Every request carries <code className="font-mono">x-storagebox-signature</code>: an HMAC-SHA256 of the raw body using the webhook's signing secret.
        </p>
        <CodeBlock code={VERIFY_SNIPPET} />
      </section>

      <NewWebhookDialog open={isCreating} onOpenChange={setIsCreating} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete webhook?"
        description={toDelete?.url}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteWebhook.isPending}
        onConfirm={() => toDelete && deleteWebhook.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
