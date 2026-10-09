import { useCallback, useRef, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CloudUpload, Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ALLOWED_FILE_ACCEPT, MAX_FILES_PER_UPLOAD, MAX_UPLOAD_MB } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { FileAccess } from "@/lib/types";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

type UploadStatus = "uploading" | "done" | "error";
type UploadTask = { id: string; name: string; size: number; progress: number; status: UploadStatus; error?: string };

type UploadZoneProps = {
  collectionId?: string;
  collectionLabel: string;
  access?: FileAccess;
};

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;

export function UploadZone({ collectionId, collectionLabel, access }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const patchTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  const startUploads = useCallback(
    async (fileList: FileList | File[]) => {
      const files = [...fileList];
      if (files.length > MAX_FILES_PER_UPLOAD) toast.warning(`Uploading the first ${MAX_FILES_PER_UPLOAD} files`);
      const accepted = files.slice(0, MAX_FILES_PER_UPLOAD);
      const queued = accepted.map((file) => ({ file, task: { id: crypto.randomUUID(), name: file.name, size: file.size, progress: 0, status: "uploading" as const } }));
      setTasks((current) => [...queued.map((entry) => entry.task), ...current]);

      const runOne = async ({ file, task }: (typeof queued)[number]) => {
        if (file.size > MAX_UPLOAD_BYTES) {
          patchTask(task.id, { status: "error", error: `Larger than ${MAX_UPLOAD_MB} MB` });
          return;
        }
        try {
          await uploadFile(file, { collectionId, access }, (progress) => patchTask(task.id, { progress }));
          patchTask(task.id, { status: "done", progress: 100 });
        } catch (error) {
          patchTask(task.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
        }
      };

      const pending = [...queued];
      const workers = Array.from({ length: CONCURRENT_UPLOADS }, async () => {
        for (let next = pending.shift(); next; next = pending.shift()) await runOne(next);
      });
      await Promise.all(workers);
      await Promise.all([queryKeys.files, queryKeys.collections, queryKeys.usage].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [collectionId, access, queryClient],
  );

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) void startUploads(event.dataTransfer.files);
  };

  const finishedCount = tasks.filter((task) => task.status !== "uploading").length;

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors md:p-8",
          isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/40",
        )}
      >
        <CloudUpload className="size-10 text-primary" />
        <span className="text-base font-semibold md:text-lg">Drop files here or click to browse</span>
        <span className="text-sm text-muted-foreground md:text-base">
          Into <strong className="text-foreground">{collectionLabel}</strong> · PDF, Word, Excel, images, video… up to {MAX_UPLOAD_MB} MB each
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void startUploads(event.target.files);
          event.target.value = "";
        }}
      />

      {tasks.length > 0 && (
        <div className="grid gap-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Uploads · {finishedCount}/{tasks.length}
            </span>
            {finishedCount === tasks.length && (
              <Button variant="ghost" size="sm" onClick={() => setTasks([])}>
                <X /> Clear
              </Button>
            )}
          </div>
          <ul className="grid max-h-56 gap-2 overflow-y-auto">
            {tasks.map((task) => (
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
          </ul>
        </div>
      )}
    </div>
  );
}
