import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

const MAX_BUTTONS = 7;

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** Page numbers to show: first, last and the neighbours of the current page, with null standing for a gap ("…"). */
function visiblePages(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= MAX_BUTTONS) return range(1, pageCount);
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  return [1, ...(start > 2 ? [null] : []), ...range(start, end), ...(end < pageCount - 1 ? [null] : []), pageCount];
}

export function Pagination({ page, pageCount, pageSize, total, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{first}</span>–
        <span className="font-semibold text-foreground">{last}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
        </Button>
        {visiblePages(page, pageCount).map((value, index) =>
          value === null ? (
            <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={value}
              variant={value === page ? "default" : "ghost"}
              size="sm"
              className="min-w-8"
              aria-current={value === page ? "page" : undefined}
              onClick={() => onChange(value)}
            >
              {value}
            </Button>
          ),
        )}
        <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
          <span className="hidden sm:inline">Next</span> <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
