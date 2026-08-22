'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRepository } from '@identity/infrastructure/repositories/HttpUserRepository';
import { identityKeys } from '@identity/application/identity.keys';
import type { User } from '@identity/domain/entities/User';
import type {
  AdminUserDetail,
  AdminUsersQuery,
  AdminChatMessage,
  AdminChatHistoryQuery
} from '@/lib/types';
import type {
  UpdateAdminUserInput,
  ResetUserPasswordInput,
  CreateAdminUserInput
} from '@/modules/operations/application/schemas/admin.schema';
import type { PaginatedResult } from '@shared/domain/types/Pagination';
import { apiFetch } from '@shared/infrastructure/http/api-client';

export function useUsersQuery(params: AdminUsersQuery = {}) {
  return useQuery<PaginatedResult<User>>({
    queryKey: identityKeys.users(params as Record<string, unknown>),
    queryFn: () => userRepository.getUsers(params as any)
  });
}

export function useUserDetailQuery(userId: string) {
  return useQuery<AdminUserDetail>({
    queryKey: identityKeys.userDetail(userId),
    queryFn: async () => {
      const json = await apiFetch<any>(`/api/admin/users/${encodeURIComponent(userId)}`);
      return json.data || json;
    },
    enabled: Boolean(userId)
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserInput }) =>
      userRepository.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: identityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminUserInput) => {
      const payload = { ...data, password: data.password?.trim() || undefined };
      return userRepository.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: identityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useResetPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetUserPasswordInput }) =>
      userRepository.resetPassword(id, data?.newPassword),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: identityKeys.userDetail(id) });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userRepository.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: identityKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useUserChatHistoryQuery(userId: string, params: AdminChatHistoryQuery = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sessionId) searchParams.set('sessionId', params.sessionId);
  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<AdminChatMessage>>({
    queryKey: identityKeys.userChatHistory(userId, params as Record<string, unknown>),
    queryFn: async () => {
      const json = await apiFetch<any>(
        `/api/admin/users/${encodeURIComponent(userId)}/chat-history${queryString ? `?${queryString}` : ''}`
      );
      const rawData = json.data;
      if (Array.isArray(rawData)) {
        return {
          data: rawData,
          meta: {
            page: params.page || 1,
            limit: params.limit || 20,
            total: rawData.length,
            totalPages: Math.max(1, Math.ceil(rawData.length / (params.limit || 20)))
          }
        };
      }
      return {
        data: json.data || [],
        meta: json.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
      };
    },
    enabled: Boolean(userId)
  });
}
