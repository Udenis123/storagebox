import { useMemo, useState, type KeyboardEvent } from "react";
import { Globe, Loader2, Lock, Plus, X } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UNSORTED } from "../CollectionTree";
import { useCollections, useUpdateFile } from "../hooks";

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;
const MAX_TAG_LENGTH = 40;

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function aspectRatio(width: number, height: number): string {
  const divisor = greatestCommonDivisor(width, height);
  const [x, y] = [width / divisor, height / divisor];
  return x <= 32 && y <= 32 ? `${x}:${y}` : (width / height).toFixed(2);
}

function AccessCard({ file }: { file: StoredFile }) {
  const updateFile = useUpdateFile();
  const isPublic = file.access === "PUBLIC";
  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-3 ring-1", isPublic ? "bg-tone-success-bg/60 ring-tone-success/20" : "bg-tone-warning-bg/60 ring-tone-warning/20")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-background", isPublic ? "text-tone-success" : "text-tone-warning")}>
        {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
      </span>
      <div className="grid flex-1 gap-0.5">
        <span className="text-sm font-semibold">{isPublic ? "Public" : "Private"}</span>
        <span className="text-xs text-muted-foreground">{isPublic ? "Anyone with the link can open it" : "Only expiring signed links work"}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="bg-background"
        disabled={updateFile.isPending}
        onClick={() => updateFile.mutate({ id: file.id, input: { access: isPublic ? "PRIVATE" : "PUBLIC" } })}
      >
        {updateFile.isPending && <Loader2 className="animate-spin" />}
        Make {isPublic ? "private" : "public"}
      </Button>
    </div>
  );
}

function TagEditor({ file }: { file: StoredFile }) {
  const [draft, setDraft] = useState("");
  const updateFile = useUpdateFile();
  const saveTags = (tags: string[]) => updateFile.mutate({ id: file.id, input: { tags } });

  const addDraft = () => {
    const tag = draft.trim().replace(/,/g, "").slice(0, MAX_TAG_LENGTH);
    setDraft("");
    if (tag && !file.tags.includes(tag)) saveTags([...file.tags, tag]);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    }
    if (event.key === "Backspace" && !draft && file.tags.length) saveTags(file.tags.slice(0, -1));
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">Tags</span>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/30">
        {file.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-primary/10 py-0.5 pr-1 pl-2 text-sm font-medium text-primary">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              className="rounded p-0.5 hover:bg-primary/15"
              onClick={() => saveTags(file.tags.filter((item) => item !== tag))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addDraft}
          placeholder={file.tags.length ? "Add tag" : "Add a tag and press Enter"}
          aria-label="Add tag"
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        {updateFile.isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : draft && <Plus className="size-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

function EditForm({ file }: { file: StoredFile }) {
  const { data: collections = [] } = useCollections();
  const [name, setName] = useState(file.originalName);
  const [publicId, setPublicId] = useState(file.publicId);
  const [collectionId, setCollectionId] = useState(file.collectionId ?? UNSORTED);
  const updateFile = useUpdateFile();

  const collectionOptions = useMemo(
    () => [{ value: UNSORTED, label: "Unsorted" }, ...collections.map((collection) => ({ value: collection.id, label: collection.path }))],
    [collections],
  );
  const isPublicIdValid = PUBLIC_ID_PATTERN.test(publicId);
  const isDirty = name.trim() !== file.originalName || publicId !== file.publicId || collectionId !== (file.collectionId ?? UNSORTED);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        updateFile.mutate({
          id: file.id,
          input: {
            originalName: name.trim(),
            publicId: publicId !== file.publicId ? publicId : undefined,
            collectionId: collectionId === UNSORTED ? null : collectionId,
          },
        });
      }}
    >
      <FormField label="Display name" htmlFor="asset-name">
        <Input id="asset-name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} />
      </FormField>
      <FormField
        label="Public ID"
        htmlFor="asset-public-id"
        hint="Part of the file's link — changing it breaks old links."
        error={isPublicIdValid ? undefined : "Use letters, digits, - and _ only"}
      >
        <Input id="asset-public-id" value={publicId} onChange={(event) => setPublicId(event.target.value)} className={`${INPUT_CLASS} font-mono`} />
      </FormField>
      <FormField label="Collection" htmlFor="asset-collection">
        <SearchableSelect options={collectionOptions} value={collectionId} onChange={setCollectionId} />
      </FormField>
      {isDirty && (
        <Button type="submit" size="lg" disabled={!name.trim() || !isPublicIdValid || updateFile.isPending}>
          {updateFile.isPending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      )}
    </form>
  );
}

export function AssetSummary({ file }: { file: StoredFile }) {
  const facts: [string, string][] = [
    ["Format", `${file.ext.toUpperCase()} · ${file.mime}`],
    ...(file.width && file.height
      ? [
          ["Dimensions", `${file.width} × ${file.height} px`] as [string, string],
          ["Aspect ratio", aspectRatio(file.width, file.height)] as [string, string],
        ]
      : []),
    ["Size", formatBytes(file.sizeBytes)],
    ["Collection", file.collectionPath ?? "Unsorted"],
    ["Uploaded", formatDateTime(file.createdAt)],
    ["Updated", formatDateTime(file.updatedAt)],
  ];

  return (
    <div className="grid gap-6">
      <AccessCard file={file} />

      <dl className="grid gap-x-4 gap-y-2.5 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>

      <CopyField label="Public ID" value={file.publicId} />
      <TagEditor file={file} />

      <div className="grid gap-4 border-t pt-5">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Edit</h3>
        <EditForm key={`${file.id}-${file.updatedAt}`} file={file} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Checksum (SHA-256)</summary>
        <code className="mt-2 block rounded-md bg-muted p-2 font-mono text-xs break-all">{file.checksum}</code>
      </details>
    </div>
  );
}
