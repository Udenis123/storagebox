import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FolderOpen, FolderPlus, FolderTree, Inbox, Layers, LayoutGrid, Link2, List, Pencil, Search, Share2, UploadCloud } from "lucide-react";
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
import { FileGrid, FileTable } from "@/features/files/FileCollection";
import { useCollections, useFile, useFiles } from "@/features/files/hooks";
import { FolderBreadcrumb, FolderHeader, FolderPickerDialog, SubFolders } from "@/features/files/LibraryNavigation";
import { ShareCollectionDialog } from "@/features/files/ShareCollectionDialog";
import { PageDropTarget, UploadMenu, UploadPanel } from "@/features/files/UploadControls";
import { displayPath, useUploader, type AccessChoice } from "@/features/files/useUploader";
import { AssetViewer } from "@/features/files/viewer/AssetViewer";
import { FILES_PAGE_SIZE } from "@/lib/constants";
import { KIND_META, KIND_OPTIONS } from "@/lib/files";
import { DEFAULT_FILE_ACCESS, type Collection, type FileAccess, type FileKind, type StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";

const ANY = "any";
const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "largest", label: "Largest first" },
  { value: "smallest", label: "Smallest first" },
];
const ACCESS_FILTER = [
  { value: ANY, label: "Public & private" },
  { value: "PUBLIC", label: "Public only" },
  { value: "PRIVATE", label: "Private only" },
];
const KIND_TABS = [{ value: ANY, label: "All", icon: Layers }, ...KIND_OPTIONS.map((option) => ({ ...option, icon: KIND_META[option.value].icon }))];

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

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
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [accessChoice, setAccessChoice] = useState<AccessChoice>(DEFAULT_FILE_ACCESS);
  const { data: collections = [] } = useCollections();
  const { data: openFile } = useFile(openFileId);
  const uploader = useUploader();

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
  const hasFilters = Boolean(query.search || query.kind || query.access);

  const currentCollection = collections.find((collection) => collection.id === collectionId);
  const isUnsorted = collectionId === UNSORTED;
  const subFolders = isUnsorted ? [] : collections.filter((collection) => (collection.parentId ?? ALL_FILES) === (currentCollection?.id ?? ALL_FILES));
  const folderAccess = currentCollection?.access ?? DEFAULT_FILE_ACCESS;
  const newFilesAccess = accessChoice === "DEFAULT" ? folderAccess : accessChoice;
  const destination = displayPath(currentCollection?.path);
  const stats = [data ? plural(data.total, "file") : null, isUnsorted ? null : plural(subFolders.length, "folder")].filter(Boolean).join(" · ");

  const openCollection = (id: string) => {
    setSelected(new Set());
    setAccessChoice(DEFAULT_FILE_ACCESS);
    setParam({ collection: id || null, file: null });
  };
  const upload = (picked: Parameters<typeof uploader.startUploads>[0]) =>
    void uploader.startUploads(picked, { collectionId: currentCollection?.id, collectionPath: currentCollection?.path, access: newFilesAccess });

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
    <PageDropTarget destination={destination} onPick={upload}>
      <FolderHeader
        icon={currentCollection ? FolderOpen : isUnsorted ? Inbox : Layers}
        title={currentCollection?.name ?? (isUnsorted ? "Unsorted" : "Media Library")}
        breadcrumb={<FolderBreadcrumb collections={collections} selectedId={collectionId} onSelect={openCollection} />}
        access={currentCollection?.access}
        isShared={Boolean(currentCollection?.shareUrl)}
        stats={stats}
        destinationPath={currentCollection?.path}
        newFilesAccess={newFilesAccess}
        actions={
          <>
            <Button variant="outline" className="lg:hidden" onClick={() => setIsPickingFolder(true)}>
              <FolderTree /> Folders
            </Button>
            {!isUnsorted && (
              <Button variant="outline" onClick={() => setEditing({ mode: "create", parent: currentCollection })} aria-label="New folder">
                <FolderPlus /> <span className="hidden sm:inline">New folder</span>
              </Button>
            )}
            {currentCollection && (
              <>
                <Button variant="outline" size="icon" onClick={() => setEditing({ mode: "rename", collection: currentCollection })} aria-label="Edit folder">
                  <Pencil />
                </Button>
                <Button variant="outline" onClick={() => setSharing(currentCollection)} aria-label="Share folder">
                  {currentCollection.shareUrl ? <Link2 /> : <Share2 />}
                  <span className="hidden sm:inline">{currentCollection.shareUrl ? "Shared" : "Share"}</span>
                </Button>
              </>
            )}
            <UploadMenu
              destination={destination}
              access={accessChoice}
              defaultAccess={folderAccess}
              onAccessChange={setAccessChoice}
              onPick={upload}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-8">
        <aside className="hidden rounded-2xl border bg-card p-3 shadow-xs lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
          <CollectionTree selectedId={collectionId} onSelect={openCollection} onShare={setSharing} />
        </aside>

        <div className="grid min-w-0 content-start gap-8">
          {subFolders.length > 0 && (
            <SubFolders folders={subFolders} onOpen={openCollection} onCreate={() => setEditing({ mode: "create", parent: currentCollection })} />
          )}

          <section aria-label="Files" className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold md:text-lg">
                Files {data && <span className="font-normal text-muted-foreground">· {data.total.toLocaleString()}</span>}
              </h2>
              <div className="flex gap-1 rounded-lg border bg-card p-1">
                <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setParam({ view: null }, false)} aria-label="Grid view">
                  <LayoutGrid />
                </Button>
                <Button variant={view === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setParam({ view: "list" }, false)} aria-label="List view">
                  <List />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-card p-3 shadow-xs">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
                <div className="relative min-w-0">
                  <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or public ID…"
                    className="h-11 pl-10 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:contents">
                  <SearchableSelect options={ACCESS_FILTER} value={access} onChange={(value) => setParam({ access: value })} />
                  <SearchableSelect options={SORT_OPTIONS} value={sort} onChange={(value) => setParam({ sort: value === "newest" ? null : value })} />
                </div>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="File type">
                {KIND_TABS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={kind === value}
                    onClick={() => setParam({ kind: value })}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      kind === value ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <BulkActions selectedIds={[...selected]} onClear={() => setSelected(new Set())} />

            {error && <ErrorDisplay error={error} />}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="aspect-[4/3.6] rounded-xl" />
                ))}
              </div>
            ) : data && data.items.length === 0 ? (
              <EmptyState
                icon={hasFilters ? <Search /> : <UploadCloud />}
                title={hasFilters ? "No files match these filters" : "This folder is empty"}
                description={
                  hasFilters ? "Try another search or file type." : `Drag files or folders onto this page, or use Upload — they go to ${destination}.`
                }
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
          </section>
        </div>
      </div>

      <UploadPanel tasks={uploader.tasks} onClear={uploader.clearFinished} />
      <FolderPickerDialog
        open={isPickingFolder}
        onOpenChange={setIsPickingFolder}
        selectedId={collectionId}
        onSelect={openCollection}
        onShare={setSharing}
      />
      <ShareCollectionDialog collection={sharing} onClose={() => setSharing(null)} />
      <CollectionDialog state={editing} onClose={() => setEditing(null)} />
      <AssetViewer
        file={openFileId ? (openFile ?? null) : null}
        siblings={data?.items ?? []}
        onNavigate={openDetails}
        onClose={() => setParam({ file: null }, false)}
      />
    </PageDropTarget>
  );
}
