import React from 'react';
import { MessageSquareText, RefreshCw, Tags } from 'lucide-react';
import type { ChatwootConversationHistoryItem } from '@/types';

type Variant = 'light' | 'dark';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleString('pt-BR');
}

export function ChatwootHistoryList({
  history,
  loading,
  error,
  onRefresh,
  emptyMessage = 'Nenhuma conversa do Chatwoot encontrada.',
  variant = 'light',
}: {
  history: ChatwootConversationHistoryItem[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  emptyMessage?: string;
  variant?: Variant;
}) {
  const dark = variant === 'dark';

  return (
    <div className={cx('rounded-2xl border', dark ? 'border-white/10 bg-white/3' : 'border-slate-200 bg-slate-50/70')}>
      <div className={cx('flex items-center justify-between gap-3 border-b px-4 py-3', dark ? 'border-white/10' : 'border-slate-200')}>
        <div className="flex items-center gap-2">
          <div className={cx('rounded-xl p-2', dark ? 'bg-cyan-500/10 text-cyan-200' : 'bg-cyan-100 text-cyan-700')}>
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div>
            <div className={cx('text-sm font-semibold', dark ? 'text-slate-100' : 'text-slate-900')}>Historico Chatwoot</div>
            <div className={cx('text-xs', dark ? 'text-slate-500' : 'text-slate-500')}>Conversa resolvida, resumo e transcript comercial.</div>
          </div>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className={cx(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold',
              dark
                ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
          >
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </button>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        {loading ? (
          <div className={cx('text-sm', dark ? 'text-slate-400' : 'text-slate-500')}>Carregando historico...</div>
        ) : error ? (
          <div className={cx('rounded-xl border px-3 py-2 text-sm', dark ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700')}>
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className={cx('text-sm', dark ? 'text-slate-400' : 'text-slate-500')}>{emptyMessage}</div>
        ) : (
          history.map((item) => (
            <article
              key={item.snapshot.id}
              className={cx(
                'rounded-2xl border p-4',
                dark ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className={cx('text-sm font-semibold', dark ? 'text-slate-100' : 'text-slate-900')}>
                    Conversa #{item.snapshot.chatwootConversationId}
                  </div>
                  <div className={cx('mt-1 text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>
                    Resolvida em {formatDateTime(item.snapshot.resolvedAt || item.snapshot.createdAt)}
                  </div>
                </div>
                <div className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold', dark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-100 text-emerald-700')}>
                  {item.summary?.status === 'completed'
                    ? 'Resumo pronto'
                    : item.summary?.status === 'failed'
                      ? 'Resumo falhou'
                      : item.summary?.status === 'processing'
                        ? 'Resumindo'
                        : 'Resumo pendente'}
                </div>
              </div>

              {item.snapshot.labels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.snapshot.labels.map((label) => (
                    <span
                      key={`${item.snapshot.id}-${label}`}
                      className={cx(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        dark ? 'bg-white/5 text-slate-200 ring-1 ring-white/10' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                      )}
                    >
                      <Tags className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              {item.summary?.summaryText ? (
                <div className={cx('mt-3 rounded-xl border p-3', dark ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50')}>
                  <div className={cx('text-[11px] font-semibold uppercase tracking-wide', dark ? 'text-cyan-200' : 'text-cyan-700')}>
                    Resumo executivo
                  </div>
                  <p className={cx('mt-2 text-sm leading-relaxed', dark ? 'text-slate-100' : 'text-slate-700')}>
                    {item.summary.summaryText}
                  </p>
                  {item.summary.nextSteps.length > 0 ? (
                    <div className={cx('mt-2 text-xs', dark ? 'text-cyan-100' : 'text-cyan-800')}>
                      Proximos passos: {item.summary.nextSteps.join(' | ')}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <details className="mt-3">
                <summary className={cx('cursor-pointer text-xs font-semibold', dark ? 'text-slate-300' : 'text-slate-700')}>
                  Ver transcript ({item.snapshot.transcriptMessageCount} mensagens)
                </summary>
                <pre
                  className={cx(
                    'mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-xs',
                    dark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                  )}
                >
                  {item.snapshot.transcriptText}
                </pre>
              </details>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
