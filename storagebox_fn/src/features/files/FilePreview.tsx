import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { previewKindOf } from "@/lib/files";
import type { StoredFile } from "@/lib/types";
import { FileKindIcon } from "./FileThumb";
import { useViewUrl } from "./hooks";

const MAX_TEXT_PREVIEW_BYTES = 200 * 1024;
const FRAME = "h-[55vh] w-full rounded-lg border bg-muted/30 lg:h-[65vh]";

function PreviewMessage({ file, message, url }: { file: StoredFile; message: string; url?: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-lg border bg-muted/30 p-6 text-center">
      <FileKindIcon file={file} className="size-24" />
      <p className="max-w-sm text-base text-muted-foreground">{message}</p>
      {url && (
        <Button variant="outline" render={<a href={`${url}${url.includes("?") ? "&" : "?"}dl=1`} />}>
          <Download /> Download
        </Button>
      )}
    </div>
  );
}

function useFetched<T>(url: string | undefined, read: (response: Response) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    if (!url) return;
    let isCancelled = false;
    setState({});
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load preview (${response.status})`);
        return read(response);
      })
      .then((data) => !isCancelled && setState({ data }))
      .catch((error: Error) => !isCancelled && setState({ error: error.message }));
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `read` is a stable module-level reader
  }, [url]);
  return state;
}

const readBlob = (response: Response) => response.blob();
const readText = (response: Response) => response.text();

function DocxPreview({ file, url }: { file: StoredFile; url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: blob, error } = useFetched(url, readBlob);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    const container = containerRef.current;
    import("docx-preview")
      .then(({ renderAsync }) => renderAsync(blob, container, undefined, { inWrapper: true, ignoreWidth: false }))
      .then(() => setIsRendered(true))
      .catch(() => setIsRendered(true));
  }, [blob]);

  if (error) return <PreviewMessage file={file} message={error} url={url} />;
  return (
    <div className="relative">
      {!isRendered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className={`${FRAME} overflow-auto bg-slate-100 [&_.docx-wrapper]:min-h-full [&_.docx-wrapper]:bg-slate-100`} />
    </div>
  );
}

function TextPreview({ file, url }: { file: StoredFile; url: string }) {
  const { data, error } = useFetched(url, readText);
  if (error) return <PreviewMessage file={file} message={error} url={url} />;
  if (data === undefined) return <Skeleton className={FRAME} />;
  return <pre className={`${FRAME} overflow-auto p-4 font-mono text-sm whitespace-pre-wrap`}>{data}</pre>;
}

export function FilePreview({ file }: { file: StoredFile }) {
  const { url, isLoading } = useViewUrl(file);
  const kind = previewKindOf(file);

  if (isLoading) return <Skeleton className={FRAME} />;
  if (!url) return <PreviewMessage file={file} message="Preview is not available right now." />;

  switch (kind) {
    case "image":
      return (
        <div className="flex max-h-[65vh] items-center justify-center rounded-lg border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-2">
          <img src={url} alt={file.originalName} className="max-h-[62vh] max-w-full rounded object-contain" />
        </div>
      );
    case "pdf":
      return <iframe src={url} title={file.originalName} className={FRAME} />;
    case "docx":
      return <DocxPreview file={file} url={url} />;
    case "video":
      return <video src={url} controls className="max-h-[65vh] w-full rounded-lg bg-black" />;
    case "audio":
      return (
        <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/30 p-6">
          <audio src={url} controls className="w-full max-w-md" />
        </div>
      );
    case "text":
      return file.sizeBytes > MAX_TEXT_PREVIEW_BYTES ? (
        <PreviewMessage file={file} message="This file is too large to preview." url={url} />
      ) : (
        <TextPreview file={file} url={url} />
      );
    default:
      return <PreviewMessage file={file} message="No preview for this file type — download it to open." url={url} />;
  }
}
