import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, CloudUpload, Folder, FolderUp, Globe, Loader2, Lock, Upload, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStorageHealth } from "@/features/storage/hooks";
import { useStorageUpgrade } from "@/features/storage/upgradeContext";
import { ALLOWED_FILE_ACCEPT, MAX_FILES_PER_DROP } from "@/lib/constants";
import { droppedFiles, pickedFolderFiles, type PickedFile } from "@/lib/droppedFiles";
import { formatBytes } from "@/lib/format";
import type { FileAccess } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { AccessChoice, UploadTask } from "./useUploader";

const VISIBLE_TASKS = 100;

const accessLabel = (access: FileAccess) => (access === "PRIVATE" ? "private" : "public");

type UploadMenuProps = {
  destination: string;
  access: AccessChoice;
  defaultAccess: FileAccess;
  onAccessChange: (access: AccessChoice) => void;
  onPick: (picked: PickedFile[]) => void;
};

/** "Upload" button: pick files or a folder and choose whether new files are public or private. */
export function UploadMenu({ destination, access, defaultAccess, onAccessChange, onPick }: UploadMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const health = useStorageHealth();
  const { openUpgrade } = useStorageUpgrade();

  if (health?.level === "full") {
    return (
      <Button variant="destructive" onClick={openUpgrade}>
        <CloudUpload /> Storage full
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button className="max-sm:w-full" />}>
          <Upload /> Upload <ChevronDown className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="grid gap-0.5">
              <span className="text-xs font-normal text-muted-foreground">Uploading to</span>
              <span className="truncate text-sm font-semibold text-foreground">{destination}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload /> Upload files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
            <FolderUp /> Upload a folder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">New files are</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={access} onValueChange={(value) => onAccessChange(value as AccessChoice)}>
              <DropdownMenuRadioItem value="DEFAULT">
                {defaultAccess === "PRIVATE" ? <Lock /> : <Globe />} Folder default ({accessLabel(defaultAccess)})
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="PUBLIC">
                <Globe /> Public
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="PRIVATE">
                <Lock /> Private
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onPick([...event.target.files].slice(0, MAX_FILES_PER_DROP).map((file) => ({ file })));
          event.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          if (event.target.files?.length) onPick(pickedFolderFiles(event.target.files, MAX_FILES_PER_DROP));
          event.target.value = "";
        }}
      />
    </>
  );
}

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

type PageDropTargetProps = { destination: string; isDisabled?: boolean; onPick: (picked: PickedFile[]) => void; children: ReactNode };

/** Files dropped anywhere inside go to the current folder; a full-screen overlay names it while dragging. */
export function PageDropTarget({ destination, isDisabled, onPick, children }: PageDropTargetProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragEnter={(event) => {
        if (!isDisabled && hasFiles(event)) setIsDragging(true);
      }}
    >
      {children}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-primary/15 p-6 backdrop-blur-sm"
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void droppedFiles(event.dataTransfer, MAX_FILES_PER_DROP).then((picked) => {
              if (picked.length) onPick(picked);
            });
          }}
        >
          <div className="pointer-events-none grid max-w-md place-items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card px-8 py-10 text-center shadow-2xl">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <CloudUpload className="size-8" />
            </span>
            <span className="text-lg font-semibold md:text-xl">Drop to upload</span>
            <span className="flex items-center gap-2 text-base text-muted-foreground">
              <Folder className="size-4 shrink-0 text-primary" /> into <strong className="text-foreground">{destination}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type UploadPanelProps = { tasks: UploadTask[]; onClear: () => void };

/** Floating progress card, bottom-right, that stays while you move between folders. */
export function UploadPanel({ tasks, onClear }: UploadPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  if (!tasks.length) return null;

  const finishedCount = tasks.filter((task) => task.status !== "uploading").length;
  const failedCount = tasks.filter((task) => task.status === "error").length;
  const isDone = finishedCount === tasks.length;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 overflow-hidden rounded-2xl border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        {isDone ? <CheckCircle2 className="size-5 text-tone-success" /> : <Loader2 className="size-5 animate-spin text-primary" />}
        <span className="flex-1 text-sm font-semibold">
          {isDone ? "Uploads complete" : "Uploading"} · {finishedCount.toLocaleString()}/{tasks.length.toLocaleString()}
          {failedCount > 0 && <span className="text-destructive"> · {failedCount} failed</span>}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setIsCollapsed((value) => !value)} aria-label={isCollapsed ? "Expand uploads" : "Collapse uploads"}>
          <ChevronDown className={cn("transition-transform", isCollapsed && "rotate-180")} />
        </Button>
        {isDone && (
          <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Close uploads">
            <X />
          </Button>
        )}
      </div>
      {!isDone && (
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(finishedCount / tasks.length) * 100}%` }} />
        </div>
      )}
      {!isCollapsed && (
        <ul className="grid max-h-72 gap-3 overflow-y-auto p-4">
          {tasks.slice(0, VISIBLE_TASKS).map((task) => (
            <li key={task.id} className="grid gap-1.5">
              <div className="flex items-center gap-2 text-sm">
                {task.status === "uploading" && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
                {task.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-tone-success" />}
                {task.status === "error" && <XCircle className="size-4 shrink-0 text-destructive" />}
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{task.name}</span>
                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <Folder className="size-3 shrink-0" />
                    <span className="truncate">{task.destination}</span>
                  </span>
                </span>
                <span className={cn("shrink-0 text-xs", task.error ? "text-destructive" : "text-muted-foreground")}>
                  {task.error ?? formatBytes(task.size)}
                </span>
              </div>
              {task.status === "uploading" && (
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              )}
            </li>
          ))}
          {tasks.length > VISIBLE_TASKS && (
            <li className="text-sm text-muted-foreground">and {(tasks.length - VISIBLE_TASKS).toLocaleString()} more…</li>
          )}
        </ul>
      )}
    </div>
  );
}
