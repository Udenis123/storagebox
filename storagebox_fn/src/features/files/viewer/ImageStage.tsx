import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2, Maximize, Minus, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useViewUrl } from "../hooks";

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const FIT = "fit";
const STAGE_PADDING_PX = 48;

type Zoom = typeof FIT | number;
type Size = { width: number; height: number };

export const CHECKERBOARD = "bg-[repeating-conic-gradient(#e2e8f0_0_25%,#f8fafc_0_50%)] bg-[length:24px_24px]";

function nextZoom(current: Zoom, direction: 1 | -1, fitScale: number): number {
  const scale = current === FIT ? fitScale : current;
  const steps = direction === 1 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
  return steps.find((step) => (direction === 1 ? step > scale + 0.01 : step < scale - 0.01)) ?? scale;
}

function useElementSize(ref: RefObject<HTMLElement | null>): Size | null {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Large zoomable image preview; shows the transformed version when `transform` is set. */
export function ImageStage({ file, transform }: { file: StoredFile; transform: string }) {
  const { url, isLoading } = useViewUrl(file, transform);
  const [zoom, setZoom] = useState<Zoom>(FIT);
  const [natural, setNatural] = useState<Size | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useElementSize(stageRef);

  const fitScale =
    natural && stage
      ? Math.min(1, (stage.width - STAGE_PADDING_PX) / natural.width, (stage.height - STAGE_PADDING_PX) / natural.height)
      : 1;
  const scale = zoom === FIT ? fitScale : zoom;
  const isLoaded = Boolean(url) && loadedUrl === url;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} className={cn("relative min-h-0 flex-1 overflow-auto", CHECKERBOARD)}>
        <div className={cn("flex min-h-full min-w-full p-6", zoom === FIT ? "items-center justify-center" : "w-max items-start")}>
          {url && (
            <img
              key={url}
              src={url}
              alt={file.originalName}
              onLoad={(event) => {
                const image = event.currentTarget;
                setNatural({ width: image.naturalWidth, height: image.naturalHeight });
                setLoadedUrl(url);
              }}
              style={zoom === FIT || !natural ? undefined : { width: natural.width * zoom, maxWidth: "none" }}
              className={cn(
                "rounded-sm shadow-lg shadow-slate-900/10 transition-opacity",
                zoom === FIT && "max-h-full max-w-full object-contain",
                isLoaded ? "opacity-100" : "opacity-40",
              )}
            />
          )}
        </div>
        {(isLoading || (url && !isLoaded)) && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-wrap items-end justify-between gap-2 px-4">
        <span className="pointer-events-auto flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-1.5 font-mono text-xs text-white shadow-lg backdrop-blur">
          {transform ? <Wand2 className="size-3.5 text-indigo-300" /> : null}
          {transform || "original"}
          {natural && (
            <span className="text-slate-400">
              · {natural.width} × {natural.height}
            </span>
          )}
        </span>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom(nextZoom(zoom, -1, fitScale))}>
            <Minus />
          </Button>
          <span className="w-12 text-center text-xs font-medium tabular-nums">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom(nextZoom(zoom, 1, fitScale))}>
            <Plus />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant={zoom === 1 ? "secondary" : "ghost"} size="sm" onClick={() => setZoom(1)}>
            1:1
          </Button>
          <Button variant={zoom === FIT ? "secondary" : "ghost"} size="sm" onClick={() => setZoom(FIT)}>
            <Maximize /> Fit
          </Button>
        </div>
      </div>
    </div>
  );
}
