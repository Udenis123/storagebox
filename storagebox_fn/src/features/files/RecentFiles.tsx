import { Link } from "react-router-dom";
import { EmptyState } from "@/components/shared/States";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatBytes, timeAgo } from "@/lib/format";
import { FileThumb } from "./FileThumb";
import { useFiles } from "./hooks";

const RECENT_COUNT = 6;

export function RecentFiles() {
  const { data, isLoading } = useFiles({ sort: "newest", page: 1, pageSize: RECENT_COUNT });

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
    );
  }
  if (!data?.items.length) {
    return (
      <EmptyState
        title="No files yet"
        description="Upload your first document or image."
        action={<Button render={<Link to="/library" />}>Go to library</Button>}
      />
    );
  }

  return (
    <ul className="divide-y">
      {data.items.map((file) => (
        <li key={file.id}>
          <Link to={`/library?file=${file.id}`} className="flex items-center gap-3 rounded-lg py-2.5 hover:bg-muted/50">
            <FileThumb file={file} className="size-12" />
            <div className="grid min-w-0 flex-1">
              <span className="truncate text-base font-medium">{file.originalName}</span>
              <span className="truncate text-sm text-muted-foreground">
                {file.collectionPath ?? "No collection"} · {formatBytes(file.sizeBytes)}
              </span>
            </div>
            <span className="hidden text-sm text-muted-foreground sm:block">{timeAgo(file.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
