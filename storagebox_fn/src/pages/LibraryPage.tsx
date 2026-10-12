import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FolderOpen, LayoutGrid, List, Pencil, Search, Share2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { EmptyState, ErrorDisplay } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileSort } from "@/features/files/api";
import { BulkActions } from "@/features/files/BulkActions";
import { CollectionDialog, type CollectionDialogState } from "@/features/files/CollectionDialog";
import { ALL_FILES, CollectionTree, UNSORTED } from "@/features/files/CollectionTree";
import { AssetViewer } from "@/features/files/viewer/AssetViewer";
import { FileGrid, FileTable } from "@/features/files/FileCollection";
import { useCollections, useFile, useFiles } from "@/features/files/hooks";
import { ShareCollectionDialog } from "@/features/files/ShareCollectionDialog";
import { UploadZone } from "@/features/files/UploadZone";
import { FILES_PAGE_SIZE } from "@/lib/constants";
import { KIND_OPTIONS } from "@/lib/files";
import type { Collection, FileAccess, FileKind, StoredFile } from "@/lib/types";

const ANY = "any";
const FILTER_WIDTH = "w-full sm:w-44";
const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "largest", label: "Largest first" },
  { value: "smallest", label: "Smallest first" },
];
const KIND_FILTER = [{ value: ANY, label: "All types" }, ...KIND_OPTIONS];
const ACCESS_FILTER = [
  { value: ANY, label: "Public & private" },
  { value: "PUBLIC", label: "Public only" },
  { value: "PRIVATE", label: "Private only" },
];

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const collectionId = params.get("collection") ?? ALL_FILES;
  const kind = params.get("kind") ?? ANY;
  const access = params.get("access") ?? ANY;
  const sort = (params.get("sort") ?? "newest") as FileSort;
  const page = Number(params.get("page") ?? "1");
  const view = params.get("view") === "list" ? "list" : "grid";
  const openFileId = params.get("file");

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState<Collection | null>(null);
  const [editing, setEditing] = useState<CollectionDialogState>(null);
  const { data: collections = [] } = useCollections();
  const { data: openFile } = useFile(openFileId);

  const setParam = (updates: Record<string, string | null>, resetPage = true) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "" || value === ANY) next.delete(key);
          else next.set(key, value);
        }
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get("q") ?? "")) setParam({ q: search.trim() || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on typing
  }, [search]);

  const query = useMemo(
    () => ({
      collectionId: collectionId || undefined,
      search: params.get("q") ?? undefined,
      kind: kind === ANY ? undefined : (kind as FileKind),
      access: access === ANY ? undefined : (access as FileAccess),
      sort,
      page,
      pageSize: FILES_PAGE_SIZE,
    }),
    [collectionId, params, kind, access, sort, page],
  );
  const { data, isLoading, error, isFetching } = useFiles(query);

  const currentCollection = collections.find((collection) => collection.id === collectionId);
  const collectionLabel = currentCollection?.path ?? "Unsorted";
  const title = currentCollection?.name ?? (collectionId === UNSORTED ? "Unsorted" : "Media Library");
  const fileCountLabel = data ? `${data.total.toLocaleString()} file${data.total === 1 ? "" : "s"}` : undefined;
  const description = currentCollection
    ? [currentCollection.path.split("/").join(" / "), fileCountLabel].filter(Boolean).join(" · ")
    : (fileCountLabel ?? "Upload, organise and share your files.");

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const openDetails = (file: StoredFile) => setParam({ file: file.id }, false);

  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0;
  const listProps = { files: data?.items ?? [], selected, onToggle: toggle, onOpen: openDetails };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          currentCollection && (
            <>
              <Button variant="outline" onClick={() => setEditing({ mode: "rename", collection: currentCollection })}>
                <Pencil /> Edit
              </Button>
              <Button onClick={() => setSharing(currentCollection)}>
                <Share2 /> {currentCollection.shareUrl ? "Shared" : "Share"}
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-card p-3 lg:sticky lg:top-6 lg:self-start">
          <CollectionTree
            selectedId={collectionId}
            onSelect={(id) => {
              setSelected(new Set());
              setParam({ collection: id || null });
            }}
            onShare={setSharing}
          />
        </aside>

        <div className="grid min-w-0 content-start gap-4">
          <UploadZone
            collectionId={currentCollection?.id}
            collectionPath={currentCollection?.path}
            collectionLabel={collectionLabel}
            defaultAccess={currentCollection?.access}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or public ID…"
                className="h-11 pl-10 text-base"
              />
            </div>
            <div className={FILTER_WIDTH}>
              <SearchableSelect options={KIND_FILTER} value={kind} onChange={(value) => setParam({ kind: value })} />
            </div>
            <div className={FILTER_WIDTH}>
              <SearchableSelect options={ACCESS_FILTER} value={access} onChange={(value) => setParam({ access: value })} />
            </div>
            <div className={FILTER_WIDTH}>
              <SearchableSelect options={SORT_OPTIONS} value={sort} onChange={(value) => setParam({ sort: value === "newest" ? null : value })} />
            </div>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setParam({ view: null }, false)} aria-label="Grid view">
                <LayoutGrid />
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setParam({ view: "list" }, false)} aria-label="List view">
                <List />
              </Button>
            </div>
          </div>

          <BulkActions selectedIds={[...selected]} onClear={() => setSelected(new Set())} />

          {error && <ErrorDisplay error={error} />}
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/3.6]" />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="No files here yet"
              description={`Drop files above to add them to ${collectionLabel}, or change the filters.`}
            />
          ) : (
            <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
              {view === "grid" ? <FileGrid {...listProps} /> : <FileTable {...listProps} />}
            </div>
          )}

          {data && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={data.pageSize}
              total={data.total}
              onChange={(next) => setParam({ page: String(next) }, false)}
            />
          )}
        </div>
      </div>

      <ShareCollectionDialog collection={sharing} onClose={() => setSharing(null)} />
      <CollectionDialog state={editing} onClose={() => setEditing(null)} />
      <AssetViewer
        file={openFileId ? (openFile ?? null) : null}
        siblings={data?.items ?? []}
        onNavigate={openDetails}
        onClose={() => setParam({ file: null }, false)}
      />
    </>
  );
}
