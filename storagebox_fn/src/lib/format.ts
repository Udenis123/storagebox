import { format, formatDistanceToNow } from "date-fns";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export const BYTES_PER_GB = 1024 ** 3;

/** Quota in GB for inputs, trimmed to 2 decimals. */
export const toGb = (bytes: number): string => String(+(bytes / BYTES_PER_GB).toFixed(2));

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
}

export const formatDateTime = (value: string): string => format(new Date(value), "d MMM yyyy, HH:mm");

export const formatDate = (value: string): string => format(new Date(value), "d MMM yyyy");

export const timeAgo = (value: string): string => formatDistanceToNow(new Date(value), { addSuffix: true });

export const percentOf = (part: number, whole: number): number => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "?";

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** Media length as `m:ss`, or `h:mm:ss` from one hour. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
