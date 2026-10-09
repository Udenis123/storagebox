import { useCallback, useState } from "react";
import { toast } from "sonner";

const COPIED_RESET_MS = 1500;

export function useCopy(): { copy: (text: string, label?: string) => void; copiedText: string | null } {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copy = useCallback((text: string, label = "Copied to clipboard") => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(text);
        toast.success(label);
        setTimeout(() => setCopiedText(null), COPIED_RESET_MS);
      })
      .catch(() => toast.error("Could not copy — select and copy manually"));
  }, []);
  return { copy, copiedText };
}
