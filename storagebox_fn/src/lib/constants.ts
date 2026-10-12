export const API_BASE_URL = (import.meta.env.VITE_STORAGEBOX_API_URL ?? "http://localhost:4200").replace(/\/+$/, "");
export const DASHBOARD_API_URL = `${API_BASE_URL}/api`;
export const API_DOCS_URL = `${API_BASE_URL}/docs`;
/** Default API origin baked into the `storagebox` npm package. */
export const HOSTED_API_URL = "https://storagebox.urbinaryhub.com";
export const SDK_PACKAGE = "storagebox";

export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 5120);
const MB_PER_GB = 1024;
/** "5 GB" rather than "5120 MB". */
export const MAX_UPLOAD_LABEL = MAX_UPLOAD_MB >= MB_PER_GB ? `${+(MAX_UPLOAD_MB / MB_PER_GB).toFixed(1)} GB` : `${MAX_UPLOAD_MB} MB`;
/** Per API request; the dashboard sends one file per request. */
export const MAX_FILES_PER_UPLOAD = 20;
/** Files the dashboard queues from one drop or folder; bigger imports go through the CLI. */
export const MAX_FILES_PER_DROP = 2000;
export const FILES_PAGE_SIZE = 30;

export const ALLOWED_FILE_ACCEPT = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".rtf", ".txt", ".csv", ".md", ".json",
  ".zip", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".mp4", ".mov", ".webm", ".mp3", ".wav",
].join(",");

export const SIGNED_LINK_DURATIONS = [
  { value: "300", label: "5 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "24 hours" },
  { value: "604800", label: "7 days" },
];
