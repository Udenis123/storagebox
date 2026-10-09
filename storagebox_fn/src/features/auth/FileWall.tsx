import { CheckCircle2, FileSpreadsheet, FileText, Link2, Lock } from "lucide-react";
import { Art, type ArtVariant } from "@/features/marketing/mocks";
import { cn } from "@/lib/utils";

type Tile =
  | { type: "image"; art: ArtVariant; name: string; ratio: string }
  | { type: "doc"; kind: "PDF" | "DOCX" | "XLSX"; name: string; size: string }
  | { type: "link"; isPrivate: boolean; value: string }
  | { type: "upload"; name: string; collection: string };

const COLUMNS: { tiles: Tile[]; speed: string }[] = [
  {
    speed: "[animation-duration:70s]",
    tiles: [
      { type: "image", art: "hills", name: "kigali-hills.jpg", ratio: "aspect-[4/5]" },
      { type: "doc", kind: "PDF", name: "Invoice-2026-104.pdf", size: "248 KB" },
      { type: "link", isPrivate: false, value: "/f/acme/kigali-hills.jpg" },
      { type: "image", art: "city", name: "office-front.jpg", ratio: "aspect-square" },
    ],
  },
  {
    speed: "[animation-duration:55s] [animation-direction:reverse]",
    tiles: [
      { type: "upload", name: "contract-signed.pdf", collection: "contracts" },
      { type: "image", art: "portrait", name: "team-aline.jpg", ratio: "aspect-[3/4]" },
      { type: "doc", kind: "XLSX", name: "budget-q3.xlsx", size: "64 KB" },
      { type: "image", art: "banner", name: "launch-banner.png", ratio: "aspect-[4/3]" },
    ],
  },
  {
    speed: "[animation-duration:80s]",
    tiles: [
      { type: "doc", kind: "DOCX", name: "Quarterly report.docx", size: "96 KB" },
      { type: "image", art: "hills", name: "w_400,h_400,c_fill", ratio: "aspect-square" },
      { type: "link", isPrivate: true, value: "/s/acme/payroll.pdf?expires=…" },
      { type: "image", art: "city", name: "skyline.webp", ratio: "aspect-[3/4]" },
    ],
  },
  {
    speed: "[animation-duration:65s] [animation-direction:reverse]",
    tiles: [
      { type: "image", art: "banner", name: "w_800,f_avif", ratio: "aspect-square" },
      { type: "upload", name: "receipts-march.zip", collection: "invoices/2026" },
      { type: "image", art: "portrait", name: "profile-eric.jpg", ratio: "aspect-[4/5]" },
      { type: "doc", kind: "PDF", name: "Lease-agreement.pdf", size: "1.2 MB" },
    ],
  },
];

const DOC_TONE: Record<"PDF" | "DOCX" | "XLSX", string> = {
  PDF: "bg-rose-500/15 text-rose-300",
  DOCX: "bg-sky-500/15 text-sky-300",
  XLSX: "bg-emerald-500/15 text-emerald-300",
};

function WallTile({ tile }: { tile: Tile }) {
  const frame = "rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm";
  if (tile.type === "image") {
    return (
      <figure className={cn(frame, "overflow-hidden")}>
        <Art variant={tile.art} className={tile.ratio} />
        <figcaption className="truncate px-3.5 py-2.5 font-mono text-xs text-slate-400">{tile.name}</figcaption>
      </figure>
    );
  }
  if (tile.type === "doc") {
    const Icon = tile.kind === "XLSX" ? FileSpreadsheet : FileText;
    return (
      <div className={cn(frame, "grid gap-4 p-4")}>
        <div className="grid gap-1.5 rounded-lg bg-white/90 p-3">
          {[85, 60, 75, 40].map((width) => (
            <span key={width} className="h-1 rounded-full bg-slate-300" style={{ width: `${width}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", DOC_TONE[tile.kind])}>
            <Icon className="size-4" />
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-sm text-slate-200">{tile.name}</span>
            <span className="text-xs text-slate-500">
              {tile.kind} · {tile.size}
            </span>
          </span>
        </div>
      </div>
    );
  }
  if (tile.type === "link") {
    const Icon = tile.isPrivate ? Lock : Link2;
    return (
      <div className={cn(frame, "grid gap-2 p-4")}>
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", tile.isPrivate ? "text-amber-300" : "text-indigo-300")}>
          <Icon className="size-3.5" /> {tile.isPrivate ? "Signed link · 1 hour" : "Public link"}
        </span>
        <span className="truncate font-mono text-xs text-slate-400">{tile.value}</span>
      </div>
    );
  }
  return (
    <div className={cn(frame, "grid gap-3 p-4")}>
      <span className="flex items-center gap-2 text-sm text-slate-200">
        <CheckCircle2 className="size-4 text-emerald-400" /> Uploaded
      </span>
      <span className="truncate text-xs text-slate-400">
        {tile.name} → <span className="font-mono">{tile.collection}</span>
      </span>
      <span className="h-1 rounded-full bg-emerald-400/80" />
    </div>
  );
}

/** Slowly drifting columns of files — the decorative half of the sign-in screen. */
export function FileWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute -inset-x-24 -top-32 -bottom-32 grid rotate-[-8deg] grid-cols-4 gap-4 opacity-80">
        {COLUMNS.map((column, columnIndex) => (
          <div key={columnIndex} className={cn("grid content-start gap-4 pb-4 motion-safe:animate-file-wall", column.speed)}>
            {[...column.tiles, ...column.tiles].map((tile, index) => (
              <WallTile key={index} tile={tile} />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
    </div>
  );
}
