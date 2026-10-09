import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useViewUrl } from "../hooks";
import { PAGE_SELECTOR, renderPaged, type PagedKind } from "./renderers";

export type ThumbKind = PagedKind | "sheet";

const MAX_THUMB_BYTES = 15 * 1024 * 1024;
const MAX_CONCURRENT_RENDERS = 2;
const SHEET_PREVIEW_ROWS = 14;
const SHEET_PREVIEW_COLUMNS = 6;
const JPEG_QUALITY = 0.82;

type Thumbnail =
  | { type: "image"; src: string }
  | { type: "dom"; node: HTMLElement; width: number }
  | { type: "table"; rows: string[][] };

const cache = new Map<string, Promise<Thumbnail>>();

let running = 0;
const waiting: (() => void)[] = [];

/** Rendering documents is heavy, so only a couple run at once while the grid scrolls. */
async function queued<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT_RENDERS) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function offscreenHost(): HTMLElement {
  const host = document.createElement("div");
  Object.assign(host.style, { position: "fixed", left: "-20000px", top: "0", pointerEvents: "none" });
  document.body.appendChild(host);
  return host;
}

async function renderFirstPage(kind: PagedKind, data: ArrayBuffer): Promise<Thumbnail> {
  const host = offscreenHost();
  try {
    await renderPaged(kind, data, host, { maxPages: 1 });
    const page = host.querySelector<HTMLElement>(PAGE_SELECTOR);
    if (!page) throw new Error("Nothing to preview");
    const canvas = page.querySelector("canvas");
    if (kind === "pdf" && canvas) return { type: "image", src: canvas.toDataURL("image/jpeg", JPEG_QUALITY) };

    const snapshot = document.createElement("div");
    host.querySelectorAll("style").forEach((style) => snapshot.appendChild(style.cloneNode(true)));
    const width = page.offsetWidth;
    snapshot.appendChild(page.cloneNode(true));
    return { type: "dom", node: snapshot, width };
  } finally {
    host.remove();
  }
}

async function readSheet(data: ArrayBuffer): Promise<Thumbnail> {
  const XLSX = await import("xlsx");
  const book = XLSX.read(new Uint8Array(data), { type: "array", sheetRows: SHEET_PREVIEW_ROWS });
  const sheet = book.Sheets[book.SheetNames[0] ?? ""];
  const rows = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" }) : [];
  return { type: "table", rows: rows.map((row) => row.slice(0, SHEET_PREVIEW_COLUMNS).map((cell) => String(cell))) };
}

function loadThumbnail(key: string, url: string, kind: ThumbKind): Promise<Thumbnail> {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = queued(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    return kind === "sheet" ? readSheet(data) : renderFirstPage(kind, data);
  });
  pending.catch(() => cache.delete(key));
  cache.set(key, pending);
  return pending;
}

function useIsVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || isVisible) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setIsVisible(true), { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);
  return { ref, isVisible };
}

function ScaledPage({ node, width }: { node: HTMLElement; width: number }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.replaceChildren(node.cloneNode(true));
    const observer = new ResizeObserver(([entry]) => entry && setScale(entry.contentRect.width / width));
    observer.observe(frame.parentElement ?? frame);
    return () => observer.disconnect();
  }, [node, width]);
  return (
    <div className="h-full w-full overflow-hidden">
      <div ref={frameRef} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }} className="pointer-events-none" />
    </div>
  );
}

function SheetTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full table-fixed border-collapse bg-white text-[9px] leading-tight text-slate-700">
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex === 0 ? "bg-emerald-50 font-semibold text-emerald-900" : undefined}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="truncate border border-slate-200 px-1 py-0.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** First page of a document (or the top of a spreadsheet) as a card thumbnail. Falls back to `fallback` when it can't be drawn. */
export function DocumentThumb({ file, kind, className, fallback }: { file: StoredFile; kind: ThumbKind; className?: string; fallback: ReactNode }) {
  const { ref, isVisible } = useIsVisible<HTMLDivElement>();
  const { url } = useViewUrl(isVisible ? file : null);
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(null);
  const [hasFailed, setHasFailed] = useState(file.sizeBytes > MAX_THUMB_BYTES);

  useEffect(() => {
    if (!url || hasFailed) return;
    let isCurrent = true;
    loadThumbnail(`${file.id}:${file.updatedAt}`, url, kind)
      .then((result) => isCurrent && setThumbnail(result))
      .catch(() => isCurrent && setHasFailed(true));
    return () => {
      isCurrent = false;
    };
  }, [url, file.id, file.updatedAt, kind, hasFailed]);

  if (hasFailed) return <>{fallback}</>;

  const isSlide = kind === "pptx";
  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-slate-100", className)}>
      <div
        className={cn(
          "absolute overflow-hidden bg-white shadow-[0_6px_18px_-6px_rgb(15_23_42/0.35)] ring-1 ring-slate-900/5 transition-opacity duration-300",
          isSlide ? "inset-x-[8%] top-1/2 aspect-video -translate-y-1/2" : "inset-x-[14%] top-[10%] -bottom-2",
          thumbnail ? "opacity-100" : "animate-pulse opacity-60",
        )}
      >
        {thumbnail?.type === "image" && <img src={thumbnail.src} alt="" className="w-full" />}
        {thumbnail?.type === "dom" && <ScaledPage node={thumbnail.node} width={thumbnail.width} />}
        {thumbnail?.type === "table" && <SheetTable rows={thumbnail.rows} />}
      </div>
    </div>
  );
}
