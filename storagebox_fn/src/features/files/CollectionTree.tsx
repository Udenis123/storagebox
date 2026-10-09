import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Inbox, Layers, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
};

const ROW = "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-base transition-colors";

export function CollectionTree({ selectedId, onSelect }: CollectionTreeProps) {
  const { data: collections = [], isLoading } = useCollections();
  const [dialog, setDialog] = useState<CollectionDialogState>(null);
  const [toDelete, setToDelete] = useState<Collection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const deleteCollection = useDeleteCollection(() => {
    if (toDelete && selectedId === toDelete.id) onSelect(ALL_FILES);
    setToDelete(null);
  });
  const tree = useMemo(() => buildTree(collections), [collections]);

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
        <div className={cn(ROW, "group pr-1", isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted")} style={{ paddingLeft: `${depth * 14 + 4}px` }}>
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className={cn("flex size-6 shrink-0 items-center justify-center rounded", !node.children.length && "invisible")}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("size-4 transition-transform", isExpanded && "rotate-90")} />
          </button>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-2" onClick={() => onSelect(node.id)}>
            {isSelected ? <FolderOpen className="size-5 shrink-0" /> : <Folder className="size-5 shrink-0 text-muted-foreground" />}
            <span className="truncate">{node.name}</span>
            {node.access === "PRIVATE" && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
          </button>
          <span className="text-sm text-muted-foreground">{node.fileCount}</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Collection actions" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={() => setDialog({ mode: "create", parent: node })}>
                <FolderPlus /> New sub-collection
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
        {isExpanded && node.children.length > 0 && <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
      </li>
    );
  };

  const fixedRow = (id: string, label: string, Icon: typeof Layers) => (
    <button type="button" onClick={() => onSelect(id)} className={cn(ROW, "py-2", selectedId === id ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
      <Icon className="size-5" /> {label}
    </button>
  );

  return (
    <div className="grid content-start gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Collections</h2>
        <Button variant="outline" size="sm" onClick={() => setDialog({ mode: "create" })}>
          <FolderPlus /> New
        </Button>
      </div>
      {fixedRow(ALL_FILES, "All files", Layers)}
      {fixedRow(UNSORTED, "Unsorted", Inbox)}
      {isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="grid gap-0.5">{tree.map((node) => renderNode(node, 0))}</ul>
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
