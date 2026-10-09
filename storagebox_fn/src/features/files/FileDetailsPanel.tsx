import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { UNSORTED } from "./CollectionTree";
import { useCollections, useDeleteFiles, useUpdateFile } from "./hooks";

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;

const parseTags = (value: string): string[] => [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];

export function FileDetailsPanel({ file, onDeleted }: { file: StoredFile; onDeleted: () => void }) {
  const { data: collections = [] } = useCollections();
  const [name, setName] = useState(file.originalName);
  const [publicId, setPublicId] = useState(file.publicId);
  const [collectionId, setCollectionId] = useState(file.collectionId ?? UNSORTED);
  const [tags, setTags] = useState(file.tags.join(", "));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const updateFile = useUpdateFile();
  const deleteFiles = useDeleteFiles(onDeleted);

  useEffect(() => {
    setName(file.originalName);
    setPublicId(file.publicId);
    setCollectionId(file.collectionId ?? UNSORTED);
    setTags(file.tags.join(", "));
  }, [file]);

  const collectionOptions = useMemo(
    () => [{ value: UNSORTED, label: "Unsorted" }, ...collections.map((collection) => ({ value: collection.id, label: collection.path }))],
    [collections],
  );

  const isPublicIdValid = PUBLIC_ID_PATTERN.test(publicId);
  const save = () =>
    updateFile.mutate({
      id: file.id,
      input: {
        originalName: name.trim(),
        publicId: publicId !== file.publicId ? publicId : undefined,
        collectionId: collectionId === UNSORTED ? null : collectionId,
        tags: parseTags(tags),
      },
    });

  const facts: [string, string][] = [
    ["Size", formatBytes(file.sizeBytes)],
    ["Type", file.mime],
    ...(file.width ? [["Dimensions", `${file.width} × ${file.height} px`] as [string, string]] : []),
    ["Uploaded", formatDateTime(file.createdAt)],
    ["SHA-256", file.checksum],
  ];

  return (
    <div className="grid gap-5">
      <FormField label="File name" htmlFor="file-name">
        <Input id="file-name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} />
      </FormField>
      <FormField
        label="Public ID"
        htmlFor="public-id"
        hint="Changing it changes the file's link."
        error={isPublicIdValid ? undefined : "Use letters, digits, - and _ only"}
      >
        <Input id="public-id" value={publicId} onChange={(event) => setPublicId(event.target.value)} className={`${INPUT_CLASS} font-mono`} />
      </FormField>
      <FormField label="Collection" htmlFor="file-collection">
        <SearchableSelect options={collectionOptions} value={collectionId} onChange={setCollectionId} />
      </FormField>
      <FormField label="Tags" htmlFor="file-tags" hint="Comma separated, e.g. invoice, 2026">
        <Input id="file-tags" value={tags} onChange={(event) => setTags(event.target.value)} className={INPUT_CLASS} />
      </FormField>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="destructive" size="lg" onClick={() => setIsConfirmingDelete(true)}>
          <Trash2 /> Delete
        </Button>
        <Button size="lg" disabled={!name.trim() || !isPublicIdValid || updateFile.isPending} onClick={save}>
          {updateFile.isPending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </div>

      <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium break-all">{value}</dd>
          </div>
        ))}
      </dl>

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this file?"
        description={`“${file.originalName}” is removed from storage and all its links stop working.`}
        confirmLabel="Delete file"
        isDestructive
        isPending={deleteFiles.isPending}
        onConfirm={() => deleteFiles.mutate([file.id])}
      />
    </div>
  );
}
