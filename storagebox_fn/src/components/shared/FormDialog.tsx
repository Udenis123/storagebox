import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  submitLabel: string;
  isPending: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
};

export function DialogHeading({ icon, title, description }: Pick<FormDialogProps, "icon" | "title" | "description">) {
  return (
    <DialogHeader className="-mx-4 -mt-4 flex-row items-center gap-3 border-b px-5 py-4 pr-12">
      {icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
      )}
      <div className="grid min-w-0 gap-1">
        <DialogTitle className="text-lg font-semibold md:text-xl">{title}</DialogTitle>
        {description && <DialogDescription className="text-sm md:text-base">{description}</DialogDescription>}
      </div>
    </DialogHeader>
  );
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  submitLabel,
  isPending,
  canSubmit = true,
  onSubmit,
  children,
  size = "md",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit && !isPending) onSubmit();
          }}
        >
          <DialogHeading icon={icon} title={title} description={description} />
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={!canSubmit || isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium md:text-base">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground md:text-sm">{hint}</p>}
    </div>
  );
}
