'use client';

import React, { useState } from 'react';
import {
  useAgentsQuery,
  useSetDefaultAgentMutation,
  useDeleteAgentMutation
} from '@/modules/intelligence/application/queries/use-agents';
import { AgentsFleetGrid } from './agents-fleet-grid';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { AiAgent } from '@intelligence/domain/entities/AiAgent';

export function AgentsContainer() {
  usePageTitle('AI FLEET');
  const { success, error } = useToast();
  const { data: agents = [], isLoading, isError, isRefetching, refetch } = useAgentsQuery();

  const setDefaultMutation = useSetDefaultAgentMutation();
  const deleteMutation = useDeleteAgentMutation();

  const [selectedAgentForDelete, setSelectedAgentForDelete] = useState<AiAgent | null>(null);

  const handleSetDefault = async (agent: AiAgent) => {
    if (agent.isDefault) return;
    try {
      await setDefaultMutation.mutateAsync(agent.id);
      success(
        'DEFAULT MODEL UPDATED',
        `${agent.name} is now the system-wide default intelligence agent.`
      );
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update default agent.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgentForDelete) return;
    if (selectedAgentForDelete.isDefault) {
      error(
        'ACTION BLOCKED',
        'Cannot delete the system default agent. Set another agent as default first.'
      );
      setSelectedAgentForDelete(null);
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedAgentForDelete.id);
      success(
        'AGENT PURGED',
        `AI Model ${selectedAgentForDelete.name} was successfully removed from the fleet.`
      );
      setSelectedAgentForDelete(null);
    } catch (err: any) {
      error('PURGE FAILED', err.message || 'Unable to delete AI agent.');
    }
  };

  return (
    <>
      <AgentsFleetGrid
        agents={agents}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRefresh={() => refetch()}
        onSetDefault={handleSetDefault}
        onDeleteRequest={(agent) => setSelectedAgentForDelete(agent)}
      />

      <DestructiveConfirmDialog
        isOpen={Boolean(selectedAgentForDelete)}
        onClose={() => setSelectedAgentForDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="PERMANENTLY PURGE AI AGENT"
        description={`This action will permanently delete "${selectedAgentForDelete?.name}" from your active AI fleet routing. This model will no longer process incoming user queries.`}
        targetIdentifier={selectedAgentForDelete?.name}
        confirmButtonText="PURGE AGENT NOW"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
