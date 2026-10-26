import { Download, Play } from "lucide-react";
import { FileThumb } from "@/features/files/FileThumb";
import { applyTransform, downloadUrl, isTransformable } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { tileAspect } from "./masonry";

/** Sized for a ~400 px column on high-density screens. */
const TILE_TRANSFORM = "w_800,q_80,f_webp";

export function GalleryTile({ file, onOpen, canDownload }: { file: StoredFile; onOpen: () => void; canDownload: boolean }) {
  const isPhoto = file.kind === "image" && isTransformable(file) && file.url;
  return (
    <figure className="group relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: tileAspect(file) }}>
      <button type="button" onClick={onOpen} className="block size-full cursor-zoom-in" aria-label={`Open ${file.originalName}`}>
        {isPhoto ? (
          <img
            src={applyTransform(file.url!, TILE_TRANSFORM)}
            alt={file.originalName}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <FileThumb file={file} className="size-full rounded-none" isDetailed />
        )}
      </button>
      {file.kind === "video" && (
        <span className="pointer-events-none absolute top-3 left-3 grid size-8 place-items-center rounded-full bg-black/60 text-white">
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
      )}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-10 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-medium">{file.originalName}</span>
          <span className="text-xs text-white/75">
            {file.ext.toUpperCase()} · {formatBytes(file.sizeBytes)}
          </span>
        </span>
        {canDownload && file.url && (
          <a
            href={downloadUrl(file.url)}
            download={file.originalName}
            onClick={(event) => event.stopPropagation()}
            className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-lg bg-white/90 text-slate-900 shadow transition-colors hover:bg-white"
            aria-label={`Download ${file.originalName}`}
          >
            <Download className="size-4" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
