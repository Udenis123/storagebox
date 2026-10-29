import { useEffect, useState } from "react";
import { FolderPlus, Pencil } from "lucide-react";
import { FormDialog } from "@/components/shared/FormDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DEFAULT_FILE_ACCESS, type Collection, type FileAccess } from "@/lib/types";
import { useCreateCollection, useUpdateCollection } from "./hooks";

const ACCESS_OPTIONS = [
  { value: "PUBLIC", label: "Public", description: "Anyone with the link can open files" },
  { value: "PRIVATE", label: "Private", description: "Files open only through signed links or your API key" },
];

export type CollectionDialogState = { mode: "create"; parent?: Collection } | { mode: "rename"; collection: Collection } | null;

export function CollectionDialog({ state, onClose }: { state: CollectionDialogState; onClose: () => void }) {
  const [name, setName] = useState("");
  const [access, setAccess] = useState<FileAccess>(DEFAULT_FILE_ACCESS);
  const [shouldApplyToFiles, setShouldApplyToFiles] = useState(false);
  const createCollection = useCreateCollection(onClose);
  const updateCollection = useUpdateCollection(onClose);

  useEffect(() => {
    if (!state) return;
    setName(state.mode === "rename" ? state.collection.name : "");
    setAccess(state.mode === "rename" ? state.collection.access : DEFAULT_FILE_ACCESS);
    setShouldApplyToFiles(false);
  }, [state]);

  const isRename = state?.mode === "rename";
  const parentLabel = state?.mode === "create" && state.parent ? ` inside “${state.parent.name}”` : "";

  const submit = () => {
    if (!state) return;
    if (state.mode === "rename") {
      updateCollection.mutate({ id: state.collection.id, name: name.trim(), access, ...(shouldApplyToFiles && { applyToFiles: true }) });
    }
    else createCollection.mutate({ name: name.trim(), parentId: state.parent?.id, access });
  };

  return (
    <FormDialog
      open={Boolean(state)}
      onOpenChange={(open) => !open && onClose()}
      title={isRename ? "Edit collection" : "New collection"}
      description={isRename ? "Renaming changes the collection path used by the API." : `Create a folder${parentLabel} to organise files.`}
      icon={isRename ? <Pencil /> : <FolderPlus />}
      submitLabel={isRename ? "Save" : "Create"}
      isPending={createCollection.isPending || updateCollection.isPending}
      canSubmit={name.trim().length > 0}
      onSubmit={submit}
    >
      <FormField label="Name" htmlFor="collection-name">
        <Input id="collection-name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} autoFocus />
      </FormField>
      <FormField label="Default access for new files" htmlFor="collection-access">
        <SearchableSelect options={ACCESS_OPTIONS} value={access} onChange={(value) => setAccess(value as FileAccess)} />
      </FormField>
      {isRename && (
        <label className="flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2.5">
          <Checkbox className="mt-0.5" checked={shouldApplyToFiles} onCheckedChange={(checked) => setShouldApplyToFiles(checked === true)} />
          <span className="grid gap-0.5">
            <span className="text-base">Also make every file inside {access === "PRIVATE" ? "private" : "public"}</span>
            <span className="text-sm text-muted-foreground">Changes files already here and in every sub-collection, not just new uploads.</span>
          </span>
        </label>
      )}
    </FormDialog>
  );
}
