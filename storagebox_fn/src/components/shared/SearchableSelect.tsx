import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; description?: string };

type SearchableSelectProps = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  isLoading?: boolean;
  /** When set, filtering happens on the server and every keystroke is reported here. */
  onSearchChange?: (search: string) => void;
  selectedLabel?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyText = "No match.",
  isLoading = false,
  onSearchChange,
  selectedLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const label = selectedLabel ?? options.find((option) => option.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-11 w-full justify-between text-base font-normal"
          />
        }
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>{label ?? placeholder}</span>
        <ChevronsUpDown className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder="Search…" onValueChange={onSearchChange} className="text-base" />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.description ?? ""} ${option.value}`}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="items-start py-2"
              >
                <Check className={cn("mt-0.5", option.value === value ? "opacity-100" : "opacity-0")} />
                <div className="grid">
                  <span className="text-base">{option.label}</span>
                  {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
