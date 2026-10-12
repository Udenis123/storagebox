import { useEffect, useState } from "react";
import type { StoredFile } from "@/lib/types";

/** Widest viewport (px) for each column count; anything wider gets the last count. */
const COLUMN_BREAKPOINTS: [maxWidth: number, columns: number][] = [
  [640, 2],
  [1100, 3],
  [1600, 4],
];
const MAX_COLUMNS = 5;
const DEFAULT_ASPECT = 4 / 3;
const VIDEO_ASPECT = 16 / 9;

const columnsFor = (width: number): number => COLUMN_BREAKPOINTS.find(([maxWidth]) => width < maxWidth)?.[1] ?? MAX_COLUMNS;

export function useColumnCount(): number {
  const [columns, setColumns] = useState(() => columnsFor(window.innerWidth));
  useEffect(() => {
    const onResize = () => setColumns(columnsFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return columns;
}

/** Width ÷ height of a tile: real proportions for images, fixed shapes for everything else. */
export function tileAspect(file: StoredFile): number {
  if (file.kind === "image" && file.width && file.height) return file.width / file.height;
  return file.kind === "video" ? VIDEO_ASPECT : DEFAULT_ASPECT;
}

/** Puts each file in the currently shortest column, so the grid stays balanced and reads top-to-bottom by date. */
export function toColumns(files: StoredFile[], count: number): { file: StoredFile; index: number }[][] {
  const columns = Array.from({ length: count }, () => ({ height: 0, items: [] as { file: StoredFile; index: number }[] }));
  files.forEach((file, index) => {
    const shortest = columns.reduce((best, column) => (column.height < best.height ? column : best));
    shortest.items.push({ file, index });
    shortest.height += 1 / tileAspect(file);
  });
  return columns.map((column) => column.items);
}
