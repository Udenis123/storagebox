import { useState } from "react";
import { Link2, Loader2, Lock } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { SIGNED_LINK_DURATIONS } from "@/lib/constants";
import { applyTransform, downloadUrl, isTransformable } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { createSignedLink, type SignedLink } from "../api";

const OPTIMIZED_TRANSFORM = "q_80,f_webp";
const THUMBNAIL_TRANSFORM = "w_300,h_300,c_fill,f_webp";

function SignedLinkCard({ file }: { file: StoredFile }) {
  const [duration, setDuration] = useState("3600");
  const [signed, setSigned] = useState<SignedLink | null>(null);
  const generate = useApiMutation((expiresIn: number) => createSignedLink(file.id, { expiresIn }), { onSuccess: setSigned, isSilent: true });

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-0.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4" /> Expiring link
        </span>
        <span className="text-xs text-muted-foreground">Share for a limited time — works for private files too.</span>
      </div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchableSelect options={SIGNED_LINK_DURATIONS} value={duration} onChange={setDuration} />
        </div>
        <Button className="h-11" disabled={generate.isPending} onClick={() => generate.mutate(Number(duration))}>
          {generate.isPending && <Loader2 className="animate-spin" />}
          Create
        </Button>
      </div>
      {signed && (
        <>
          <CopyField value={signed.url} canOpen />
          <p className="text-xs text-muted-foreground">Expires {formatDateTime(signed.expiresAt)}</p>
        </>
      )}
    </div>
  );
}

export function AssetLinks({ file }: { file: StoredFile }) {
  const canTransform = isTransformable(file);
  return (
    <div className="grid gap-5">
      {file.url ? (
        <div className="grid gap-3">
          <CopyField label="Original" value={file.url} canOpen />
          {canTransform && <CopyField label="Optimized (WebP)" value={applyTransform(file.url, OPTIMIZED_TRANSFORM)} canOpen />}
          {canTransform && <CopyField label="Thumbnail 300 × 300" value={applyTransform(file.url, THUMBNAIL_TRANSFORM)} canOpen />}
          <CopyField label="Download" value={downloadUrl(file.url)} />
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg bg-tone-warning-bg/60 p-3 text-sm ring-1 ring-tone-warning/20">
          <Lock className="mt-0.5 size-4 shrink-0 text-tone-warning" />
          <p>This file is private, so it has no permanent link. Anyone who opens the URL sees that you made it private. Create an expiring link below, or make it public in Summary.</p>
        </div>
      )}
      <SignedLinkCard file={file} />
    </div>
  );
}
