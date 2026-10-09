import { useState } from "react";
import { Globe, Link2, Loader2, Lock } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { SIGNED_LINK_DURATIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { createSignedLink, type SignedLink } from "./api";
import { useUpdateFile } from "./hooks";

export function FileLinksPanel({ file }: { file: StoredFile }) {
  const [duration, setDuration] = useState("3600");
  const [signed, setSigned] = useState<SignedLink | null>(null);
  const updateFile = useUpdateFile();
  const generate = useApiMutation((expiresIn: number) => createSignedLink(file.id, { expiresIn }), {
    onSuccess: setSigned,
    isSilent: true,
  });
  const isPublic = file.access === "PUBLIC";

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <span className={isPublic ? "text-tone-success" : "text-tone-warning"}>{isPublic ? <Globe className="size-5" /> : <Lock className="size-5" />}</span>
        <div className="grid flex-1 gap-0.5">
          <span className="text-base font-semibold">{isPublic ? "Public file" : "Private file"}</span>
          <span className="text-sm text-muted-foreground">
            {isPublic ? "Anyone with the link can open it." : "Only signed links (which expire) can open it."}
          </span>
        </div>
        <Button
          variant="outline"
          disabled={updateFile.isPending}
          onClick={() => updateFile.mutate({ id: file.id, input: { access: isPublic ? "PRIVATE" : "PUBLIC" } })}
        >
          {updateFile.isPending && <Loader2 className="animate-spin" />}
          Make {isPublic ? "private" : "public"}
        </Button>
      </div>

      {file.url && (
        <div className="grid gap-3">
          <CopyField label="Permanent link" value={file.url} canOpen />
          <CopyField label="Download link" value={`${file.url}?dl=1`} />
        </div>
      )}

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="grid gap-0.5">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="size-4" /> Signed link
          </span>
          <span className="text-sm text-muted-foreground">Share for a limited time — works for private files too.</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <SearchableSelect options={SIGNED_LINK_DURATIONS} value={duration} onChange={setDuration} />
          </div>
          <Button className="h-11" disabled={generate.isPending} onClick={() => generate.mutate(Number(duration))}>
            {generate.isPending && <Loader2 className="animate-spin" />}
            Generate
          </Button>
        </div>
        {signed && (
          <>
            <CopyField value={signed.url} canOpen />
            <p className="text-sm text-muted-foreground">Expires {formatDateTime(signed.expiresAt)}</p>
          </>
        )}
      </div>

      <CopyField label="Public ID (use it with the API)" value={file.publicId} />
    </div>
  );
}
