import { ExternalLink, Globe, Link2, Link2Off, Loader2, Lock, Share2 } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { DialogHeading } from "@/components/shared/FormDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection } from "@/lib/types";
import { useCollectionSharing, useSetCollectionSharing, useUpdateCollection } from "./hooks";

type ShareCollectionDialogProps = { collection: Collection | null; onClose: () => void };

export function ShareCollectionDialog({ collection, onClose }: ShareCollectionDialogProps) {
  const sharing = useCollectionSharing(collection?.id ?? null);
  const setSharing = useSetCollectionSharing();
  const makePublic = useUpdateCollection(() => void sharing.refetch());

  const shareUrl = sharing.data?.collection.shareUrl;
  const allowDownload = sharing.data?.collection.shareAllowDownload ?? true;
  const privateCount = sharing.data?.privateFileCount ?? 0;

  const toggleShare = (isShared: boolean) =>
    collection && setSharing.mutate({ id: collection.id, isShared, allowDownload }, { onSuccess: () => void sharing.refetch() });

  const toggleDownload = (next: boolean) =>
    collection &&
    setSharing.mutate({ id: collection.id, isShared: true, allowDownload: next }, { onSuccess: () => void sharing.refetch() });

  return (
    <Dialog open={Boolean(collection)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <div className="grid gap-5">
          <DialogHeading
            icon={<Share2 />}
            title={`Share “${collection?.name ?? ""}”`}
            description="One link opens a gallery of everything in this folder and its sub-folders."
          />

          {sharing.isLoading ? (
            <Skeleton className="h-24" />
          ) : shareUrl ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-tone-success">
                <Link2 className="size-4" /> Anyone with this link can view the gallery
              </div>
              <CopyField value={shareUrl} canOpen />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Checkbox
                  checked={allowDownload}
                  disabled={setSharing.isPending}
                  onCheckedChange={(checked) => toggleDownload(checked === true)}
                  className="mt-0.5"
                />
                <span className="grid gap-0.5">
                  <Label className="cursor-pointer text-sm font-medium">Allow downloads</Label>
                  <span className="text-sm text-muted-foreground">
                    When on, each file shows a download icon on hover. When off, visitors can only view.
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button render={<a href={shareUrl} target="_blank" rel="noreferrer" />}>
                  <ExternalLink /> Open gallery
                </Button>
                <Button variant="outline" disabled={setSharing.isPending} onClick={() => toggleShare(false)}>
                  {setSharing.isPending ? <Loader2 className="animate-spin" /> : <Link2Off />} Stop sharing
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                Visitors don&apos;t need an account. They can browse photos, play videos and read documents. You choose whether they can download
                files. Turning sharing off breaks the link straight away.
              </p>
              <Button className="justify-self-start" disabled={setSharing.isPending} onClick={() => toggleShare(true)}>
                {setSharing.isPending ? <Loader2 className="animate-spin" /> : <Globe />} Create share link
              </Button>
            </div>
          )}

          {privateCount > 0 && collection && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-tone-warning-bg/60 p-3 ring-1 ring-tone-warning/20">
              <Lock className="size-4 shrink-0 text-tone-warning" />
              <span className="min-w-0 flex-1 text-sm">
                {privateCount.toLocaleString()} private file{privateCount === 1 ? "" : "s"} won&apos;t appear in the gallery.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-background"
                disabled={makePublic.isPending}
                onClick={() => makePublic.mutate({ id: collection.id, access: "PUBLIC", applyToFiles: true })}
              >
                {makePublic.isPending && <Loader2 className="animate-spin" />} Make them public
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
