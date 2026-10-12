import { useCallback, useRef, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CloudUpload, FolderUp, Globe, HardDrive, Loader2, Lock, Rocket, Upload, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStorageHealth } from "@/features/storage/hooks";
import { useStorageUpgrade } from "@/features/storage/upgradeContext";
import { ApiRequestError } from "@/lib/api";
import { ALLOWED_FILE_ACCEPT, MAX_FILES_PER_DROP, MAX_UPLOAD_LABEL, MAX_UPLOAD_MB } from "@/lib/constants";
import { droppedFiles, pickedFolderFiles, type PickedFile } from "@/lib/droppedFiles";
import { folderCollectionPath } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { FileAccess } from "@/lib/types";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

type UploadStatus = "uploading" | "done" | "error";
type UploadTask = { id: string; name: string; size: number; progress: number; status: UploadStatus; error?: string };
type AccessChoice = "DEFAULT" | FileAccess;

type UploadZoneProps = {
  collectionId?: string;
  /** Path of the current collection; folder uploads create sub-collections under it. */
  collectionPath?: string;
  collectionLabel: string;
  /** Access new files get when no choice is made: the collection's, or public. */
  defaultAccess?: FileAccess;
};

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const CONCURRENT_UPLOADS = 4;
const VISIBLE_TASKS = 100;
const QUOTA_EXCEEDED_CODE = "E4003";
const ALLOWED_EXTENSIONS = new Set(ALLOWED_FILE_ACCEPT.split(",").map((ext) => ext.slice(1)));

const extensionOf = (name: string): string => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

function AccessChoiceButton({ isActive, onClick, icon, label }: { isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4",
        isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function UploadZone({ collectionId, collectionPath, collectionLabel, defaultAccess = "PUBLIC" }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [accessChoice, setAccessChoice] = useState<AccessChoice>("DEFAULT");
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const health = useStorageHealth();
  const { openUpgrade } = useStorageUpgrade();

  const patchTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  const startUploads = useCallback(
    async (picked: PickedFile[]) => {
      if (picked.length >= MAX_FILES_PER_DROP) {
        toast.warning(`Uploading the first ${MAX_FILES_PER_DROP.toLocaleString()} files — use the storagebox CLI for bigger folders`);
      }
      const supported = picked.filter(({ file }) => ALLOWED_EXTENSIONS.has(extensionOf(file.name)));
      const skipped = picked.length - supported.length;
      if (skipped > 0) toast.info(`Skipped ${skipped} file(s) with an unsupported type`);

      const access = accessChoice === "DEFAULT" ? undefined : accessChoice;
      const queued = supported.map((entry) => ({
        ...entry,
        task: { id: crypto.randomUUID(), name: entry.relativePath ?? entry.file.name, size: entry.file.size, progress: 0, status: "uploading" as const },
      }));
      setTasks((current) => [...queued.map((entry) => entry.task), ...current]);

      const runOne = async ({ file, relativePath, task }: (typeof queued)[number]) => {
        if (file.size > MAX_UPLOAD_BYTES) {
          patchTask(task.id, { status: "error", error: `Larger than ${MAX_UPLOAD_LABEL}` });
          return;
        }
        const collection = relativePath ? folderCollectionPath(collectionPath, relativePath) : undefined;
        try {
          await uploadFile(file, { collectionId, collection, access }, (progress) => patchTask(task.id, { progress }));
          patchTask(task.id, { status: "done", progress: 100 });
        } catch (error) {
          const isQuotaError = error instanceof ApiRequestError && error.errorCode === QUOTA_EXCEEDED_CODE;
          patchTask(task.id, { status: "error", error: isQuotaError ? "Not enough storage" : error instanceof Error ? error.message : "Upload failed" });
          if (isQuotaError) {
            toast.error("Your storage is full", { id: QUOTA_EXCEEDED_CODE, action: { label: "Upgrade", onClick: openUpgrade } });
          }
        }
      };

      const pending = [...queued];
      const workers = Array.from({ length: CONCURRENT_UPLOADS }, async () => {
        for (let next = pending.shift(); next; next = pending.shift()) await runOne(next);
      });
      await Promise.all(workers);
      await Promise.all([queryKeys.files, queryKeys.collections, queryKeys.usage].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [collectionId, collectionPath, accessChoice, queryClient, openUpgrade],
  );

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void droppedFiles(event.dataTransfer, MAX_FILES_PER_DROP).then((picked) => {
      if (picked.length) void startUploads(picked);
    });
  };

  const finishedCount = tasks.filter((task) => task.status !== "uploading").length;
  const failedCount = tasks.filter((task) => task.status === "error").length;

  if (health?.level === "full") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-destructive/30 bg-destructive/5 p-6 text-center md:p-8">
        <HardDrive className="size-10 text-destructive" />
        <div className="grid gap-1">
          <span className="text-base font-semibold md:text-lg">Your storage is full</span>
          <span className="text-sm text-muted-foreground md:text-base">
            Uploads are paused at {formatBytes(health.quotaBytes)}. Delete files you no longer need or ask for more space.
          </span>
        </div>
        <Button size="lg" onClick={openUpgrade}>
          <Rocket /> Upgrade storage
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "grid gap-3 rounded-xl border-2 border-dashed p-4 transition-colors",
          isDragging ? "border-primary bg-accent" : "border-border bg-card",
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CloudUpload className="size-6" />
          </span>
          <div className="grid min-w-52 flex-1 gap-0.5">
            <span className="text-base font-semibold">Drop files or whole folders here</span>
            <span className="text-sm text-muted-foreground">
              Into <strong className="text-foreground">{collectionLabel}</strong> · sub-folders become collections · up to {MAX_UPLOAD_LABEL} per file
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload /> Choose files
            </Button>
            <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
              <FolderUp /> Choose folder
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">New files are</span>
          <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Access for new files">
            <AccessChoiceButton
              isActive={accessChoice === "DEFAULT"}
              onClick={() => setAccessChoice("DEFAULT")}
              icon={defaultAccess === "PRIVATE" ? <Lock /> : <Globe />}
              label={`Like the collection (${defaultAccess === "PRIVATE" ? "private" : "public"})`}
            />
            <AccessChoiceButton isActive={accessChoice === "PUBLIC"} onClick={() => setAccessChoice("PUBLIC")} icon={<Globe />} label="Public" />
            <AccessChoiceButton isActive={accessChoice === "PRIVATE"} onClick={() => setAccessChoice("PRIVATE")} icon={<Lock />} label="Private" />
          </div>
          <span className="text-xs text-muted-foreground xl:ml-auto">Photos are optimised and text files compressed automatically.</span>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void startUploads([...event.target.files].slice(0, MAX_FILES_PER_DROP).map((file) => ({ file })));
          event.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          if (event.target.files?.length) void startUploads(pickedFolderFiles(event.target.files, MAX_FILES_PER_DROP));
          event.target.value = "";
        }}
      />

      {tasks.length > 0 && (
        <div className="grid gap-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Uploads · {finishedCount.toLocaleString()}/{tasks.length.toLocaleString()}
              {failedCount > 0 && <span className="text-destructive"> · {failedCount} failed</span>}
            </span>
            {finishedCount === tasks.length && (
              <Button variant="ghost" size="sm" onClick={() => setTasks([])}>
                <X /> Clear
              </Button>
            )}
          </div>
          {tasks.length > 1 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(finishedCount / tasks.length) * 100}%` }} />
            </div>
          )}
          <ul className="grid max-h-56 gap-2 overflow-y-auto">
            {tasks.slice(0, VISIBLE_TASKS).map((task) => (
              <li key={task.id} className="grid gap-1">
                <div className="flex items-center gap-2 text-sm">
                  {task.status === "uploading" && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
                  {task.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-tone-success" />}
                  {task.status === "error" && <XCircle className="size-4 shrink-0 text-destructive" />}
                  <span className="min-w-0 flex-1 truncate">{task.name}</span>
                  <span className="shrink-0 text-muted-foreground">{task.error ?? formatBytes(task.size)}</span>
                </div>
                {task.status === "uploading" && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
            {tasks.length > VISIBLE_TASKS && (
              <li className="text-sm text-muted-foreground">and {(tasks.length - VISIBLE_TASKS).toLocaleString()} more…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
