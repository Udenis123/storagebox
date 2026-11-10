import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Globe, Loader2, Lock, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { CopyField } from "@/components/shared/CopyField";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatName } from "@/lib/files";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UNSORTED } from "../CollectionTree";
import { useCollections, useReplaceFile, useUpdateFile } from "../hooks";

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
        <span className="text-xs text-muted-foreground">
          {isPublic ? "Anyone with the link can open it" : "The permanent link tells visitors you made it private. Share a signed link instead."}
        </span>
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

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function ReplaceContentCard({ file }: { file: StoredFile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const replaceFile = useReplaceFile(() => setProgress(null));

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (extensionOf(next.name) !== file.ext.toLowerCase()) {
      toast.error(`Choose a .${file.ext} file so the share link stays valid`);
      return;
    }
    setProgress(0);
    replaceFile.mutate(
      { id: file.id, file: next, onProgress: setProgress },
      { onError: () => setProgress(null) },
    );
  };

  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-0.5">
        <span className="text-sm font-semibold">Replace content</span>
        <span className="text-xs text-muted-foreground">
          Upload a new .{file.ext} file. The share link stays the same; videos re-package adaptive streaming in the background.
        </span>
      </div>
      <input ref={inputRef} type="file" className="hidden" accept={`.${file.ext}`} onChange={onPick} />
      <Button
        type="button"
        variant="outline"
        className="justify-self-start bg-background"
        disabled={replaceFile.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {replaceFile.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {replaceFile.isPending ? (progress !== null ? `Uploading ${progress}%` : "Replacing…") : "Choose file"}
      </Button>
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

function sizeFact(file: StoredFile): string {
  if (!file.originalSizeBytes) return formatBytes(file.sizeBytes);
  const savedPercent = Math.round((1 - file.sizeBytes / file.originalSizeBytes) * 100);
  return `${formatBytes(file.sizeBytes)} · was ${formatBytes(file.originalSizeBytes)} (${savedPercent}% smaller)`;
}

export function AssetSummary({ file }: { file: StoredFile }) {
  const facts: [string, string][] = [
    ["Format", formatName(file)],
    ...(file.width && file.height
      ? [
          ["Dimensions", `${file.width} × ${file.height} px`] as [string, string],
          ["Aspect ratio", aspectRatio(file.width, file.height)] as [string, string],
        ]
      : []),
    ["Size", sizeFact(file)],
    ["Collection", file.collectionPath ?? "Unsorted"],
    ["Uploaded", formatDateTime(file.createdAt)],
    ["Updated", formatDateTime(file.updatedAt)],
    ["MIME type", file.mime],
  ];

  return (
    <div className="grid gap-6">
      <AccessCard file={file} />

      <dl className="grid gap-x-4 gap-y-2.5 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("font-medium wrap-anywhere", label === "MIME type" && "font-mono text-xs leading-5 font-normal text-muted-foreground")}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <CopyField label="Public ID" value={file.publicId} />
      <TagEditor file={file} />

      <div className="grid gap-4 border-t pt-5">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Edit</h3>
        <ReplaceContentCard key={`replace-${file.id}-${file.updatedAt}`} file={file} />
        <EditForm key={`${file.id}-${file.updatedAt}`} file={file} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Checksum (SHA-256)</summary>
        <code className="mt-2 block rounded-md bg-muted p-2 font-mono text-xs break-all">{file.checksum}</code>
      </details>
    </div>
  );
}
