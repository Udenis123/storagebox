import { Check, Copy, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCopy } from "@/hooks/useCopy";
import { formatBytes, formatDate } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileThumb } from "./FileThumb";

type FileCollectionProps = {
  files: StoredFile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (file: StoredFile) => void;
};

function CopyLinkButton({ file }: { file: StoredFile }) {
  const { copy, copiedText } = useCopy();
  if (!file.url) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy link"
      onClick={(event) => {
        event.stopPropagation();
        copy(file.url!, "Link copied");
      }}
    >
      {copiedText === file.url ? <Check className="text-tone-success" /> : <Copy />}
    </Button>
  );
}

export function AccessBadge({ access }: { access: StoredFile["access"] }) {
  return access === "PUBLIC" ? (
    <Badge variant="secondary" className="gap-1">
      <Globe /> Public
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-tone-warning">
      <Lock /> Private
    </Badge>
  );
}

export function FileGrid({ files, selected, onToggle, onOpen }: FileCollectionProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {files.map((file) => {
        const isSelected = selected.has(file.id);
        return (
          <li
            key={file.id}
            className={cn(
              "group relative grid overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
              isSelected && "ring-2 ring-primary",
            )}
          >
            <button type="button" onClick={() => onOpen(file)} className="grid text-left">
              <FileThumb file={file} className="aspect-[4/3] w-full rounded-none" isDetailed />
              <span className="grid gap-0.5 p-3">
                <span className="truncate text-sm font-semibold md:text-base">{file.originalName}</span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  {file.ext.toUpperCase()} · {formatBytes(file.sizeBytes)}
                </span>
              </span>
            </button>
            <span className={cn("absolute top-2 right-2 rounded-md bg-white/90 p-1 shadow-sm", !isSelected && "opacity-0 group-hover:opacity-100 max-lg:opacity-100")}>
              <Checkbox checked={isSelected} onCheckedChange={() => onToggle(file.id)} aria-label={`Select ${file.originalName}`} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function FileTable({ files, selected, onToggle, onOpen }: FileCollectionProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Collection</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="hidden sm:table-cell">Access</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} className="cursor-pointer" onClick={() => onOpen(file)} data-state={selected.has(file.id) ? "selected" : undefined}>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Checkbox checked={selected.has(file.id)} onCheckedChange={() => onToggle(file.id)} aria-label={`Select ${file.originalName}`} />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-3">
                  <FileThumb file={file} className="size-10" />
                  <span className="grid min-w-0">
                    <span className="max-w-64 truncate text-base font-medium">{file.originalName}</span>
                    <span className="max-w-64 truncate font-mono text-xs text-muted-foreground">{file.publicId}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{file.collectionPath ?? "—"}</TableCell>
              <TableCell>{formatBytes(file.sizeBytes)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <AccessBadge access={file.access} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(file.createdAt)}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <CopyLinkButton file={file} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
