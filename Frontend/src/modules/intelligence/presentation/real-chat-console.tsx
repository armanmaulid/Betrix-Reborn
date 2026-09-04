'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Send,
  Brain,
  Zap,
  ChevronDown,
  ChevronRight,
  Coins,
  Database,
  Newspaper,
  CandlestickChart,
  Copy,
  Check
} from 'lucide-react';
import { useAgentsQuery } from '@/modules/intelligence/application/queries/use-agents';
import { useMarketSymbolsQuery } from '@/modules/market/application/queries/use-market-data';
import { useCurrentUserCreditsQuery } from '@/modules/identity/application/queries/use-users';
import { chatRepository } from '@/modules/intelligence/infrastructure/repositories/HttpChatRepository';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { Markdown } from '@/shared/presentation/ui/markdown';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { useCopyFeedback } from '@/shared/presentation/hooks/use-copy-feedback';
import type {
  StreamDoneMeta,
  InjectedContext,
  MarketContextOptions,
  ChatStreamCallbacks
} from '@/modules/intelligence/domain/entities/ChatStream';

const TIMEFRAMES = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1', 'mn1'];

const MAX_MESSAGE_CHARS = 8000;
const INFERENCE_TIMEOUT_MS = 60000;

const OHLC_COLUMNS: TableColumn[] = [
  { key: 'time', label: 'Time' },
  { key: 'open', label: 'Open' },
  { key: 'high', label: 'High' },
  { key: 'low', label: 'Low' },
  { key: 'close', label: 'Close' },
  { key: 'vol', label: 'Vol' }
];

const PRESET_PROMPTS = [
  {
    label: 'XAUUSD CONFLUENCE',
    prompt:
      'Analisa XAUUSD M5 sekarang. Identifikasi struktur pasar, level likuiditas kunci, dan zona trade high-probability.'
  },
  {
    label: 'RISK MANAGEMENT',
    prompt:
      'Hitung ukuran posisi risiko 1% untuk akun $50,000 trading XAUUSD dengan entry 4458 dan stop loss 4447.'
  },
  {
    label: 'NEWS SENTIMENT',
    prompt:
      'Berdasarkan berita terbaru, bagaimana sentimen pasar saat ini dan level kunci yang perlu diwaspadai?'
  }
];

export function RealChatConsole() {
  usePageTitle('REAL TEST CHAT');
  const toast = useToast();
  const { isCopied, copy } = useCopyFeedback();

  const { data: agents = [], isLoading: isAgentsLoading, isError: isAgentsError } = useAgentsQuery();
  const { data: symbols = [] } = useMarketSymbolsQuery(false);
  const { refetch: refetchCredits } = useCurrentUserCreditsQuery();

  const fetchBalance = async (): Promise<number | null> => {
    const result = await refetchCredits();
    return typeof result.data === 'number' ? result.data : null;
  };

  const [agentId, setAgentId] = useState('');
  const [symbol, setSymbol] = useState('EURUSD');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [showSymbolList, setShowSymbolList] = useState(false);
  const [timeframe, setTimeframe] = useState('h1');
  const [candleCount, setCandleCount] = useState(30);
  const [includeCandles, setIncludeCandles] = useState(true);
  const [includeIndicators, setIncludeIndicators] = useState(true);
  const [includeNews, setIncludeNews] = useState(true);
  const [newsLimit, setNewsLimit] = useState(10);
  const [message, setMessage] = useState('');

  const [isStreaming, setIsStreaming] = useState(false);
  const [thinking, setThinking] = useState('');
  const [reply, setReply] = useState('');
  const [doneMeta, setDoneMeta] = useState<StreamDoneMeta | null>(null);
  const [injected, setInjected] = useState<InjectedContext | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [balanceBefore, setBalanceBefore] = useState<number | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sessionId] = useState<string>(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'session-' + Date.now()
  );
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null;
  const creditsRate = selectedAgent?.creditsPer1kTokens ?? 1;

  const filteredSymbols = symbols.filter((s) => s.symbol.startsWith(symbolFilter.toUpperCase()));

  const resetTranscript = () => {
    setThinking('');
    setReply('');
    setDoneMeta(null);
    setInjected(null);
    setErrorMsg(null);
    setBalanceBefore(null);
    setBalanceAfter(null);
  };

  const handleSend = async () => {
    if (isStreaming) return;
    if (!message.trim()) {
      toast.error('PROMPT REQUIRED', 'Enter a message before sending.');
      return;
    }
    if (message.trim().length > MAX_MESSAGE_CHARS) {
      toast.error('MESSAGE TOO LONG', `Message exceeds ${MAX_MESSAGE_CHARS} characters.`);
      return;
    }

    resetTranscript();
    setIsStreaming(true);

    const before = await fetchBalance();
    setBalanceBefore(before);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

    const marketContext: MarketContextOptions = {
      symbol,
      timeframe,
      candleCount,
      includeCandles,
      includeIndicators,
      includeNews,
      newsLimit
    };

    let aborted = false;
    let errored = false;

    const callbacks: ChatStreamCallbacks = {
      onContext: (context: InjectedContext) => {
        if (isMountedRef.current) setInjected(context);
      },
      onThink: (chunk: string) => {
        if (isMountedRef.current) setThinking((prev) => prev + chunk);
      },
      onDelta: (chunk: string) => {
        if (isMountedRef.current) setReply((prev) => prev + chunk);
      },
      onDone: (meta: StreamDoneMeta) => {
        if (!isMountedRef.current) return;
        setDoneMeta(meta);
        toast.success(
          'STREAM COMPLETE',
          `Model responded in ${meta.latencyMs}ms (${meta.outputTokens} tokens).`
        );
      },
      onError: (message: string) => {
        errored = true;
        if (isMountedRef.current) setErrorMsg(message);
      }
    };

    try {
      await chatRepository.stream(
        {
          sessionId,
          agentId: agentId || undefined,
          message: message.trim(),
          marketContext
        },
        callbacks,
        controller.signal
      );
    } catch (err: any) {
      aborted = err?.name === 'AbortError';
      if (!aborted && isMountedRef.current) {
        errored = true;
        setErrorMsg(err.message || 'Stream failed');
      }
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setIsStreaming(false);
        // Only audit the post-stream balance on a completed run; an aborted or
        // errored stream never settled, so reporting a delta would mislead.
        if (!aborted && !errored) {
          const after = await fetchBalance();
          setBalanceAfter(after);
        }
      }
      abortRef.current = null;
    }
  };

  const handleAbort = () => abortRef.current?.abort();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="REAL TEST CHAT // CREDIT & CONTEXT VERIFICATION"
        icon={Terminal}
        subtitle={
          <>
            Streams a real AI reply via{' '}
            <span className="text-foreground font-bold">/chat/stream</span>, persists to history,
            and charges credits (rate:{' '}
            <span className="text-accent font-bold">{creditsRate}/1k</span>). Session:{' '}
            <span className="text-foreground/80">{sessionId.slice(0, 8)}</span>
          </>
        }
      />

      {/* Loading / error skeleton for the agent fleet */}
      {isAgentsLoading ? (
        <div className="space-y-3 font-mono animate-pulse">
          <div className="border border-border bg-surface p-4">
            <div className="h-4 bg-surface border border-border w-1/3 mb-3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-9 bg-surface border border-border"></div>
              <div className="h-9 bg-surface border border-border"></div>
              <div className="h-9 bg-surface border border-border"></div>
              <div className="h-9 bg-surface border border-border"></div>
            </div>
          </div>
          <div className="h-24 bg-surface border border-border"></div>
          <div className="h-32 bg-surface border border-border"></div>
        </div>
      ) : isAgentsError ? (
        <div className="p-8 text-center text-xs text-negative border border-negative bg-surface">
          FAILED TO LOAD AI AGENT MODELS. CHECK API CONNECTION.
        </div>
      ) : (
        <>
      {/* Config panel */}
      <div className="border border-border bg-surface/60 p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Agent */}
          <div className="space-y-1">
            <label
              htmlFor="chat-agent"
              className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold"
            >
              Agent (incl. private)
            </label>
            <select
              id="chat-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">— default agent —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.modelName}) {a.visibility === 'private' ? '[PRIVATE]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div className="space-y-1">
            <label
              htmlFor="chat-timeframe"
              className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold"
            >
              Timeframe
            </label>
            <select
              id="chat-timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol combobox */}
          <div className="space-y-1 relative">
            <label
              htmlFor="chat-symbol"
              className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold"
            >
              Symbol (Dukascopy)
            </label>
            <input
              id="chat-symbol"
              type="text"
              role="combobox"
              aria-expanded={showSymbolList && filteredSymbols.length > 0}
              aria-autocomplete="list"
              aria-controls="chat-symbol-listbox"
              autoComplete="off"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setSymbolFilter(e.target.value.toUpperCase());
                setShowSymbolList(true);
              }}
              onFocus={() => setShowSymbolList(true)}
              onBlur={() => setTimeout(() => setShowSymbolList(false), 150)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
            {showSymbolList && (
              <div
                id="chat-symbol-listbox"
                role="listbox"
                className="absolute z-10 w-full max-h-48 overflow-y-auto bg-black border border-border mt-1"
              >
                {filteredSymbols.slice(0, 50).map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    role="option"
                    aria-selected={s.symbol === symbol}
                    onMouseDown={() => {
                      setSymbol(s.symbol);
                      setSymbolFilter(s.symbol);
                      setShowSymbolList(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface text-xs text-foreground"
                  >
                    {s.symbol} <span className="text-muted-foreground">({s.name})</span>
                  </button>
                ))}
                {filteredSymbols.length === 0 && (
                  <div className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground">
                    NO MATCHES
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Candle count */}
          <div className="space-y-1">
            <label
              htmlFor="chat-candle-count"
              className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold"
            >
              Candle count
            </label>
            <input
              id="chat-candle-count"
              type="number"
              min={5}
              max={200}
              value={candleCount}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setCandleCount(Number.isFinite(n) ? Math.min(200, Math.max(5, n)) : 30);
              }}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Injection checkboxes */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-3">
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeCandles}
              onChange={(e) => {
                setIncludeCandles(e.target.checked);
                if (!e.target.checked) setIncludeIndicators(false);
              }}
              className="accent-accent"
            />
            <CandlestickChart className="w-3.5 h-3.5 text-accent" />
            Inject Candles
          </label>

          <label
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              includeCandles ? 'text-foreground' : 'text-muted-foreground/40 cursor-not-allowed'
            }`}
            title={includeCandles ? undefined : 'requires candle data'}
          >
            <input
              type="checkbox"
              checked={includeIndicators}
              disabled={!includeCandles}
              onChange={(e) => setIncludeIndicators(e.target.checked)}
              className="accent-accent disabled:cursor-not-allowed"
            />
            <Database className="w-3.5 h-3.5 text-info" />
            Inject Indicators
          </label>

          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeNews}
              onChange={(e) => setIncludeNews(e.target.checked)}
              className="accent-accent"
            />
            <Newspaper className="w-3.5 h-3.5 text-positive" />
            Inject News
          </label>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">count:</span>
            <input
              type="number"
              min={1}
              max={10}
              value={newsLimit}
              disabled={!includeNews}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setNewsLimit(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 10);
              }}
              className="w-16 bg-black border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Message input — hidden while streaming so focus shifts to the output */}
      {!isStreaming && (
        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="chat-message"
              className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold"
            >
              Message
            </label>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="bg-black border border-border px-1 py-0.5 text-foreground">
                Ctrl+Enter
              </kbd>{' '}
              to send
            </span>
          </div>
          {/* Preset quick fill */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              FAST TEST PRESETS:
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setMessage(preset.prompt)}
                  className="px-2.5 py-1 text-[10px] border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground uppercase transition-colors cursor-pointer"
                >
                  [{preset.label}]
                </button>
              ))}
            </div>
          </div>

          <textarea
            id="chat-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about EURUSD market structure, credit-charged streaming test..."
            className="w-full bg-black border border-border p-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed resize-y"
          />
          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-muted-foreground">
              CHARACTER COUNT:{' '}
              <span className="text-foreground font-bold">{message.length}</span>
              <span className="text-muted-foreground/60"> / {MAX_MESSAGE_CHARS}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim()}
              className="flex items-center gap-2 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              SEND
            </button>
          </div>
        </div>
      )}

      {/* Streaming control — visible while generating */}
      {isStreaming && (
        <div className="border border-negative/40 bg-negative/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-negative font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            STREAMING IN PROGRESS — REASONING &amp; RESPONSE INCOMING
          </div>
          <button
            type="button"
            onClick={handleAbort}
            className="flex items-center gap-2 border border-negative/40 bg-negative/10 hover:bg-negative hover:text-white text-negative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            ABORT STREAM
          </button>
        </div>
      )}

      {/* Credit audit */}
      {(balanceBefore !== null || doneMeta || balanceAfter !== null) && (
        <div className="border border-accent/60 bg-surface p-3 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-accent" /> BALANCE BEFORE:
            <span className="text-foreground font-bold">{balanceBefore ?? '—'}</span>
          </span>
          {doneMeta && (
            <>
              <span className="text-muted-foreground">
                IN: <span className="text-foreground">{doneMeta.inputTokens}</span> | OUT:{' '}
                <span className="text-foreground">{doneMeta.outputTokens}</span>
              </span>
              <span className="text-muted-foreground">
                CHARGED:{' '}
                <span className="text-accent font-bold">{doneMeta.creditsSpent} credits</span>
              </span>
            </>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-positive" /> BALANCE AFTER:
            <span className="text-foreground font-bold">{balanceAfter ?? '—'}</span>
          </span>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="border border-negative/50 bg-negative/10 p-3 text-xs text-negative">
          STREAM_ERROR: {errorMsg}
        </div>
      )}

      {/* Injected context */}
      {injected && (
        <div className="border border-border/80 bg-black/60">
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="w-full p-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-info" />
              <span>VIEW INJECTED CONTEXT</span>
              <span className="text-[10px] text-muted-foreground">
                (candles: {injected.metadata.candlesLoaded}, indicators:{' '}
                {injected.metadata.indicatorsComputed ? 'on' : 'off'}, news:{' '}
                {injected.metadata.newsIncluded})
              </span>
            </div>
            {showContext ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          {showContext && (
            <div className="border-t border-border/40 space-y-4 p-3">
              {/* Candle table */}
              {injected.candles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold flex items-center gap-1.5">
                    <CandlestickChart className="w-3 h-3 text-accent" />
                    OHLC CANDLES ({injected.candles.length})
                  </div>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <TableShell
                      columns={OHLC_COLUMNS}
                      stickyHeader
                      isEmpty={injected.candles.length === 0}
                      emptyMessage="NO CANDLE DATA INJECTED."
                    >
                      {injected.candles.map((c, i) => (
                        <tr key={i} className="hover:bg-surface-hover/80 transition-colors">
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {new Date(c.time * 1000).toISOString().replace('T', ' ').slice(0, 16)}
                          </td>
                          <td className="p-2 tabular-nums">{c.open}</td>
                          <td className="p-2 tabular-nums">{c.high}</td>
                          <td className="p-2 tabular-nums">{c.low}</td>
                          <td className="p-2 tabular-nums">{c.close}</td>
                          <td className="p-2 tabular-nums">{c.volume}</td>
                        </tr>
                      ))}
                    </TableShell>
                  </div>
                </div>
              )}

              {/* News list */}
              {injected.news.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold flex items-center gap-1.5">
                    <Newspaper className="w-3 h-3 text-positive" />
                    INJECTED NEWS ({injected.news.length})
                  </div>
                  <ul className="space-y-1.5">
                    {injected.news.map((n, i) => (
                      <li
                        key={i}
                        className="border border-border/60 bg-black/40 p-2 text-[11px] leading-relaxed"
                      >
                        <div className="text-foreground font-bold">{n.headline}</div>
                        <div className="text-muted-foreground/90">{n.summary}</div>
                        <div className="text-muted-foreground/50 text-[10px]">{n.time}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw context block (exact prompt text sent to the model) */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
                  RAW PROMPT BLOCK
                </div>
                <pre className="p-2 border border-border/60 bg-black/40 text-[11px] text-muted-foreground/90 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
                  {injected.contextBlock}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thinking */}
      {thinking && (
        <div className="border border-border/60 bg-black/60">
          <button
            type="button"
            onClick={() => setShowThinking(!showThinking)}
            className="w-full p-2.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-1.5 text-accent">
              <Brain className="w-3.5 h-3.5" />
              <span>REASONING TRACE</span>
            </div>
            {showThinking ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          {showThinking && (
            <div className="p-3 border-t border-border/40 text-[11px] text-muted-foreground/90 break-words leading-relaxed bg-black/40 max-h-80 overflow-y-auto">
              <Markdown>{thinking}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* Reply */}
      {reply && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
              AGENT RESPONSE OUTPUT
            </div>
            <button
              type="button"
              onClick={() =>
                copy(reply, 'reply', {
                  toastTitle: 'COPIED',
                  toastMessage: 'Agent response copied to clipboard.'
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors cursor-pointer"
            >
              {isCopied('reply') ? (
                <>
                  <Check className="w-3 h-3 text-positive" />
                  <span className="text-positive">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>COPY OUTPUT</span>
                </>
              )}
            </button>
          </div>
          <div className="border border-border bg-black p-4 text-xs font-mono text-foreground break-words leading-relaxed select-text max-h-96 overflow-y-auto">
            <Markdown>{reply}</Markdown>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
