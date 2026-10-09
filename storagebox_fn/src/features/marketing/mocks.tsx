import type { ReactNode } from "react";
import { Check, FileText, Film, Folder, FolderOpen, Lock, Search, Upload } from "lucide-react";
import { HOSTED_API_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const HOST = HOSTED_API_URL.replace(/^https?:\/\//, "");

export type ArtVariant = "hills" | "banner" | "portrait" | "city";

/** Flat illustration standing in for a customer photo. */
export function Art({ variant, className }: { variant: ArtVariant; className?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden", className)}>
      {variant === "hills" && (
        <div className="absolute inset-0 bg-sky-200">
          <span className="absolute top-[18%] right-[22%] aspect-square w-[16%] rounded-full bg-amber-300" />
          <span className="absolute -bottom-[45%] -left-[10%] h-[90%] w-[80%] rounded-[50%] bg-emerald-600" />
          <span className="absolute -right-[15%] -bottom-[50%] h-[95%] w-[85%] rounded-[50%] bg-emerald-500" />
        </div>
      )}
      {variant === "banner" && (
        <div className="absolute inset-0 bg-indigo-600">
          <span className="absolute top-1/2 left-1/2 aspect-square w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300" />
        </div>
      )}
      {variant === "portrait" && (
        <div className="absolute inset-0 bg-rose-200">
          <span className="absolute top-[18%] left-1/2 aspect-square w-[24%] -translate-x-1/2 rounded-full bg-stone-800" />
          <span className="absolute -bottom-[20%] left-1/2 h-[50%] w-[70%] -translate-x-1/2 rounded-t-full bg-stone-800" />
        </div>
      )}
      {variant === "city" && (
        <div className="absolute inset-0 bg-orange-100">
          <span className="absolute bottom-0 left-[8%] h-[55%] w-[18%] bg-stone-700" />
          <span className="absolute bottom-0 left-[30%] h-[75%] w-[16%] bg-stone-800" />
          <span className="absolute bottom-0 left-[50%] h-[45%] w-[20%] bg-stone-600" />
          <span className="absolute bottom-0 left-[74%] h-[62%] w-[16%] bg-stone-700" />
        </div>
      )}
    </div>
  );
}

export function BrowserFrame({ path, children, className }: { path: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-[0_24px_60px_-20px_rgb(15_23_42/0.25)]", className)}>
      <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
        </span>
        <span className="mx-auto truncate rounded-md bg-background px-3 py-0.5 font-mono text-xs text-muted-foreground ring-1 ring-border">
          {HOST}
          {path}
        </span>
        <span className="w-10" />
      </div>
      {children}
    </div>
  );
}

type MockFile = { name: string; meta: string } & ({ art: ArtVariant } | { kind: "pdf" | "docx" | "video" });

const LIBRARY_FILES: MockFile[] = [
  { name: "kigali-hills.jpg", meta: "JPG · 1.8 MB", art: "hills" },
  { name: "Invoice-2026-104.pdf", meta: "PDF · 248 KB", kind: "pdf" },
  { name: "launch-banner.png", meta: "PNG · 640 KB", art: "banner" },
  { name: "Quarterly report.docx", meta: "Word · 96 KB", kind: "docx" },
  { name: "team-aline.jpg", meta: "JPG · 1.1 MB", art: "portrait" },
  { name: "product-demo.mp4", meta: "MP4 · 24 MB", kind: "video" },
];

const COLLECTIONS = [
  { name: "All files", count: 128, depth: 0, isOpen: false, isActive: false },
  { name: "invoices", count: 46, depth: 0, isOpen: true, isActive: false },
  { name: "2026", count: 12, depth: 1, isOpen: false, isActive: true },
  { name: "marketing", count: 51, depth: 0, isOpen: false, isActive: false },
  { name: "contracts", count: 19, depth: 0, isOpen: false, isActive: false },
];

function DocumentTile({ kind }: { kind: "pdf" | "docx" | "video" }) {
  if (kind === "video") {
    return (
      <div className="grid h-full place-items-center bg-slate-900 text-white/80">
        <Film className="size-7" />
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center bg-muted/60">
      <div className="relative grid h-[78%] w-[52%] content-start gap-1.5 rounded-sm bg-card p-2.5 shadow-sm ring-1 ring-border">
        {[90, 70, 80, 55, 75].map((width) => (
          <span key={width} className="h-1 rounded-full bg-slate-200" style={{ width: `${width}%` }} />
        ))}
        <span
          className={cn(
            "absolute -right-2 bottom-2 rounded px-1 text-[0.6rem] font-bold text-white",
            kind === "pdf" ? "bg-rose-600" : "bg-sky-600",
          )}
        >
          {kind.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

/** Media library screen used as the hero image. */
export function LibraryMock({ className }: { className?: string }) {
  return (
    <BrowserFrame path="/library?collection=invoices/2026" className={className}>
      <div className="grid sm:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="hidden border-r bg-muted/30 p-3 sm:grid sm:content-start sm:gap-0.5">
          <p className="px-2 pb-2 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">Collections</p>
          {COLLECTIONS.map((collection) => {
            const Icon = collection.isOpen || collection.isActive ? FolderOpen : Folder;
            return (
              <span
                key={collection.name}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  collection.depth && "ml-4",
                  collection.isActive ? "bg-accent font-semibold text-accent-foreground" : "text-foreground/80",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{collection.name}</span>
                <span className="text-muted-foreground tabular-nums">{collection.count}</span>
              </span>
            );
          })}
        </aside>
        <div className="grid min-w-0 gap-3 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-2.5 text-xs text-muted-foreground">
              <Search className="size-3.5 shrink-0" /> <span className="truncate">Search by name or public ID</span>
            </span>
            <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
              <Upload className="size-3.5" /> Upload
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {LIBRARY_FILES.map((file) => (
              <figure key={file.name} className="overflow-hidden rounded-lg border bg-card">
                <div className="aspect-[4/3]">
                  {"art" in file ? <Art variant={file.art} className="h-full" /> : <DocumentTile kind={file.kind} />}
                </div>
                <figcaption className="grid gap-0.5 border-t px-2.5 py-2">
                  <span className="truncate text-xs font-medium">{file.name}</span>
                  <span className="text-[0.65rem] text-muted-foreground">{file.meta}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

const UPLOADS = [
  { name: "Invoice-2026-117.pdf", size: "212 KB", progress: 100 },
  { name: "Invoice-2026-118.pdf", size: "198 KB", progress: 100 },
  { name: "receipts-march.zip", size: "8.4 MB", progress: 64 },
];

export function UploadMock() {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="grid place-items-center gap-1 rounded-lg border-2 border-dashed bg-muted/30 px-4 py-6 text-center">
        <Upload className="size-5 text-primary" />
        <p className="text-sm font-medium">Drop files here</p>
        <p className="text-xs text-muted-foreground">
          Into <span className="font-mono">invoices/2026</span>
        </p>
      </div>
      {UPLOADS.map((upload) => (
        <div key={upload.name} className="grid gap-1.5 rounded-lg border px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-rose-600" />
            <span className="min-w-0 flex-1 truncate font-medium">{upload.name}</span>
            <span className="text-xs text-muted-foreground">{upload.size}</span>
            {upload.progress === 100 && <Check className="size-4 text-tone-success" />}
          </div>
          <span className="h-1 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", upload.progress === 100 ? "bg-tone-success" : "bg-primary")} style={{ width: `${upload.progress}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

const VARIANTS = [
  { label: "Original", detail: "2400 × 1600 · 1.8 MB", aspect: "aspect-[3/2]", width: "w-full" },
  { label: "w_400,h_400,c_fill,f_webp", detail: "400 × 400 · 24 KB", aspect: "aspect-square", width: "w-28" },
  { label: "w_150,h_150,c_fill", detail: "150 × 150 · 6 KB", aspect: "aspect-square", width: "w-14" },
];

export function TransformMock() {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <p className="overflow-x-auto rounded-lg bg-muted/60 px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground sm:text-sm">
        …/f/acme/<span className="rounded bg-amber-100 px-1 py-0.5 text-amber-900">w_400,h_400,c_fill,f_webp</span>/kigali-hills.jpg
      </p>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-end gap-4">
        {VARIANTS.slice(0, 1).map((variant) => (
          <figure key={variant.label} className="grid gap-2">
            <Art variant="hills" className={cn("rounded-md", variant.aspect, variant.width)} />
            <figcaption className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{variant.label}</span> · {variant.detail}
            </figcaption>
          </figure>
        ))}
        <div className="grid gap-4">
          {VARIANTS.slice(1).map((variant) => (
            <figure key={variant.label} className="grid gap-2">
              <Art variant="hills" className={cn("rounded-md", variant.aspect, variant.width)} />
              <figcaption className="grid text-xs text-muted-foreground">
                <span className="truncate font-mono text-foreground">{variant.label}</span>
                {variant.detail}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

const ACCESS_LOG = [
  { time: "14:02", status: 200, note: "signed link, 1 h" },
  { time: "14:31", status: 200, note: "signed link, 1 h" },
  { time: "15:03", status: 403, note: "link expired" },
];

export function SignedLinkMock() {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
          <FileText className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-semibold">contract-umuhoza-signed.pdf</span>
          <span className="text-xs text-muted-foreground">contracts · 312 KB</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-tone-warning-bg px-2.5 py-1 text-xs font-medium text-tone-warning">
          <Lock className="size-3" /> Private
        </span>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Signed link</span>
          <span className="text-muted-foreground">expires in 58 min</span>
        </div>
        <p className="truncate rounded-lg bg-muted/60 px-3 py-2.5 font-mono text-xs text-muted-foreground">
          …/s/acme/contract-umuhoza-signed.pdf?expires=1791561600&sig=9f2c41e0…
        </p>
      </div>
      <ul className="grid divide-y rounded-lg border text-xs">
        {ACCESS_LOG.map((entry) => (
          <li key={entry.time} className="flex items-center gap-3 px-3 py-2">
            <span className="font-mono text-muted-foreground">{entry.time}</span>
            <span className={cn("font-mono font-semibold", entry.status === 200 ? "text-tone-success" : "text-tone-danger")}>{entry.status}</span>
            <span className="text-muted-foreground">{entry.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
