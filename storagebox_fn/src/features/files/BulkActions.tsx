import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderInput, Globe, Lock, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormDialog } from "@/components/shared/FormDialog";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { updateFile } from "./api";
import { UNSORTED } from "./CollectionTree";
import { useCollections, useDeleteFiles, useSetFilesAccess } from "./hooks";

type BulkActionsProps = { selectedIds: string[]; onClear: () => void };

export function BulkActions({ selectedIds, onClear }: BulkActionsProps) {
  const queryClient = useQueryClient();
  const { data: collections = [] } = useCollections();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [target, setTarget] = useState(UNSORTED);
  const [isMovePending, setIsMovePending] = useState(false);
  const setAccess = useSetFilesAccess(onClear);
  const deleteFiles = useDeleteFiles(() => {
    setIsConfirmingDelete(false);
    onClear();
  });

  const options = useMemo(
    () => [{ value: UNSORTED, label: "Unsorted" }, ...collections.map((collection) => ({ value: collection.id, label: collection.path }))],
    [collections],
  );

  const move = async () => {
    setIsMovePending(true);
    const collectionId = target === UNSORTED ? null : target;
    const results = await Promise.allSettled(selectedIds.map((id) => updateFile(id, { collectionId })));
    const failed = results.filter((result) => result.status === "rejected").length;
    setIsMovePending(false);
    if (failed) toast.error(`${failed} file(s) could not be moved`);
    else toast.success(`${selectedIds.length} file(s) moved`);
    await Promise.all([queryKeys.files, queryKeys.collections].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    setIsMoving(false);
    onClear();
  };

  if (selectedIds.length === 0) return null;
  const count = selectedIds.length;

  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 pl-4 shadow-md lg:top-4">
      <span className="flex-1 text-base font-semibold">{count} selected</span>
      <Button variant="outline" disabled={setAccess.isPending} onClick={() => setAccess.mutate({ ids: selectedIds, access: "PUBLIC" })}>
        <Globe /> Make public
      </Button>
      <Button variant="outline" disabled={setAccess.isPending} onClick={() => setAccess.mutate({ ids: selectedIds, access: "PRIVATE" })}>
        <Lock /> Make private
      </Button>
      <Button variant="outline" onClick={() => setIsMoving(true)}>
        <FolderInput /> Move
      </Button>
      <Button variant="destructive" onClick={() => setIsConfirmingDelete(true)}>
        <Trash2 /> Delete
      </Button>
      <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
        <X />
      </Button>

      <FormDialog
        open={isMoving}
        onOpenChange={setIsMoving}
        title={`Move ${count} file(s)`}
        description="Links stay the same — only the collection changes."
        icon={<FolderInput />}
        submitLabel="Move"
        isPending={isMovePending}
        onSubmit={() => void move()}
      >
        <SearchableSelect options={options} value={target} onChange={setTarget} />
      </FormDialog>
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={`Delete ${count} file(s)?`}
        description="They are removed from storage and their links stop working. This cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isPending={deleteFiles.isPending}
        onConfirm={() => deleteFiles.mutate(selectedIds)}
      />
    </div>
  );
}
