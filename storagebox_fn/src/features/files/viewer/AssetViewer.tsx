import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Link2, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopy } from "@/hooks/useCopy";
import { downloadUrl, isTransformable } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { FilePreview } from "../FilePreview";
import { FileKindIcon } from "../FileThumb";
import { useDeleteFiles, useViewUrl } from "../hooks";
import { AssetLinks } from "./AssetLinks";
import { AssetSummary } from "./AssetSummary";
import { CHECKERBOARD, ImageStage } from "./ImageStage";
import { TransformStudio } from "./TransformStudio";

type AssetViewerProps = {
  file: StoredFile | null;
  /** Files of the current page, for previous / next navigation. */
  siblings: StoredFile[];
  onNavigate: (file: StoredFile) => void;
  onClose: () => void;
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function HeaderActions({ file, onDelete }: { file: StoredFile; onDelete: () => void }) {
  const { url } = useViewUrl(file);
  const { copy, copiedText } = useCopy();
  return (
    <div className="flex items-center gap-1.5">
      {file.url && (
        <Button variant="outline" className="hidden sm:inline-flex" onClick={() => copy(file.url!, "Link copied")}>
          {copiedText === file.url ? <Check className="text-tone-success" /> : <Link2 />} Copy link
        </Button>
      )}
      <Button variant="outline" size="icon" aria-label="Download" disabled={!url} render={url ? <a href={downloadUrl(url)} /> : undefined}>
        <Download />
      </Button>
      <Button variant="outline" size="icon" aria-label="Delete" className="text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 />
      </Button>
    </div>
  );
}

function ViewerBody({ file, siblings, onNavigate, onClose }: AssetViewerProps & { file: StoredFile }) {
  const [transform, setTransform] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const index = siblings.findIndex((item) => item.id === file.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;
  const canTransform = isTransformable(file);

  const deleteFiles = useDeleteFiles(() => {
    setIsDeleting(false);
    const neighbour = next ?? previous;
    if (neighbour) onNavigate(neighbour);
    else onClose();
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.key === "ArrowLeft" && previous) onNavigate(previous);
      if (event.key === "ArrowRight" && next) onNavigate(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previous, next, onNavigate]);

  const meta = [file.ext.toUpperCase(), file.width && file.height ? `${file.width} × ${file.height}` : null, formatBytes(file.sizeBytes)]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-3 sm:px-4">
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
        <FileKindIcon file={file} className="hidden size-10 sm:flex" />
        <div className="grid min-w-0 flex-1">
          <DialogTitle className="truncate text-base font-semibold sm:text-lg">{file.originalName}</DialogTitle>
          <DialogDescription className="truncate text-xs sm:text-sm">
            {meta} · {file.collectionPath ?? "Unsorted"}
          </DialogDescription>
        </div>
        {siblings.length > 1 && index >= 0 && (
          <div className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="icon" aria-label="Previous file" disabled={!previous} onClick={() => previous && onNavigate(previous)}>
              <ChevronLeft />
            </Button>
            <span className="min-w-14 text-center text-sm text-muted-foreground tabular-nums">
              {index + 1} / {siblings.length}
            </span>
            <Button variant="ghost" size="icon" aria-label="Next file" disabled={!next} onClick={() => next && onNavigate(next)}>
              <ChevronRight />
            </Button>
          </div>
        )}
        <HeaderActions file={file} onDelete={() => setIsDeleting(true)} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main className="relative flex h-[50dvh] shrink-0 flex-col bg-muted/40 lg:h-auto lg:min-w-0 lg:flex-1">
          {canTransform ? (
            <ImageStage key={file.id} file={file} transform={transform} />
          ) : (
            <div className={file.kind === "image" ? `flex flex-1 items-center justify-center p-6 ${CHECKERBOARD}` : "grid min-h-0 flex-1 p-4 sm:p-6"}>
              <FilePreview file={file} isFill />
            </div>
          )}
          {previous && (
            <button
              type="button"
              aria-label="Previous file"
              onClick={() => onNavigate(previous)}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-md ring-1 ring-border transition hover:scale-105 md:hidden"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {next && (
            <button
              type="button"
              aria-label="Next file"
              onClick={() => onNavigate(next)}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-md ring-1 ring-border transition hover:scale-105 md:hidden"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </main>

        <aside className="flex min-w-0 shrink-0 flex-col border-t bg-background lg:w-[26rem] lg:border-t-0 lg:border-l">
          <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-4 mt-4 w-auto shrink-0">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              {canTransform && <TabsTrigger value="transform">Transform</TabsTrigger>}
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <TabsContent value="summary">
                <AssetSummary file={file} />
              </TabsContent>
              <TabsContent value="links">
                <AssetLinks file={file} />
              </TabsContent>
              {canTransform && (
                <TabsContent value="transform">
                  <TransformStudio file={file} transform={transform} onChange={setTransform} />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </aside>
      </div>

      <ConfirmDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        title="Delete this file?"
        description={`“${file.originalName}” is removed from storage and all its links stop working.`}
        confirmLabel="Delete file"
        isDestructive
        isPending={deleteFiles.isPending}
        onConfirm={() => deleteFiles.mutate([file.id])}
      />
    </>
  );
}

/** Full-screen asset page in the style of Cloudinary's media library: big preview, details sidebar, prev / next. */
export function AssetViewer(props: AssetViewerProps) {
  const { file, onClose } = props;
  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none data-open:zoom-in-100"
      >
        {file && <ViewerBody key={file.id} {...props} file={file} />}
      </DialogContent>
    </Dialog>
  );
}
