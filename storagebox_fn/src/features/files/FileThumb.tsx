import { useState } from "react";
import { Lock, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { isPagedKind, KIND_META, previewKindOf, THUMBNAIL_TRANSFORM } from "@/lib/files";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DocumentThumb } from "./documents/DocumentThumb";
import { useViewUrl } from "./hooks";

/** Seek a little past 0 so browsers paint a real frame instead of a black one. */
const VIDEO_POSTER_SECONDS = 0.5;

export function FileKindIcon({ file, className, showExt = true }: { file: Pick<StoredFile, "kind" | "ext">; className?: string; showExt?: boolean }) {
  const meta = KIND_META[file.kind];
  const Icon = meta.icon;
  return (
    <span className={cn("relative flex items-center justify-center rounded-lg", meta.tone, className)}>
      <Icon className="size-1/2 max-h-10 max-w-10" strokeWidth={1.5} />
      {showExt && <span className="absolute bottom-1.5 rounded bg-white/90 px-1 text-[10px] font-bold uppercase shadow-xs">{file.ext}</span>}
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

function VideoThumb({ file, className }: { file: StoredFile; className?: string }) {
  const { url, isLoading } = useViewUrl(file);
  const [duration, setDuration] = useState<number | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  if (isLoading) return <Skeleton className={className} />;
  if (!url || hasFailed) return <FileKindIcon file={file} className={className} />;
  return (
    <span className={cn("relative block overflow-hidden bg-slate-900", className)}>
      <video
        src={`${url}#t=${VIDEO_POSTER_SECONDS}`}
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onError={() => setHasFailed(true)}
        className="size-full object-cover"
      />
      <span className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/40 via-transparent to-transparent">
        <span className="grid size-11 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
      </span>
      {duration !== null && Number.isFinite(duration) && (
        <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
          {formatDuration(duration)}
        </span>
      )}
    </span>
  );
}

/** `isDetailed` (grid cards) draws real content — document pages, sheet rows, video frames — instead of a type icon. */
export function FileThumb({ file, className, isDetailed = false }: { file: StoredFile; className?: string; isDetailed?: boolean }) {
  const preview = previewKindOf(file);
  const icon = <FileKindIcon file={file} className={className} showExt={!isDetailed} />;

  let thumb = icon;
  if (file.kind === "image") thumb = <ImageThumb file={file} className={className} />;
  else if (isDetailed && preview === "video") thumb = <VideoThumb file={file} className={className} />;
  else if (isDetailed && (isPagedKind(preview) || preview === "sheet")) {
    thumb = <DocumentThumb file={file} kind={preview} className={className} fallback={icon} />;
  }

  return (
    <span className="relative block">
      {thumb}
      {isDetailed && file.kind !== "image" && (
        <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase shadow-sm ring-1 ring-slate-900/5">
          {file.ext}
        </span>
      )}
      {file.access === "PRIVATE" && (
        <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-md bg-black/60 text-white" title="Private">
          <Lock className="size-3.5" />
        </span>
      )}
    </span>
  );
}
