import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Folder, ImageOff, Link2, Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GalleryLightbox } from "@/features/gallery/GalleryLightbox";
import { GalleryTile } from "@/features/gallery/GalleryTile";
import { useGallery, type GalleryFilter } from "@/features/gallery/api";
import { toColumns, useColumnCount } from "@/features/gallery/masonry";
import { useCopy } from "@/hooks/useCopy";
import { ApiRequestError } from "@/lib/api";
import { applyTransform, THUMBNAIL_TRANSFORM } from "@/lib/files";
import type { FileKind, GalleryFolder } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_TABS: { value: FileKind | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "image", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
];

/** Loads the next page this far before the visitor reaches the bottom. */
const PREFETCH_MARGIN = "800px";

function FolderCard({ folder, onOpen }: { folder: GalleryFolder; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group grid w-48 shrink-0 gap-2 text-left sm:w-56">
      <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {folder.coverUrl ? (
          <img src={applyTransform(folder.coverUrl, THUMBNAIL_TRANSFORM)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <Folder className="size-10" strokeWidth={1.5} />
          </span>
        )}
      </span>
      <span className="grid">
        <span className="truncate font-medium">{folder.name}</span>
        <span className="text-sm text-muted-foreground">{folder.fileCount.toLocaleString()} files</span>
      </span>
    </button>
  );
}

export default function SharedGalleryPage() {
  const { token = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const filter: GalleryFilter = { folder: params.get("folder") ?? undefined, kind: (params.get("kind") as FileKind | null) ?? undefined };
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGallery(token, filter);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columnCount = useColumnCount();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { copy, copiedText } = useCopy();

  const gallery = data?.pages[0];
  const files = useMemo(() => data?.pages.flatMap((page) => page.files.items) ?? [], [data]);
  const columns = useMemo(() => toColumns(files, columnCount), [files, columnCount]);
  const shareLink = `${window.location.origin}/s/${token}`;

  const navigate = (updates: Partial<Record<"folder" | "kind", string | null>>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && !isFetchingNextPage && void fetchNextPage(),
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (gallery) document.title = `${gallery.name} · StorageBox`;
  }, [gallery]);

  const onLightboxChange = useCallback(
    (index: number | null) => {
      setOpenIndex(index);
      if (index !== null && index >= files.length - 3 && hasNextPage) void fetchNextPage();
    },
    [files.length, hasNextPage, fetchNextPage],
  );

  if (error) {
    const isMissing = error instanceof ApiRequestError && error.status === 404;
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6 text-center">
        <div className="grid max-w-md justify-items-center gap-3">
          <ImageOff className="size-12 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold">{isMissing ? "This gallery isn't available" : "Something went wrong"}</h1>
          <p className="text-muted-foreground">
            {isMissing ? "The link may be wrong, or the owner stopped sharing it." : error.message}
          </p>
        </div>
      </main>
    );
  }

  const total = gallery?.files.total ?? 0;
  const breadcrumb = gallery?.breadcrumb ?? [];

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" aria-label="StorageBox home">
            <Logo />
          </Link>
          <Button variant="outline" onClick={() => copy(shareLink, "Gallery link copied")}>
            {copiedText === shareLink ? <Check /> : <Link2 />} Copy link
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[110rem] gap-8 px-4 py-8 md:px-8 md:py-12">
        <section className="grid gap-3">
          {breadcrumb.length > 1 && (
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Folders">
              {breadcrumb.map((crumb, index) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="size-4" />}
                  <button
                    type="button"
                    onClick={() => navigate({ folder: index === 0 ? null : crumb.id })}
                    className={cn("rounded px-1 hover:text-foreground", index === breadcrumb.length - 1 && "font-medium text-foreground")}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
          )}
          {gallery ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{breadcrumb.at(-1)?.name ?? gallery.name}</h1>
              <p className="text-base text-muted-foreground md:text-lg">
                {total.toLocaleString()} {total === 1 ? "file" : "files"} · shared by <span className="font-medium text-foreground">{gallery.cloudName}</span>
              </p>
            </>
          ) : (
            <>
              <Skeleton className="h-12 w-72" />
              <Skeleton className="h-6 w-48" />
            </>
          )}
        </section>

        {gallery && gallery.folders.length > 0 && (
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Folders</h2>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              {gallery.folders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} onOpen={() => navigate({ folder: folder.id })} />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="File types">
          {KIND_TABS.map((tab) => {
            const isActive = (filter.kind ?? "") === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => navigate({ kind: tab.value || null })}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className={index % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/3]"} />
            ))}
          </div>
        ) : files.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="flex items-start gap-3 md:gap-4">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="grid min-w-0 flex-1 gap-3 md:gap-4">
                {column.map(({ file, index }) => (
                  <GalleryTile key={file.id} file={file} onOpen={() => setOpenIndex(index)} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
        </div>
      </main>

      <GalleryLightbox files={files} index={openIndex} onChange={onLightboxChange} />
    </div>
  );
}
