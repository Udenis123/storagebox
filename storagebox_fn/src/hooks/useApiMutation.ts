import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResult } from "@/lib/api";

type MutationOptions<TData> = {
  invalidate?: QueryKey[];
  onSuccess?: (data: TData) => void;
  isSilent?: boolean;
};

/** Runs an API action, toasts the server message, and refreshes the affected queries. */
export function useApiMutation<TVars, TData = unknown>(
  action: (vars: TVars) => Promise<ApiResult<TData>>,
  { invalidate = [], onSuccess, isSilent = false }: MutationOptions<TData> = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async (result) => {
      if (!isSilent) toast.success(result.message);
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSuccess?.(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    },
  });
}
