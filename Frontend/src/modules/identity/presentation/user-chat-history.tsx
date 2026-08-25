'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Bot,
  User,
  Zap,
  Clock,
  Coins
} from 'lucide-react';
import { useUserChatHistoryQuery } from '@/modules/identity/application/queries/use-users';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { formatFinancialNumber } from '@/shared/utils';
import { formatDateTime } from '@/shared/utils/formatters';
import type { AdminChatMessage } from '@/modules/identity/domain/entities/User';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

interface UserChatHistoryProps {
  userId: string;
  userEmail: string;
}

export function UserChatHistory({ userId, userEmail }: UserChatHistoryProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [sessionInput, setSessionInput] = useState('');
  const [expandedMessageIds, setExpandedMessageIds] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useUserChatHistoryQuery(userId, {
    page,
    limit,
    sessionId: sessionIdFilter || undefined
  });

  // Hook normalizes both array (sessionId filter) and paginated responses
  const messages: AdminChatMessage[] = data?.data ?? [];
  const meta = data?.meta || {
    page,
    limit,
    total: messages.length,
    totalPages: Math.max(1, Math.ceil(messages.length / limit))
  };

  const handleApplySessionFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setSessionIdFilter(sessionInput.trim());
    setPage(1);
  };

  const handleClearSessionFilter = () => {
    setSessionInput('');
    setSessionIdFilter('');
    setPage(1);
  };

  const toggleExpand = (id: string) => {
    setExpandedMessageIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFilterBySession = (sessionId: string) => {
    setSessionInput(sessionId);
    setSessionIdFilter(sessionId);
    setPage(1);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Search & Filter Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
              USER CHAT AUDIT TRAIL
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Audit intelligence completions, prompt reasoning, and token telemetry for{' '}
            <span className="text-accent font-bold">{userEmail}</span>
          </p>
        </div>

        {/* Filter Form */}
        <form onSubmit={handleApplySessionFilter} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="FILTER BY SESSION ID..."
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              className="bg-black border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 w-48 sm:w-64 focus:outline-none focus:border-accent"
            />
            {sessionInput && (
              <button
                type="button"
                onClick={handleClearSessionFilter}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-1 border border-border bg-black hover:border-accent hover:text-accent text-foreground px-3 py-1.5 text-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">FILTER</span>
          </button>
        </form>
      </div>

      {/* Active Filter Notification */}
      {sessionIdFilter && (
        <div className="border border-accent/40 bg-accent/10 px-4 py-2 flex items-center justify-between text-xs text-accent">
          <div className="flex items-center gap-2">
            <span>FILTERED BY SESSION:</span>
            <strong className="font-bold select-all">{sessionIdFilter}</strong>
          </div>
          <button
            onClick={handleClearSessionFilter}
            className="text-[11px] underline hover:text-white uppercase font-bold"
          >
            SHOW ALL SESSIONS
          </button>
        </div>
      )}

      {/* Messages List */}
      <div className="border border-border bg-surface">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            RETRIEVING ENCRYPTED CONVERSATION TELEMETRY...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-negative">
            FAILED TO RETRIEVE USER CHAT HISTORY.
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {sessionIdFilter
              ? `NO CHAT MESSAGES FOUND FOR SESSION ID: ${sessionIdFilter}`
              : 'NO CHAT CONVERSATIONS RECORDED FOR THIS USER ACCOUNT.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((item) => {
              const isExpanded = expandedMessageIds[item.id] ?? false;
              const totalTokens = (item.inputTokens || 0) + (item.outputTokens || 0);

              return (
                <div key={item.id} className="p-4 transition-colors hover:bg-black/40">
                  {/* Top Item Summary Row */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-accent mt-0.5 sm:mt-0"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-accent" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-md">
                            {item.message?.substring(0, 75)}
                            {(item.message?.length || 0) > 75 ? '...' : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatDateTime(item.createdAt)}</span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterBySession(item.sessionId);
                            }}
                            className="text-accent hover:underline flex items-center gap-0.5"
                            title="Click to filter by this session ID"
                          >
                            <span>Session:</span>
                            <span className="select-all">{item.sessionId}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      {/* Model Used Badge */}
                      <span className="px-2 py-0.5 border border-info/40 bg-info/10 text-info font-bold uppercase">
                        {item.modelUsed || item.taskType || 'AI AGENT'}
                      </span>

                      {/* Latency */}
                      {item.latencyMs !== undefined && (
                        <span className="px-2 py-0.5 border border-border bg-black text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.latencyMs}ms</span>
                        </span>
                      )}

                      {/* Tokens */}
                      <span className="px-2 py-0.5 border border-accent/40 bg-accent/10 text-accent flex items-center gap-1 font-bold">
                        <Coins className="w-2.5 h-2.5" />
                        <span>{formatFinancialNumber(totalTokens)} TOKENS</span>
                      </span>
                    </div>
                  </div>

                  {/* Expanded Conversation View */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/80 space-y-4 text-xs">
                      {/* User Prompt */}
                      <div className="border border-border/60 bg-black/60 p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-accent font-bold">
                            <User className="w-3.5 h-3.5" />
                            <span>USER PROMPT</span>
                          </div>
                          <span>INPUT: {formatFinancialNumber(item.inputTokens || 0)} TOKENS</span>
                        </div>
                        <div className="text-foreground whitespace-pre-wrap select-all font-sans leading-relaxed text-xs">
                          {item.message}
                        </div>
                      </div>

                      {/* AI Agent Response */}
                      <div className="border border-info/40 bg-info/5 p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-info/20 pb-1.5 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-info font-bold">
                            <Bot className="w-3.5 h-3.5" />
                            <span>AI COMPLETION ({item.modelUsed || 'UNKNOWN_MODEL'})</span>
                          </div>
                          <span>
                            OUTPUT: {formatFinancialNumber(item.outputTokens || 0)} TOKENS
                          </span>
                        </div>
                        <div className="text-foreground whitespace-pre-wrap select-all font-sans leading-relaxed text-xs">
                          {item.reply}
                        </div>
                      </div>

                      {/* Telemetry Breakdown Details */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 px-1">
                        <div>
                          MESSAGE ID: <span className="text-foreground select-all">{item.id}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>
                            INPUT TOKENS:{' '}
                            <strong className="text-foreground">{item.inputTokens || 0}</strong>
                          </span>
                          <span>
                            OUTPUT TOKENS:{' '}
                            <strong className="text-info">{item.outputTokens || 0}</strong>
                          </span>
                          <span>
                            LATENCY:{' '}
                            <strong className="text-accent">{item.latencyMs || 0}ms</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!sessionIdFilter && meta.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={meta.totalPages}
          onPageChange={(p) => setPage(p)}
          limit={limit}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          limitOptions={[10, 20, 50]}
          total={meta.total}
          totalLabel="TOTAL INTERACTIONS"
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
