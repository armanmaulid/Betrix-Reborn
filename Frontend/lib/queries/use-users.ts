'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AdminUser,
  AdminUserDetail,
  PaginatedResult,
  AdminUsersQuery,
  AdminChatMessage,
  AdminChatHistoryQuery
} from '@/lib/types';
import type {
  UpdateAdminUserInput,
  ResetUserPasswordInput,
  CreateAdminUserInput
} from '@/lib/schemas/admin.schema';

export function useUsersQuery(params: AdminUsersQuery = {}) {
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.tier) searchParams.set('tier', params.tier);
  if (params.isAdmin !== undefined) searchParams.set('isAdmin', params.isAdmin.toString());

  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<AdminUser>>({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch users (${res.status})`);
      }
      const json = await res.json();
      return {
        data: json.data || [],
        meta: json.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
      };
    }
  });
}

export function useUserDetailQuery(userId: string) {
  return useQuery<AdminUserDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch user details (${res.status})`);
      }
      const json = await res.json();
      return json.data || json;
    },
    enabled: Boolean(userId)
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAdminUserInput }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    }
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAdminUserInput) => {
      const payload = { ...data, password: data.password?.trim() || undefined };
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });
}

export function useResetPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ResetUserPasswordInput }) => {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to reset password');
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
    }
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to delete user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    }
  });
}

export function useUserChatHistoryQuery(userId: string, params: AdminChatHistoryQuery = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sessionId) searchParams.set('sessionId', params.sessionId);
  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<AdminChatMessage> | { data: AdminChatMessage[] }>({
    queryKey: ['admin', 'users', userId, 'chat-history', params],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/chat-history${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch chat history (${res.status})`);
      }
      return res.json();
    },
    enabled: Boolean(userId)
  });
}

