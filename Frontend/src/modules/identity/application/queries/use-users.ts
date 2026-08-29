'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRepository } from '@/modules/identity/infrastructure/repositories/HttpUserRepository';
import { identityKeys } from '@/modules/identity/application/identity.keys';
import { useAdminMutation } from '@/shared/application/useAdminMutation';
import type { User } from '@/modules/identity/domain/entities/User';
import type {
  AdminUserDetail,
  AdminUsersQuery,
  AdminChatMessage,
  AdminChatHistoryQuery
} from '@/modules/identity/domain/entities/User';
import type {
  UpdateAdminUserInput,
  ResetUserPasswordInput,
  CreateAdminUserInput
} from '@/modules/identity/application/schemas/admin-user.schema';
import type { PaginatedResult } from '@/shared/domain/types/Pagination';

export function useUsersQuery(params: AdminUsersQuery = {}) {
  return useQuery<PaginatedResult<User>>({
    queryKey: identityKeys.users(params as Record<string, unknown>),
    queryFn: () => userRepository.getUsers(params)
  });
}

export function useUserDetailQuery(userId: string) {
  return useQuery<AdminUserDetail>({
    queryKey: identityKeys.userDetail(userId),
    queryFn: () => userRepository.getUserDetail(userId),
    enabled: Boolean(userId)
  });
}

export function useUpdateUserMutation() {
  return useAdminMutation(
    ({ id, data }: { id: string; data: UpdateAdminUserInput }) =>
      userRepository.updateUser(id, data),
    [identityKeys.all]
  );
}

export function useCreateUserMutation() {
  return useAdminMutation(
    (data: CreateAdminUserInput) => {
      const payload = { ...data, password: data.password?.trim() || undefined };
      return userRepository.createUser(payload);
    },
    [identityKeys.all]
  );
}

export function useResetPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetUserPasswordInput }) =>
      userRepository.resetPassword(id, data?.newPassword),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: identityKeys.userDetail(id) });
    }
  });
}

export function useDeleteUserMutation() {
  return useAdminMutation(
    (userId: string) => userRepository.deleteUser(userId),
    [identityKeys.all]
  );
}

export function useRevokeSessionMutation() {
  return useAdminMutation(
    ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      userRepository.revokeSession(userId, sessionId),
    [identityKeys.all]
  );
}

export function useRevokeAllSessionsMutation() {
  return useAdminMutation(
    (userId: string) => userRepository.revokeAllSessions(userId),
    [identityKeys.all]
  );
}

export function useRemoveDeviceMutation() {
  return useAdminMutation(
    ({ userId, deviceId }: { userId: string; deviceId: string }) =>
      userRepository.removeDevice(userId, deviceId),
    [identityKeys.all]
  );
}

export function useUserChatHistoryQuery(userId: string, params: AdminChatHistoryQuery = {}) {
  return useQuery<PaginatedResult<AdminChatMessage>>({
    queryKey: identityKeys.userChatHistory(userId, params as Record<string, unknown>),
    queryFn: () => userRepository.getUserChatHistory(userId, params),
    enabled: Boolean(userId)
  });
}
