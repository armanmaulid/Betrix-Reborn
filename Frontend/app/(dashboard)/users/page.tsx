'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Edit2,
  KeyRound,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserPlus
} from 'lucide-react';
import { useUsersQuery, useDeleteUserMutation } from '@/lib/queries/use-users';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { UpdateUserDialog } from '@/components/users/update-user-dialog';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { UserTierBadge } from '@/components/users/user-tier-badge';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { AdminUser } from '@/lib/types';

export default function UsersPage() {
  const { success, error } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUser | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<AdminUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUser | null>(null);

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
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    tier: tierFilter !== 'all' ? (tierFilter as any) : undefined,
    isAdmin: roleFilter === 'admin' ? true : roleFilter === 'user' ? false : undefined
  };

  const { data, isLoading, isError, refetch } = useUsersQuery(queryParams);

  const users = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const handleDeleteConfirm = async () => {
    if (!selectedUserForDelete) return;
    try {
      await deleteMutation.mutateAsync(selectedUserForDelete.id);
      success('USER DELETED', `Account for ${selectedUserForDelete.email} was permanently purged.`);
      setSelectedUserForDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to purge user.');
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              USER ACCOUNTS DIRECTORY
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Governance console for trader profiles, security flags, permissions & credit balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            TOTAL MATCHING: <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong>
          </span>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>NEW USER</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="border border-border bg-black p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email, name or ID..."
            className="w-full bg-surface border border-border pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filter Selects */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3 text-accent" />
            <span>STATUS:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL STATUSES</option>
            <option value="active">ACTIVE</option>
            <option value="suspended">SUSPENDED</option>
            <option value="banned">BANNED</option>
          </select>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
            <span>TIER:</span>
          </div>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL TIERS</option>
            <option value="free">FREE</option>
            <option value="starter">STARTER</option>
            <option value="pro">PRO</option>
            <option value="premium">PREMIUM</option>
            <option value="vip">VIP</option>
          </select>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
            <span>ROLE:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL ROLES</option>
            <option value="admin">ADMIN ONLY</option>
            <option value="user">TRADERS ONLY</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="p-3">USER IDENTIFIER / EMAIL</th>
              <th className="p-3">NAME</th>
              <th className="p-3">STATUS</th>
              <th className="p-3">TIER</th>
              <th className="p-3">PRIVILEGES</th>
              <th className="p-3 text-right">CREDITS</th>
              <th className="p-3 text-center">VERIFIED</th>
              <th className="p-3">CREATED</th>
              <th className="p-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground animate-pulse">
                  FETCHING USER RECORDS FROM DATABASE...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-negative">
                  ERROR LOADING USER DIRECTORY. PLEASE CHECK API CONNECTION.
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  NO USERS MATCH THE GIVEN QUERY CRITERIA.
                </td>
              </tr>
            ) : (
              users.map((u: AdminUser) => {
                const statusBadge =
                  u.status === 'active'
                    ? 'border-positive/40 bg-positive/10 text-positive'
                    : u.status === 'suspended'
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-negative/40 bg-negative/10 text-negative';

                return (
                  <tr key={u.id} className="hover:bg-surface-hover/80 transition-colors">
                    {/* Email + Link */}
                    <td className="p-3">
                      <Link
                        href={`/users/${u.id}`}
                        className="font-bold text-foreground hover:text-accent flex items-center gap-1.5 group"
                      >
                        <span>{u.email}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors" />
                      </Link>
                      <div className="text-[10px] text-muted-foreground/60 select-all">{u.id}</div>
                    </td>

                    {/* Name */}
                    <td className="p-3 text-foreground">
                      {u.name || <span className="text-muted-foreground italic">N/A</span>}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold border uppercase ${statusBadge}`}>
                        {u.status}
                      </span>
                    </td>

                    {/* Tier */}
                    <td className="p-3">
                      <UserTierBadge tier={u.tier} size="sm" />
                    </td>

                    {/* Privileges */}
                    <td className="p-3">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold border border-accent bg-accent/20 text-accent">
                          <Shield className="w-2.5 h-2.5" /> ROOT_ADMIN
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">TRADER</span>
                      )}
                    </td>

                    {/* Credits */}
                    <td className="p-3 text-right font-bold text-foreground tabular-nums">
                      {formatFinancialNumber(u.credits)}
                    </td>

                    {/* Verified */}
                    <td className="p-3 text-center">
                      {u.emailVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-positive inline-block" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground inline-block" />
                      )}
                    </td>

                    {/* Created */}
                    <td className="p-3 text-[11px] text-muted-foreground tabular-nums">
                      {u.createdAt ? new Date(u.createdAt).toISOString().substring(0, 10) : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedUserForEdit(u)}
                          title="Edit User Parameters"
                          className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setSelectedUserForReset(u)}
                          title="Force Password Reset"
                          className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors"
                        >
                          <KeyRound className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setSelectedUserForDelete(u)}
                          title="Permanently Delete User"
                          className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="border border-border bg-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>ROWS PER PAGE:</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="bg-surface border border-border px-2 py-0.5 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            PAGE <strong className="text-foreground">{page}</strong> OF <strong className="text-foreground">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); refetch(); }}
      />

      {/* Update User Dialog */}
      <UpdateUserDialog
        user={selectedUserForEdit}
        isOpen={Boolean(selectedUserForEdit)}
        onClose={() => setSelectedUserForEdit(null)}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        user={selectedUserForReset}
        isOpen={Boolean(selectedUserForReset)}
        onClose={() => setSelectedUserForReset(null)}
      />

      {/* Delete User Modal (Two-Step Verification) */}
      <DestructiveConfirmDialog
        isOpen={Boolean(selectedUserForDelete)}
        onClose={() => setSelectedUserForDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="PERMANENTLY PURGE USER ACCOUNT"
        description="This action is irreversible. It will delete the user profile, revoke all sessions across all devices, and cascade all associated transaction history."
        targetIdentifier={selectedUserForDelete?.email}
        confirmButtonText="PURGE USER NOW"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
