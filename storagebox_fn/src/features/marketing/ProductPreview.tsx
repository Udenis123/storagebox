import { Check, Copy, FileText, Image as ImageIcon, Lock, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_FILES = [
  { name: "Invoice-2026-104.pdf", meta: "PDF · 248 KB", icon: FileText, tone: "bg-rose-50 text-rose-600", isPrivate: false },
  { name: "Quarterly report.docx", meta: "Word · 96 KB", icon: FileText, tone: "bg-sky-50 text-sky-600", isPrivate: true },
  { name: "team-photo.jpg", meta: "Image · 1.2 MB", icon: ImageIcon, tone: "bg-amber-50 text-amber-600", isPrivate: false },
];

/** Illustrative mock of the library: files, a share link and the SDK call that produced it. */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-indigo-950/10">
        <div className="flex items-center gap-2 border-b bg-slate-50/80 px-4 py-3">
          <span className="size-3 rounded-full bg-rose-300" />
          <span className="size-3 rounded-full bg-amber-300" />
          <span className="size-3 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate rounded-md bg-white px-3 py-1 font-mono text-xs text-slate-500 ring-1 ring-slate-200">
            storagebox.urbinaryhub.com/library
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 p-4">
          <p className="px-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">invoices / 2026</p>
          {SAMPLE_FILES.map((file) => (
            <div key={file.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", file.tone)}>
                <file.icon className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-sm font-semibold text-slate-900">{file.name}</span>
                <span className="text-xs text-slate-500">{file.meta}</span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  file.isPrivate ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                {file.isPrivate ? <Lock className="size-3" /> : <Link2 className="size-3" />}
                {file.isPrivate ? "Signed" : "Public"}
              </span>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2 rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
            <Link2 className="size-4 shrink-0 text-indigo-600" />
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-indigo-900">
              https://storagebox.urbinaryhub.com/f/acme/invoice-2026-104.pdf
            </code>
            <Copy className="size-4 shrink-0 text-indigo-400" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 -left-6 hidden w-72 rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300 shadow-2xl ring-1 ring-white/10 sm:block">
        <p>
          <span className="text-violet-300">await</span> storagebox.files.<span className="text-sky-300">upload</span>(file)
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-emerald-300">
          <Check className="size-3.5" /> url: "…/f/acme/invoice.pdf"
        </p>
      </div>
    </div>
  );
}
