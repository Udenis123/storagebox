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

export type PreviewKind = "image" | "pdf" | "docx" | "pptx" | "sheet" | "office" | "video" | "audio" | "text" | "none";

const TEXT_EXTENSIONS = new Set(["txt", "md", "json"]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);
/** Shown through Office Online, which needs the API to be reachable from the internet. */
const OFFICE_EXTENSIONS = new Set(["doc", "ppt", "odt", "rtf"]);

export function previewKindOf(file: Pick<StoredFile, "kind" | "ext">): PreviewKind {
  if (file.kind === "image") return "image";
  if (file.ext === "pdf") return "pdf";
  if (file.ext === "docx") return "docx";
  if (file.ext === "pptx") return "pptx";
  if (SHEET_EXTENSIONS.has(file.ext)) return "sheet";
  if (OFFICE_EXTENSIONS.has(file.ext)) return "office";
  if (file.kind === "video") return "video";
  if (file.kind === "audio") return "audio";
  if (TEXT_EXTENSIONS.has(file.ext)) return "text";
  return "none";
}

/** Kinds shown as scrollable pages in the viewer. */
export const isPagedKind = (kind: PreviewKind): kind is "pdf" | "docx" | "pptx" => kind === "pdf" || kind === "docx" || kind === "pptx";

export const THUMBNAIL_TRANSFORM = "w_480,h_360,c_fill,q_75,f_webp";

/** Inserts a transformation segment before the file name: `/f/acme/x.jpg` → `/f/acme/w_400/x.jpg`. */
export const applyTransform = (url: string, transform: string): string =>
  transform ? url.replace(/\/([^/?]+)(\?.*)?$/, `/${transform}/$1$2`) : url;

export const isTransformable = (file: Pick<StoredFile, "kind" | "ext">): boolean => file.kind === "image" && file.ext !== "svg";

/** Appends `embed=1` so the delivery route answers with its document viewer, without its own header. */
export const embeddedViewerUrl = (url: string): string => `${url}${url.includes("?") ? "&" : "?"}embed=1`;

/** Appends `dl=1` so the delivery route answers with `Content-Disposition: attachment`. */
export const downloadUrl = (url: string): string => `${url}${url.includes("?") ? "&" : "?"}dl=1`;

export const fileTypeLabel = (file: Pick<StoredFile, "ext">): string => file.ext.toUpperCase();

const FORMAT_NAMES: Record<string, string> = {
  pdf: "PDF document",
  doc: "Word document",
  docx: "Word document",
  odt: "OpenDocument text",
  rtf: "Rich text document",
  xls: "Excel spreadsheet",
  xlsx: "Excel spreadsheet",
  csv: "CSV spreadsheet",
  ppt: "PowerPoint presentation",
  pptx: "PowerPoint presentation",
  txt: "Plain text",
  md: "Markdown",
  json: "JSON",
  zip: "ZIP archive",
  svg: "SVG image",
};

/** Plain-language format such as "Excel spreadsheet (XLSX)". */
export function formatName(file: Pick<StoredFile, "ext" | "kind">): string {
  const name = FORMAT_NAMES[file.ext] ?? (file.kind === "other" ? "File" : `${KIND_META[file.kind].label.replace(/s$/, "")} file`);
  return `${name} (${fileTypeLabel(file)})`;
}

/** Collection names accept only ASCII letters, digits, spaces, `-` and `_`. */
const collectionSegment = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\- ]+/g, "-")
    .replace(/^[-\s]+|[-\s]+$/g, "") || "folder";

/** `Trip/Day 1/a.jpg` uploaded into `photos` → `photos/Trip/Day 1`: sub-folders become collections. */
export function folderCollectionPath(basePath: string | undefined, relativePath: string): string | undefined {
  const folders = relativePath.split("/").slice(0, -1).map(collectionSegment);
  const segments = [...(basePath ? [basePath] : []), ...folders];
  return segments.length ? segments.join("/") : undefined;
}
