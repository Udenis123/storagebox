import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { FileDetailsPanel } from "./FileDetailsPanel";
import { FileLinksPanel } from "./FileLinksPanel";
import { FilePreview } from "./FilePreview";
import { TransformPanel } from "./TransformPanel";

type FileDetailsDialogProps = { file: StoredFile | null; onClose: () => void };

export function FileDetailsDialog({ file, onClose }: FileDetailsDialogProps) {
  const isTransformable = file?.kind === "image" && file.ext !== "svg";
  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-6xl">
        {file && (
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            <div className="grid min-w-0 content-start gap-4">
              <div className="grid gap-1 pr-10">
                <DialogTitle className="truncate text-xl font-semibold md:text-2xl">{file.originalName}</DialogTitle>
                <DialogDescription className="text-base">
                  {file.ext.toUpperCase()} · {formatBytes(file.sizeBytes)} · {file.collectionPath ?? "Unsorted"}
                </DialogDescription>
              </div>
              <FilePreview file={file} />
            </div>
            <Tabs defaultValue="links" className="min-w-0">
              <TabsList className="w-full">
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                {isTransformable && <TabsTrigger value="transform">Transform</TabsTrigger>}
              </TabsList>
              <TabsContent value="links" className="pt-4">
                <FileLinksPanel file={file} />
              </TabsContent>
              <TabsContent value="details" className="pt-4">
                <FileDetailsPanel file={file} onDeleted={onClose} />
              </TabsContent>
              {isTransformable && (
                <TabsContent value="transform" className="pt-4">
                  <TransformPanel file={file} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
