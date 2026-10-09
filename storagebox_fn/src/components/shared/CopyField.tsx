import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  value: string;
  label?: string;
  isSecret?: boolean;
  canOpen?: boolean;
  className?: string;
};

/** Read-only value with copy (and optional open) buttons — used for links, keys and snippets. */
export function CopyField({ value, label, isSecret = false, canOpen = false, className }: CopyFieldProps) {
  const { copy, copiedText } = useCopy();
  const isCopied = copiedText === value;
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
      <div className="flex min-w-0 items-center gap-1 rounded-lg border bg-muted/40 p-1 pl-3">
        <code className={cn("min-w-0 flex-1 truncate font-mono text-sm", isSecret && "text-tone-warning")}>{value}</code>
        {canOpen && (
          <Button variant="ghost" size="icon" render={<a href={value} target="_blank" rel="noreferrer" />} aria-label="Open link">
            <ExternalLink />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => copy(value)} aria-label="Copy">
          {isCopied ? <Check className="text-tone-success" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const { copy, copiedText } = useCopy();
  return (
    <div className={cn("group relative min-w-0", className)}>
      <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 pr-12 font-mono text-sm leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-slate-300 hover:bg-white/10 hover:text-white"
        onClick={() => copy(code, "Snippet copied")}
        aria-label="Copy snippet"
      >
        {copiedText === code ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
