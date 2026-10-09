import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, KeyRound, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CopyField } from "@/components/shared/CopyField";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { EmptyState, ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/features/developer/hooks";
import { timeAgo } from "@/lib/format";
import type { ApiKey, ApiKeyScope, CreatedApiKey } from "@/lib/types";

const SCOPE_OPTIONS = [
  { value: "READ_WRITE", label: "Read & write", description: "Upload, update and delete files" },
  { value: "READ", label: "Read only", description: "List files and create signed links" },
];

function NewKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (key: CreatedApiKey) => void }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>("READ_WRITE");
  const createKey = useCreateApiKey((key) => {
    onOpenChange(false);
    setName("");
    onCreated(key);
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create API key"
      description="Give the key a name so you know which app uses it."
      icon={<KeyRound />}
      submitLabel="Create key"
      isPending={createKey.isPending}
      canSubmit={name.trim().length > 0}
      onSubmit={() => createKey.mutate({ name: name.trim(), scope })}
    >
      <FormField label="Name" htmlFor="key-name">
        <Input id="key-name" placeholder="e.g. Production website" value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} autoFocus />
      </FormField>
      <FormField label="Permissions" htmlFor="key-scope">
        <SearchableSelect options={SCOPE_OPTIONS} value={scope} onChange={(value) => setScope(value as ApiKeyScope)} />
      </FormField>
    </FormDialog>
  );
}

function RevealKeyDialog({ apiKey, onClose }: { apiKey: CreatedApiKey | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(apiKey)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="text-xl font-semibold">Your new API key</DialogTitle>
        <DialogDescription className="flex items-start gap-2 rounded-lg bg-tone-warning-bg p-3 text-base text-tone-warning">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          Copy the secret now. For your security it will never be shown again.
        </DialogDescription>
        {apiKey && (
          <div className="grid min-w-0 gap-4">
            <CopyField label="API key" value={apiKey.keyId} />
            <CopyField label="API secret" value={apiKey.secret} isSecret />
            <CopyField label="Authorization header" value={`Basic ${btoa(`${apiKey.keyId}:${apiKey.secret}`)}`} isSecret />
          </div>
        )}
        <DialogFooter>
          <Button size="lg" onClick={onClose}>
            I saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysPage() {
  const { data: keys, isLoading, error } = useApiKeys();
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);
  const revokeKey = useRevokeApiKey();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <>
      <PageHeader
        title="API Keys"
        description={
          <>
            Use keys to upload and manage files from your apps. See the <Link to="/docs" className="text-primary hover:underline">API docs</Link>.
          </>
        }
        actions={
          <Button size="lg" className="h-11 px-4 text-base" onClick={() => setIsCreating(true)}>
            <Plus /> New API key
          </Button>
        }
      />

      {!keys?.length ? (
        <EmptyState
          icon={<KeyRound />}
          title="No API keys yet"
          description="Create a key to start uploading from your code."
          action={<Button onClick={() => setIsCreating(true)}>Create your first key</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API key</TableHead>
                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                <TableHead className="hidden lg:table-cell">Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id} className={key.revokedAt ? "opacity-60" : undefined}>
                  <TableCell className="text-base font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="font-mono text-sm">{key.keyId}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{key.scope === "READ" ? "Read only" : "Read & write"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{key.lastUsedAt ? timeAgo(key.lastUsedAt) : "Never"}</TableCell>
                  <TableCell>{key.revokedAt ? <Badge variant="outline">Revoked</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {!key.revokedAt && (
                      <Button variant="destructive" size="sm" onClick={() => setToRevoke(key)}>
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewKeyDialog open={isCreating} onOpenChange={setIsCreating} onCreated={setCreated} />
      <RevealKeyDialog apiKey={created} onClose={() => setCreated(null)} />
      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title={`Revoke “${toRevoke?.name}”?`}
        description="Apps using this key will immediately get 401 errors. This cannot be undone."
        confirmLabel="Revoke key"
        isDestructive
        isPending={revokeKey.isPending}
        onConfirm={() => toRevoke && revokeKey.mutate(toRevoke.id, { onSuccess: () => setToRevoke(null) })}
      />
    </>
  );
}
