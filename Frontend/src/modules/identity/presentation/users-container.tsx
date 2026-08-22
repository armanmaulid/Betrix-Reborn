'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, UserPlus, RefreshCw } from 'lucide-react';
import { useUsersQuery, useDeleteUserMutation } from '@/modules/identity/application/queries/use-users';
import { UserTable } from './user-table';
import { CreateUserDialog } from './create-user-dialog';
import { UpdateUserDialog } from './update-user-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { User } from '@identity/domain/entities/User';
import type { UserTierLevel } from '@identity/domain/value-objects/UserTier';

export function UsersContainer() {
  usePageTitle('USER DIRECTORY');
  const { success, error } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'suspended' | 'banned' | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<UserTierLevel | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);

  const deleteMutation = useDeleteUserMutation();

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    tier: tierFilter !== 'all' ? tierFilter : undefined,
    isAdmin: roleFilter === 'admin' ? true : roleFilter === 'user' ? false : undefined
  };

  const { data, isLoading, isError, isRefetching, refetch } = useUsersQuery(queryParams);

  const users = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const handleDeleteConfirm = async () => {
    if (!selectedUserForDelete) return;
    try {
      await deleteMutation.mutateAsync(selectedUserForDelete.id);
      success('TRADER ACCOUNT PURGED', `User ${selectedUserForDelete.email} permanently removed.`);
      setSelectedUserForDelete(null);
    } catch (err: any) {
      error('PURGE ACTION FAILED', err.message || 'Unable to delete user.');
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              REGISTERED TRADERS & SYSTEM ACCOUNTS
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Institutional trader registry, role privileges, tier allocations, and session audits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Users List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>PROVISION TRADER</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="border border-border bg-black p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email, name, UUID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-surface border border-border pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-1">
            <Filter className="w-3 h-3 text-accent" />
            <span>FILTER:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL STATUSES</option>
            <option value="active">ACTIVE ONLY</option>
            <option value="suspended">SUSPENDED ONLY</option>
            <option value="banned">BANNED ONLY</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value as any); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL TIERS</option>
            <option value="free">FREE</option>
            <option value="starter">STARTER</option>
            <option value="pro">PRO</option>
            <option value="premium">PREMIUM</option>
            <option value="vip">VIP</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL ROLES</option>
            <option value="admin">ADMINS ONLY</option>
            <option value="user">STANDARD TRADERS</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground whitespace-nowrap">
          TOTAL: <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong> TRADERS
        </div>
      </div>

      {/* User Table Pure View */}
      <UserTable
        users={users}
        isLoading={isLoading}
        isError={isError}
        onEdit={(user) => setSelectedUserForEdit(user)}
        onResetPassword={(user) => setSelectedUserForReset(user)}
        onDelete={(user) => setSelectedUserForDelete(user)}
      />

      {/* Pagination Bar */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        limitOptions={[10, 25, 50, 100]}
        isLoading={isLoading}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); refetch(); }}
      />

      {/* Update User Dialog */}
      {selectedUserForEdit && (
        <UpdateUserDialog
          user={selectedUserForEdit as any}
          isOpen={Boolean(selectedUserForEdit)}
          onClose={() => { setSelectedUserForEdit(null); refetch(); }}
        />
      )}

      {/* Reset Password Dialog */}
      {selectedUserForReset && (
        <ResetPasswordDialog
          user={selectedUserForReset as any}
          isOpen={Boolean(selectedUserForReset)}
          onClose={() => setSelectedUserForReset(null)}
        />
      )}

      {/* Delete User Confirmation */}
      <DestructiveConfirmDialog
        isOpen={Boolean(selectedUserForDelete)}
        onClose={() => setSelectedUserForDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="PERMANENTLY PURGE TRADER ACCOUNT"
        description={`This action will permanently delete ${selectedUserForDelete?.email} and invalidate all associated sessions, vouchers, and API tokens. This action is irreversible.`}
        targetIdentifier={selectedUserForDelete?.email}
        confirmButtonText="PURGE ACCOUNT NOW"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
