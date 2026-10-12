import { useInfiniteQuery } from "@tanstack/react-query";
import { publicFetch, queryString } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { FileKind, Gallery } from "@/lib/types";

const GALLERY_PAGE_SIZE = 40;

export type GalleryFilter = { folder?: string; kind?: FileKind };

const getGallery = (token: string, filter: GalleryFilter, page: number) =>
  publicFetch<Gallery>(`/public/galleries/${encodeURIComponent(token)}${queryString({ ...filter, page, pageSize: GALLERY_PAGE_SIZE })}`);

/** Pages of a shared gallery; folder details come from the first page. */
export function useGallery(token: string, filter: GalleryFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.gallery(token, filter.folder ?? "", filter.kind ?? ""),
    queryFn: async ({ pageParam }) => (await getGallery(token, filter, pageParam)).data,
    initialPageParam: 1,
    getNextPageParam: ({ files }) => (files.page * files.pageSize < files.total ? files.page + 1 : undefined),
  });
}
