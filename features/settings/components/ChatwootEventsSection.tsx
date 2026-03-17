'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { useOptionalToast } from '@/context/ToastContext';
import type { ChatwootEventLog } from '@/types';
import { SettingsSection } from './SettingsSection';

function badgeClass(status: ChatwootEventLog['processingStatus']) {
  if (status === 'processed' || status === 'reprocessed') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (status === 'failed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200';
  }
  if (status === 'ignored') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200';
}

export const ChatwootEventsSection: React.FC = () => {
  const { addToast } = useOptionalToast();
  const [events, setEvents] = useState<ChatwootEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/chatwoot/events?limit=50', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao carregar eventos');
      setEvents(Array.isArray(body.events) ? body.events : []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar eventos do Chatwoot', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const replay = async (eventLogId: string) => {
    setReplayingId(eventLogId);
    try {
      const response = await fetch('/api/settings/integrations/chatwoot/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventLogId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao reprocessar evento');
      addToast('Evento reprocessado.', 'success');
      await load();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao reprocessar evento', 'error');
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <SettingsSection title="Operacao e Replay" icon={Activity}>
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Eventos inbound do Chatwoot</div>
            <div className="text-xs text-slate-500">Visibilidade operacional para dedupe, falhas e replay seguro.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Atualizar
          </button>
        </div>

        {events.length === 0 && !loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{event.eventType}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Conversa: {event.chatwootConversationId ?? 'n/a'} · Recebido em {new Date(event.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(event.processingStatus)}`}>
                      {event.processingStatus}
                    </span>
                    {(event.processingStatus === 'failed' || event.processingStatus === 'ignored') ? (
                      <button
                        type="button"
                        onClick={() => {
                          void replay(event.id);
                        }}
                        disabled={replayingId === event.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        {replayingId === event.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Replay
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">Fingerprint</div>
                    <div className="mt-1 break-all text-slate-700 dark:text-slate-200">{event.eventFingerprint}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">Rule / Snapshot</div>
                    <div className="mt-1 text-slate-700 dark:text-slate-200">
                      {event.appliedRuleId ? `Rule ${event.appliedRuleId}` : 'Sem rule'} · {event.createdSnapshotId ? `Snapshot ${event.createdSnapshotId}` : 'Sem snapshot'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">Processado em</div>
                    <div className="mt-1 text-slate-700 dark:text-slate-200">
                      {event.processedAt ? new Date(event.processedAt).toLocaleString('pt-BR') : 'Ainda nao processado'}
                    </div>
                  </div>
                </div>

                {event.processingError ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="inline-flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Diagnostico
                    </div>
                    <div className="mt-1">{event.processingError}</div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </SettingsSection>
  );
};
