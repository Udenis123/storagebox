import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredFile } from "@/lib/types";
import { FileKindIcon } from "../FileThumb";
import { useViewUrl } from "../hooks";
import { PAGE_SELECTOR, pageLabel, renderPaged, type PagedKind } from "./renderers";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const FIT = "fit";
const STAGE_GUTTER_PX = 64;
/** A page counts as "current" once its top passes this share of the stage height. */
const CURRENT_PAGE_LINE = 0.35;

type Zoom = typeof FIT | number;
type LoadState = { status: "loading" } | { status: "ready"; pageCount: number } | { status: "error"; message: string };

function stepZoom(scale: number, direction: 1 | -1): number {
  const steps = direction === 1 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
  return steps.find((step) => (direction === 1 ? step > scale + 0.01 : step < scale - 0.01)) ?? scale;
}

const pagesIn = (element: HTMLElement | null): HTMLElement[] => (element ? Array.from(element.querySelectorAll<HTMLElement>(PAGE_SELECTOR)) : []);

/** Full-size, scrollable page-by-page view of PDF, Word and PowerPoint files. */
export function DocumentStage({ file, kind }: { file: StoredFile; kind: PagedKind }) {
  const { url, isLoading } = useViewUrl(file);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [renderedPages, setRenderedPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState<Zoom>(FIT);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const content = contentRef.current;
    if (!url || !content) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the file (${response.status})`);
        return response.arrayBuffer();
      })
      .then((data) => renderPaged(kind, data, content, { signal: controller.signal, onPage: setRenderedPages }))
      .then((pageCount) => !controller.signal.aborted && setState({ status: "ready", pageCount }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          const isWorkerError = /fake worker|dynamically imported module|pdf\.worker/i.test(error.message);
          setState({
            status: "error",
            message: isWorkerError ? "This document could not be previewed. Download it to open it on your device." : error.message || "This document could not be shown",
          });
        }
      });
    return () => controller.abort();
  }, [url, kind]);

  const firstPageWidth = useCallback(() => pagesIn(contentRef.current)[0]?.offsetWidth ?? 0, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const width = firstPageWidth();
      if (width) setFitScale(Math.min(1, (stage.clientWidth - STAGE_GUTTER_PX) / width));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [firstPageWidth, renderedPages, state.status]);

  const scale = zoom === FIT ? fitScale : zoom;
  const pageCount = state.status === "ready" ? state.pageCount : renderedPages;

  const trackCurrentPage = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const line = stage.getBoundingClientRect().top + stage.clientHeight * CURRENT_PAGE_LINE;
    const pages = pagesIn(contentRef.current);
    const passed = pages.filter((page) => page.getBoundingClientRect().top <= line).length;
    setCurrentPage(Math.max(1, passed));
  };

  const goToPage = (number: number) => {
    const page = pagesIn(contentRef.current)[number - 1];
    page?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} onScroll={trackCurrentPage} className="relative min-h-0 flex-1 overflow-auto bg-slate-200/60 [scroll-padding-top:1.5rem]">
        <div className="flex min-h-full min-w-full justify-center px-4 pt-6 pb-24">
          <div ref={contentRef} style={{ zoom: scale }} className="w-max" />
        </div>

        {(isLoading || state.status === "loading") && renderedPages === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-3 rounded-full bg-background px-4 py-2 text-sm font-medium shadow-md">
              <Loader2 className="size-4 animate-spin text-primary" /> Opening {file.ext.toUpperCase()}…
            </span>
          </div>
        )}
        {state.status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="grid justify-items-center gap-3 text-center">
              <FileKindIcon file={file} className="size-20" />
              <p className="max-w-sm text-sm text-muted-foreground">{state.message}. Download it to open it on your device.</p>
            </div>
          </div>
        )}
      </div>

      {pageCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-wrap items-end justify-between gap-2 px-4">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-slate-900/85 p-1 text-white shadow-lg backdrop-blur">
            <Button variant="ghost" size="icon-sm" aria-label={`Previous ${pageLabel(kind).toLowerCase()}`} className="text-white hover:bg-white/15 hover:text-white" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              <ChevronUp />
            </Button>
            <span className="px-2 text-xs font-medium tabular-nums">
              {pageLabel(kind)} {currentPage} of {pageCount}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label={`Next ${pageLabel(kind).toLowerCase()}`} className="text-white hover:bg-white/15 hover:text-white" disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)}>
              <ChevronDown />
            </Button>
          </div>
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur">
            <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom(stepZoom(scale, -1))}>
              <Minus />
            </Button>
            <span className="w-12 text-center text-xs font-medium tabular-nums">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom(stepZoom(scale, 1))}>
              <Plus />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button variant={zoom === FIT ? "secondary" : "ghost"} size="sm" onClick={() => setZoom(FIT)}>
              <Maximize /> Fit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
