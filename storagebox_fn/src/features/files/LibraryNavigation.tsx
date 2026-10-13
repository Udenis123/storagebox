import type { ReactNode } from "react";
import { ChevronRight, CloudUpload, Folder, FolderPlus, Globe, Home, Link2, Lock, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ancestorIds } from "@/lib/files";
import type { Collection, FileAccess } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL_FILES, CollectionTree, UNSORTED } from "./CollectionTree";

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

type FolderBreadcrumbProps = {
  collections: Collection[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/** "Media Library › uploads › trip": every level is a link back up. */
export function FolderBreadcrumb({ collections, selectedId, onSelect }: FolderBreadcrumbProps) {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const trail = [...ancestorIds(collections, selectedId).reverse(), selectedId].flatMap((id) => byId.get(id) ?? []);
  const crumbs = [
    { id: ALL_FILES, label: "Media Library" },
    ...(selectedId === UNSORTED ? [{ id: UNSORTED, label: "Unsorted" }] : trail.map((collection) => ({ id: collection.id, label: collection.name }))),
  ];
  if (crumbs.length === 1) return null;

  return (
    <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.id || "all"} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight className="size-4 shrink-0 opacity-50" />}
            {isLast ? (
              <span className="truncate font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <button type="button" onClick={() => onSelect(crumb.id)} className={cn(FOCUS_RING, "flex items-center gap-1 truncate rounded px-1 hover:text-foreground")}>
                {index === 0 && <Home className="size-4 shrink-0" />}
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** "uploads › trip" with chevrons, for showing where uploads land. */
export function DestinationPath({ path, className }: { path?: string; className?: string }) {
  const segments = path ? path.split("/") : ["Unsorted"];
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-1 font-semibold text-foreground", className)}>
      <Folder className="size-4 shrink-0 text-primary" />
      {segments.map((segment, index) => (
        <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate">{segment}</span>
        </span>
      ))}
    </span>
  );
}

function Pill({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-0.5 text-xs font-medium", className)}>
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}

type FolderHeaderProps = {
  icon: LucideIcon;
  title: string;
  breadcrumb: ReactNode;
  access?: FileAccess;
  isShared?: boolean;
  stats: string;
  actions: ReactNode;
  destinationPath?: string;
  newFilesAccess: FileAccess;
};

/** The top card of the library: where you are, what's inside, and where uploads go. */
export function FolderHeader({ icon: Icon, title, breadcrumb, access, isShared, stats, actions, destinationPath, newFilesAccess }: FolderHeaderProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-xs lg:mb-8">
      <div className="grid gap-4 bg-linear-to-br from-primary/10 via-primary/3 to-transparent p-5 md:p-6">
        {breadcrumb}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 md:size-14">
              <Icon className="size-6 md:size-7" />
            </span>
            <div className="grid min-w-0 gap-1.5">
              <h1 className="truncate text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {access && (
                  <Pill icon={access === "PRIVATE" ? Lock : Globe} className={access === "PRIVATE" ? "text-tone-warning" : "text-tone-success"}>
                    {access === "PRIVATE" ? "Private" : "Public"}
                  </Pill>
                )}
                {isShared && (
                  <Pill icon={Link2} className="text-primary">
                    Shared
                  </Pill>
                )}
                <span>{stats}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t px-5 py-3 text-sm md:px-6">
        <CloudUpload className="size-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">Uploads go to</span>
        <DestinationPath path={destinationPath} />
        <span className="text-muted-foreground">
          as <strong className="font-medium text-foreground">{newFilesAccess === "PRIVATE" ? "private" : "public"}</strong> files
        </span>
        <span className="hidden text-muted-foreground md:ml-auto md:inline">Drag files anywhere on this page</span>
      </div>
    </section>
  );
}

type SubFoldersProps = {
  folders: Collection[];
  onOpen: (id: string) => void;
  onCreate: () => void;
};

/** Folder tiles for the collections directly inside the current one, plus a "New folder" tile. */
export function SubFolders({ folders, onOpen, onCreate }: SubFoldersProps) {
  return (
    <section aria-label="Folders" className="grid gap-3">
      <h2 className="text-base font-semibold md:text-lg">
        Folders <span className="font-normal text-muted-foreground">· {folders.length}</span>
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]">
        {folders.map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onOpen(folder.id)}
              className={cn(
                FOCUS_RING,
                "group flex w-full flex-col items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center",
              )}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-200">
                <Folder className="size-6 fill-amber-200" />
              </span>
              <span className="grid w-full min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-semibold md:text-base">{folder.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {folder.fileCount.toLocaleString()} file{folder.fileCount === 1 ? "" : "s"}
                  {folder.access === "PRIVATE" && <Lock className="size-3" aria-label="Private" />}
                  {folder.shareUrl && <Link2 className="size-3 text-primary" aria-label="Shared" />}
                </span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onCreate}
            className={cn(
              FOCUS_RING,
              "flex h-full min-h-[4.25rem] w-full flex-col items-start gap-3 rounded-xl border-2 border-dashed p-3 text-left text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:flex-row sm:items-center",
            )}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
              <FolderPlus className="size-5" />
            </span>
            <span className="text-sm font-medium md:text-base">New folder</span>
          </button>
        </li>
      </ul>
    </section>
  );
}

type FolderPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onShare: (collection: Collection) => void;
};

/** The collection tree in a dialog, for phones. */
export function FolderPickerDialog({ open, onOpenChange, selectedId, onSelect, onShare }: FolderPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Choose a folder</DialogTitle>
        </DialogHeader>
        <CollectionTree
          selectedId={selectedId}
          onSelect={(id) => {
            onSelect(id);
            onOpenChange(false);
          }}
          onShare={(collection) => {
            onOpenChange(false);
            onShare(collection);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
