export type PagedKind = "pdf" | "docx" | "pptx";

/** Every rendered page or slide carries this attribute so the stage can count and scroll to it. */
export const PAGE_ATTRIBUTE = "data-page";
export const PAGE_SELECTOR = `[${PAGE_ATTRIBUTE}]`;

const CSS_PIXELS_PER_POINT = 96 / 72;
const MAX_PIXEL_RATIO = 2;
const SLIDE_WIDTH_PX = 960;
const SLIDE_HEIGHT_PX = 540;
const PAGE_CLASS = "overflow-hidden bg-white shadow-[0_10px_30px_-12px_rgb(15_23_42/0.35)]";

export type RenderOptions = {
  /** Stop after this many pages — thumbnails only need the first one. */
  maxPages?: number;
  signal?: AbortSignal;
  /** Called after each page is drawn, so long documents appear progressively. */
  onPage?: (renderedPages: number) => void;
};

let renderCount = 0;

const markPages = (pages: Iterable<Element>, maxPages = Infinity): number => {
  let count = 0;
  for (const page of pages) {
    if (count >= maxPages) page.remove();
    else page.setAttribute(PAGE_ATTRIBUTE, String(++count));
  }
  return count;
};

async function renderPdf(data: ArrayBuffer, container: HTMLElement, { maxPages = Infinity, signal, onPage }: RenderOptions): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const total = Math.min(pageCount, maxPages);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "flex flex-col items-center gap-6";
  container.appendChild(list);

  try {
    for (let number = 1; number <= total; number += 1) {
      if (signal?.aborted) break;
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: CSS_PIXELS_PER_POINT });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = "block";

      const wrapper = document.createElement("div");
      wrapper.className = PAGE_CLASS;
      wrapper.setAttribute(PAGE_ATTRIBUTE, String(number));
      wrapper.appendChild(canvas);
      list.appendChild(wrapper);

      await page.render({ canvas, viewport: page.getViewport({ scale: CSS_PIXELS_PER_POINT * pixelRatio }) }).promise;
      page.cleanup();
      onPage?.(number);
    }
  } finally {
    await loadingTask.destroy();
  }
  return pageCount;
}

async function renderDocx(data: ArrayBuffer, container: HTMLElement, { maxPages }: RenderOptions): Promise<number> {
  const { renderAsync } = await import("docx-preview");
  /** A unique class keeps each document's generated styles from leaking into another one on the same screen. */
  const className = `sbx-docx-${++renderCount}`;
  await renderAsync(data, container, container, {
    className,
    inWrapper: true,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
  });
  const wrapper = container.querySelector<HTMLElement>(`.${className}-wrapper`);
  if (wrapper) {
    Object.assign(wrapper.style, { background: "transparent", padding: "0", gap: "24px", display: "flex", flexDirection: "column", alignItems: "center" });
  }
  const pages = container.querySelectorAll<HTMLElement>(`section.${className}`);
  pages.forEach((page) => Object.assign(page.style, { marginBottom: "0", boxShadow: "0 10px 30px -12px rgb(15 23 42 / 0.35)" }));
  markPages(pages, maxPages);
  return pages.length;
}

async function renderPptx(data: ArrayBuffer, container: HTMLElement, { maxPages }: RenderOptions): Promise<number> {
  const { init } = await import("pptx-preview");
  container.innerHTML = "";
  const previewer = init(container, { width: SLIDE_WIDTH_PX, height: SLIDE_HEIGHT_PX, mode: "list" });
  await previewer.preview(data);
  /** The library boxes slides into a fixed-height black frame with its own scrollbar; let them flow like pages instead. */
  const wrapper = container.querySelector<HTMLElement>(".pptx-preview-wrapper");
  if (wrapper) {
    Object.assign(wrapper.style, { height: "auto", overflow: "visible", background: "transparent", display: "flex", flexDirection: "column", gap: "24px" });
  }
  const slides = container.querySelectorAll<HTMLElement>(".pptx-preview-slide-wrapper");
  slides.forEach((slide) => Object.assign(slide.style, { margin: "0", boxShadow: "0 10px 30px -12px rgb(15 23 42 / 0.35)" }));
  markPages(slides, maxPages);
  return slides.length;
}

const RENDERERS: Record<PagedKind, (data: ArrayBuffer, container: HTMLElement, options: RenderOptions) => Promise<number>> = {
  pdf: renderPdf,
  docx: renderDocx,
  pptx: renderPptx,
};

/** Draws a document into `container` as a column of pages. Resolves with the document's total page count. */
export const renderPaged = (kind: PagedKind, data: ArrayBuffer, container: HTMLElement, options: RenderOptions = {}): Promise<number> =>
  RENDERERS[kind](data, container, options);

export const pageLabel = (kind: PagedKind): string => (kind === "pptx" ? "Slide" : "Page");
