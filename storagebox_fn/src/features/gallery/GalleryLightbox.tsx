import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";
import { applyTransform, downloadUrl, embeddedViewerUrl, isTransformable, previewKindOf } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

/** Large enough for full-screen viewing while staying far smaller than camera originals. */
const LIGHTBOX_TRANSFORM = "w_2048,q_85,f_webp";

type GalleryLightboxProps = {
  files: StoredFile[];
  index: number | null;
  onChange: (index: number | null) => void;
  canDownload: boolean;
};

function Stage({ file }: { file: StoredFile }) {
  const url = file.url!;
  const preview = previewKindOf(file);
  if (file.kind === "image") {
    return (
      <img
        key={file.id}
        src={isTransformable(file) ? applyTransform(url, LIGHTBOX_TRANSFORM) : url}
        alt={file.originalName}
        className="max-h-full max-w-full object-contain shadow-2xl"
      />
    );
  }
  if (preview === "video") return <video key={file.id} src={url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />;
  if (preview === "audio") return <audio key={file.id} src={url} controls autoPlay className="w-full max-w-xl" />;
  return <iframe key={file.id} src={embeddedViewerUrl(url)} title={file.originalName} className="size-full max-w-5xl rounded-lg bg-white" />;
}

export function GalleryLightbox({ files, index, onChange, canDownload }: GalleryLightboxProps) {
  const file = index === null ? undefined : files[index];
  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < files.length - 1;

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onChange(null);
      if (event.key === "ArrowLeft" && index > 0) onChange(index - 1);
      if (event.key === "ArrowRight" && index < files.length - 1) onChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, files.length, onChange]);

  if (!file?.url || index === null) return null;
  const navButton = "absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" role="dialog" aria-modal="true" aria-label={file.originalName}>
      <header className="flex items-center gap-3 px-4 py-3 text-white">
        <div className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{file.originalName}</span>
          <span className="text-xs text-white/60">
            {index + 1} of {files.length} · {file.ext.toUpperCase()} · {formatBytes(file.sizeBytes)}
            {file.width && file.height ? ` · ${file.width} × ${file.height}` : ""}
          </span>
        </div>
        {canDownload && (
          <>
            <a href={file.url} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-lg hover:bg-white/10" aria-label="Open original">
              <ExternalLink className="size-5" />
            </a>
            <a
              href={downloadUrl(file.url)}
              download={file.originalName}
              className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-slate-900 hover:bg-white/90"
            >
              <Download className="size-4" /> Download
            </a>
          </>
        )}
        <button type="button" onClick={() => onChange(null)} className="grid size-10 place-items-center rounded-lg hover:bg-white/10" aria-label="Close">
          <X className="size-6" />
        </button>
      </header>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 md:px-20" onClick={(event) => event.target === event.currentTarget && onChange(null)}>
        <Stage file={file} />
        {hasPrevious && (
          <button type="button" onClick={() => onChange(index - 1)} className={`${navButton} left-4`} aria-label="Previous">
            <ChevronLeft className="size-6" />
          </button>
        )}
        {hasNext && (
          <button type="button" onClick={() => onChange(index + 1)} className={`${navButton} right-4`} aria-label="Next">
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>
    </div>
  );
}
