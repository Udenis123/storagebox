import { ChevronRight, Folder, FolderPlus, Home, Link2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ancestorIds } from "@/lib/files";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL_FILES, CollectionTree, UNSORTED } from "./CollectionTree";

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
    <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground md:text-base">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.id || "all"} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight className="size-4 shrink-0 opacity-60" />}
            {isLast ? (
              <span className="truncate font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(crumb.id)}
                className="flex items-center gap-1 truncate rounded px-1 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
              >
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

type SubFoldersProps = {
  folders: Collection[];
  onOpen: (id: string) => void;
  onCreate: () => void;
};

/** Folder cards for the collections directly inside the current one, plus a "New folder" card. */
export function SubFolders({ folders, onOpen, onCreate }: SubFoldersProps) {
  return (
    <section aria-label="Folders" className="grid gap-2">
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Folders</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-3">
        {folders.map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onOpen(folder.id)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Folder className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold md:text-base">{folder.name}</span>
                  {folder.access === "PRIVATE" && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Private" />}
                  {folder.shareUrl && <Link2 className="size-3.5 shrink-0 text-primary" aria-label="Shared" />}
                </span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  {folder.fileCount.toLocaleString()} file{folder.fileCount === 1 ? "" : "s"}
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
              "flex h-full min-h-16 w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-muted-foreground transition-colors outline-none",
              "hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <FolderPlus className="size-5 shrink-0" />
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

/** The collection tree in a dialog, for phones and for changing the upload destination. */
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
