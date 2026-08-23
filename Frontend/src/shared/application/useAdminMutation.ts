'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Factory that wraps `useMutation` with the standard admin cache invalidation
 * pattern used across all admin mutation hooks.
 *
 * Every mutation's `onSuccess` invalidates the provided query keys **plus**
 * `['admin']` (the top-level admin queries cache).
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
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}
