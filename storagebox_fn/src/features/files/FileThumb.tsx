import { useState } from "react";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KIND_META, THUMBNAIL_TRANSFORM } from "@/lib/files";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useViewUrl } from "./hooks";

export function FileKindIcon({ file, className }: { file: Pick<StoredFile, "kind" | "ext">; className?: string }) {
  const meta = KIND_META[file.kind];
  const Icon = meta.icon;
  return (
    <span className={cn("relative flex items-center justify-center rounded-lg", meta.tone, className)}>
      <Icon className="size-1/2 max-h-10 max-w-10" strokeWidth={1.5} />
      <span className="absolute bottom-1.5 rounded bg-white/90 px-1 text-[10px] font-bold uppercase shadow-xs">{file.ext}</span>
    </span>
  );
}

function ImageThumb({ file, className }: { file: StoredFile; className?: string }) {
  const { url, isLoading } = useViewUrl(file, THUMBNAIL_TRANSFORM);
  const [hasFailed, setHasFailed] = useState(false);
  if (isLoading) return <Skeleton className={className} />;
  if (!url || hasFailed) return <FileKindIcon file={file} className={className} />;
  return (
    <img
      src={url}
      alt={file.originalName}
      loading="lazy"
      onError={() => setHasFailed(true)}
      className={cn("rounded-lg bg-muted object-cover", className)}
    />
  );
}

export function FileThumb({ file, className }: { file: StoredFile; className?: string }) {
  return (
    <span className="relative block">
      {file.kind === "image" ? <ImageThumb file={file} className={className} /> : <FileKindIcon file={file} className={className} />}
      {file.access === "PRIVATE" && (
        <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-md bg-black/60 text-white" title="Private">
          <Lock className="size-3.5" />
        </span>
      )}
    </span>
  );
}
