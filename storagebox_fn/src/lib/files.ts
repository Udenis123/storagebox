import { File, FileArchive, FileAudio, FileImage, FileText, FileVideo, type LucideIcon } from "lucide-react";
import type { FileKind, StoredFile } from "./types";

export const KIND_META: Record<FileKind, { label: string; icon: LucideIcon; tone: string }> = {
  image: { label: "Images", icon: FileImage, tone: "bg-pink-50 text-pink-600" },
  document: { label: "Documents", icon: FileText, tone: "bg-indigo-50 text-indigo-600" },
  video: { label: "Videos", icon: FileVideo, tone: "bg-amber-50 text-amber-600" },
  audio: { label: "Audio", icon: FileAudio, tone: "bg-emerald-50 text-emerald-600" },
  archive: { label: "Archives", icon: FileArchive, tone: "bg-slate-100 text-slate-600" },
  other: { label: "Other", icon: File, tone: "bg-slate-100 text-slate-600" },
};

export const KIND_OPTIONS = (Object.keys(KIND_META) as FileKind[])
  .filter((kind) => kind !== "other")
  .map((kind) => ({ value: kind, label: KIND_META[kind].label }));

export type PreviewKind = "image" | "pdf" | "docx" | "video" | "audio" | "text" | "none";

const TEXT_EXTENSIONS = new Set(["txt", "csv", "md", "json"]);

export function previewKindOf(file: Pick<StoredFile, "kind" | "ext">): PreviewKind {
  if (file.kind === "image") return "image";
  if (file.ext === "pdf") return "pdf";
  if (file.ext === "docx") return "docx";
  if (file.kind === "video") return "video";
  if (file.kind === "audio") return "audio";
  if (TEXT_EXTENSIONS.has(file.ext)) return "text";
  return "none";
}

export const THUMBNAIL_TRANSFORM = "w_480,h_360,c_fill,q_75,f_webp";

/** Inserts a transformation segment before the file name: `/f/acme/x.jpg` → `/f/acme/w_400/x.jpg`. */
export const applyTransform = (url: string, transform: string): string =>
  transform ? url.replace(/\/([^/?]+)(\?.*)?$/, `/${transform}/$1$2`) : url;

export const isTransformable = (file: Pick<StoredFile, "kind" | "ext">): boolean => file.kind === "image" && file.ext !== "svg";

/** Appends `dl=1` so the delivery route answers with `Content-Disposition: attachment`. */
export const downloadUrl = (url: string): string => `${url}${url.includes("?") ? "&" : "?"}dl=1`;

export const fileTypeLabel = (file: Pick<StoredFile, "ext">): string => file.ext.toUpperCase();
