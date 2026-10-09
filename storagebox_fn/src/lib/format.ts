import { format, formatDistanceToNow } from "date-fns";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

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
