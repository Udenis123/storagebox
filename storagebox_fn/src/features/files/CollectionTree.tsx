import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Inbox, Layers, Link2, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ancestorIds } from "@/lib/files";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CollectionDialog, type CollectionDialogState } from "./CollectionDialog";
import { useCollections, useDeleteCollection } from "./hooks";

export const ALL_FILES = "";
export const UNSORTED = "root";

type TreeNode = Collection & { children: TreeNode[] };

function buildTree(collections: Collection[]): TreeNode[] {
  const nodes = new Map(collections.map((collection) => [collection.id, { ...collection, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

type CollectionTreeProps = {
  selectedId: string;
  onSelect: (id: string) => void;
  onShare: (collection: Collection) => void;
};

const ROW =
  "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-base transition-colors has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/40";
const ROW_SELECTED = "bg-primary/10 font-semibold text-primary";
const ROW_IDLE = "text-foreground hover:bg-muted";
const BARE_BUTTON = "outline-none";

export function CollectionTree({ selectedId, onSelect, onShare }: CollectionTreeProps) {
  const { data: collections = [], isLoading } = useCollections();
  const [dialog, setDialog] = useState<CollectionDialogState>(null);
  const [toDelete, setToDelete] = useState<Collection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const deleteCollection = useDeleteCollection(() => {
    if (toDelete && selectedId === toDelete.id) onSelect(ALL_FILES);
    setToDelete(null);
  });
  const tree = useMemo(() => buildTree(collections), [collections]);

  const revealKey = collections.length ? selectedId : null;
  if (revealKey !== revealedId) {
    setRevealedId(revealKey);
    const ancestors = ancestorIds(collections, selectedId);
    if (ancestors.some((id) => !expanded.has(id))) setExpanded(new Set([...expanded, ...ancestors]));
  }

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: TreeNode, depth: number) => {
    const isSelected = node.id === selectedId;
    const isExpanded = expanded.has(node.id);
    return (
      <li key={node.id}>
        <div className={cn(ROW, "group pr-1", isSelected ? ROW_SELECTED : ROW_IDLE)} style={{ paddingLeft: `${depth * 12 + 2}px` }}>
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className={cn(BARE_BUTTON, "flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-foreground/5", !node.children.length && "invisible")}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("size-4 transition-transform", isExpanded && "rotate-90")} />
          </button>
          <button
            type="button"
            className={cn(BARE_BUTTON, "flex min-w-0 flex-1 items-center gap-2 py-2")}
            onClick={() => onSelect(node.id)}
            aria-current={isSelected ? "true" : undefined}
          >
            {isSelected ? <FolderOpen className="size-5 shrink-0" /> : <Folder className="size-5 shrink-0 text-muted-foreground" />}
            <span className="truncate" title={node.path}>
              {node.name}
            </span>
            {node.shareUrl && <Link2 className="size-3.5 shrink-0 text-primary" aria-label="Shared" />}
          </button>
          <span
            className={cn(
              "rounded-full px-2 text-xs tabular-nums lg:group-focus-within:hidden lg:group-hover:hidden",
              isSelected ? "bg-primary/15" : "bg-muted text-muted-foreground",
            )}
          >
            {node.fileCount}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${node.name}`}
                  className="lg:hidden lg:group-focus-within:inline-flex lg:group-hover:inline-flex lg:data-popup-open:inline-flex"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={() => onShare(node)}>
                <Share2 /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog({ mode: "create", parent: node })}>
                <FolderPlus /> New folder inside
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog({ mode: "rename", collection: node })}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setToDelete(node)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isExpanded && node.children.length > 0 && <ul className="mt-0.5 grid grid-cols-[minmax(0,1fr)] gap-0.5">{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
      </li>
    );
  };

  const fixedRow = (id: string, label: string, Icon: typeof Layers) => (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={selectedId === id ? "true" : undefined}
      className={cn(ROW, "py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40", selectedId === id ? ROW_SELECTED : ROW_IDLE)}
    >
      <Icon className="size-5" /> {label}
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Folders</h2>
        <Button variant="outline" size="sm" onClick={() => setDialog({ mode: "create" })}>
          <FolderPlus /> New
        </Button>
      </div>
      {fixedRow(ALL_FILES, "All files", Layers)}
      {fixedRow(UNSORTED, "Unsorted", Inbox)}
      {isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">{tree.map((node) => renderNode(node, 0))}</ul>
      )}

      <CollectionDialog state={dialog} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete “${toDelete?.name}”?`}
        description="The collection, its sub-collections and every file inside are deleted permanently. Their links stop working."
        confirmLabel="Delete everything"
        isDestructive
        isPending={deleteCollection.isPending}
        onConfirm={() => toDelete && deleteCollection.mutate({ id: toDelete.id, isForced: true })}
      />
    </div>
  );
}
