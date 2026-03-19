'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOptionalToast } from '@/context/ToastContext';
import type { ClinicorpDiagnosticItem } from '@/types';
import { SettingsSection } from './SettingsSection';

function badgeClass(status: string) {
  if (status === 'completed' || status === 'reprocessed') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (status === 'failed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200';
  }
  if (status === 'processing') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200';
}

export const ClinicorpEventsSection: React.FC = () => {
  const { addToast } = useOptionalToast();
  const [items, setItems] = useState<ClinicorpDiagnosticItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/clinicorp/logs?limit=40', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao carregar logs');
      setItems(Array.isArray(body.items) ? body.items : []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar logs do Clinicorp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <SettingsSection title="Diagnostico Clinicorp" icon={Activity}>
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Historico operacional</div>
            <div className="text-xs text-slate-500">Ultimos syncs e acoes outbound do modulo Clinicorp.</div>
          </div>
          <button
            type="button"
            onClick={() => { void load(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Atualizar
          </button>
        </div>

        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            Nenhuma execucao registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.kind === 'sync' ? `Sync: ${item.syncType}` : `Outbound: ${item.actionType}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">ID</div>
                    <div className="mt-1 break-all text-slate-700 dark:text-slate-200">{item.id}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">Referencia</div>
                    <div className="mt-1 text-slate-700 dark:text-slate-200">
                      {item.kind === 'sync'
                        ? `${item.dateFrom ?? 'sem data'} ate ${item.dateTo ?? 'sem data'}`
                        : item.dedupeKey}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-black/10">
                    <div className="font-semibold text-slate-500">Resultado</div>
                    <div className="mt-1 break-all text-slate-700 dark:text-slate-200">
                      {JSON.stringify(item.kind === 'sync' ? item.resultSummary : item.responsePayload)}
                    </div>
                  </div>
                </div>

                {item.errorMessage ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="inline-flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Diagnostico
                    </div>
                    <div className="mt-1">{item.errorMessage}</div>
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
