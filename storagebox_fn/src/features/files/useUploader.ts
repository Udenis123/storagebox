import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStorageUpgrade } from "@/features/storage/upgradeContext";
import { ApiRequestError } from "@/lib/api";
import { ALLOWED_FILE_ACCEPT, MAX_FILES_PER_DROP, MAX_UPLOAD_LABEL, MAX_UPLOAD_MB } from "@/lib/constants";
import type { PickedFile } from "@/lib/droppedFiles";
import { folderCollectionPath } from "@/lib/files";
import { queryKeys } from "@/lib/queryKeys";
import type { FileAccess } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

export type UploadStatus = "uploading" | "done" | "error";
export type UploadTask = { id: string; name: string; destination: string; size: number; progress: number; status: UploadStatus; error?: string };
export type AccessChoice = "DEFAULT" | FileAccess;

export type UploadDestination = {
  collectionId?: string;
  /** Path of the destination collection; folder uploads create sub-collections under it. Unset means Unsorted. */
  collectionPath?: string;
  access: AccessChoice;
};

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const CONCURRENT_UPLOADS = 4;
const QUOTA_EXCEEDED_CODE = "E4003";
const ALLOWED_EXTENSIONS = new Set(ALLOWED_FILE_ACCEPT.split(",").map((ext) => ext.slice(1)));

const extensionOf = (name: string): string => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

export const UNSORTED_LABEL = "Unsorted";
export const displayPath = (path?: string): string => (path ? path.split("/").join(" / ") : UNSORTED_LABEL);

/** Upload queue that outlives folder navigation: each task remembers where it is going. */
export function useUploader() {
  const queryClient = useQueryClient();
  const { openUpgrade } = useStorageUpgrade();
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const patchTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  const startUploads = useCallback(
    async (picked: PickedFile[], { collectionId, collectionPath, access: accessChoice }: UploadDestination) => {
      if (picked.length >= MAX_FILES_PER_DROP) {
        toast.warning(`Uploading the first ${MAX_FILES_PER_DROP.toLocaleString()} files — use the storagebox CLI for bigger folders`);
      }
      const supported = picked.filter(({ file }) => ALLOWED_EXTENSIONS.has(extensionOf(file.name)));
      const skipped = picked.length - supported.length;
      if (skipped > 0) toast.info(`Skipped ${skipped} file(s) with an unsupported type`);
      if (!supported.length) return;

      const access = accessChoice === "DEFAULT" ? undefined : accessChoice;
      const queued = supported.map((entry) => {
        const collection = entry.relativePath ? folderCollectionPath(collectionPath, entry.relativePath) : undefined;
        return {
          ...entry,
          collection,
          task: {
            id: crypto.randomUUID(),
            name: entry.file.name,
            destination: displayPath(collection ?? collectionPath),
            size: entry.file.size,
            progress: 0,
            status: "uploading" as const,
          },
        };
      });
      setTasks((current) => [...queued.map((entry) => entry.task), ...current]);
      let uploadedCount = 0;

      const runOne = async ({ file, collection, task }: (typeof queued)[number]) => {
        if (file.size > MAX_UPLOAD_BYTES) {
          patchTask(task.id, { status: "error", error: `Larger than ${MAX_UPLOAD_LABEL}` });
          return;
        }
        try {
          await uploadFile(file, { collectionId, collection, access }, (progress) => patchTask(task.id, { progress }));
          patchTask(task.id, { status: "done", progress: 100 });
          uploadedCount += 1;
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
      if (uploadedCount) {
        toast.success(`${uploadedCount.toLocaleString()} file${uploadedCount === 1 ? "" : "s"} uploaded to ${displayPath(collectionPath)}`);
      }
      await Promise.all([queryKeys.files, queryKeys.collections, queryKeys.usage].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [queryClient, openUpgrade],
  );

  const clearFinished = () => setTasks((current) => current.filter((task) => task.status === "uploading"));

  return { tasks, startUploads, clearFinished };
}
