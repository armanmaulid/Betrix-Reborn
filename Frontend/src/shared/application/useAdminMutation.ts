'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Factory that wraps `useMutation` with the standard admin cache invalidation
 * pattern used across all admin mutation hooks.
 *
 * Every mutation's `onSuccess` invalidates the provided query keys. Callers
 * must pass the real key roots (see each module's `*.keys.ts`) — there is no
 * implicit fallback, so a missing key is a visible stale-cache bug instead of
 * a silent no-op.
 *
 * @example
 * ```ts
 * export const useDeleteAgentMutation = () =>
 *   useAdminMutation(
 *     (id: string) => agentRepository.deleteAgent(id),
 *     [intelligenceKeys.all]
 *   );
 * ```
 */
export function useAdminMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidationKeys: QueryKey[] = []
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidationKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }
  });
}
