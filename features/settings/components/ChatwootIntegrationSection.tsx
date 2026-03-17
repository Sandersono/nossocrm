'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bot, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useBoards } from '@/context/boards/BoardsContext';
import { useOptionalToast } from '@/context/ToastContext';
import { SettingsSection } from './SettingsSection';
import type { ChatwootIntegration } from '@/types';

type IntegrationForm = {
  name: string;
  baseUrl: string;
  accountId: string;
  apiToken: string;
  active: boolean;
  summaryEnabled: boolean;
  defaultBoardId: string;
  allowedInboxIds: string;
};

function emptyForm(): IntegrationForm {
  return {
    name: 'Chatwoot',
    baseUrl: '',
    accountId: '',
    apiToken: '',
    active: true,
    summaryEnabled: true,
    defaultBoardId: '',
    allowedInboxIds: '',
  };
}

function formFromIntegration(integration: ChatwootIntegration | null): IntegrationForm {
  if (!integration) return emptyForm();
  return {
    name: integration.name || 'Chatwoot',
    baseUrl: integration.baseUrl || '',
    accountId: integration.accountId ? String(integration.accountId) : '',
    apiToken: '',
    active: integration.active,
    summaryEnabled: integration.summaryEnabled,
    defaultBoardId: integration.defaultBoardId ?? '',
    allowedInboxIds: integration.allowedInboxIds.join(', '),
  };
}

export const ChatwootIntegrationSection: React.FC = () => {
  const { boards } = useBoards();
  const { addToast } = useOptionalToast();
  const [integration, setIntegration] = useState<ChatwootIntegration | null>(null);
  const [form, setForm] = useState<IntegrationForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthchecking, setHealthchecking] = useState(false);
  const [processingSummaries, setProcessingSummaries] = useState(false);
  const [origin, setOrigin] = useState('');

  const webhookUrl = useMemo(() => {
    if (!origin || !integration?.webhookToken) return '';
    return `${origin}/api/integrations/chatwoot/webhook/${integration.webhookToken}`;
  }, [integration?.webhookToken, origin]);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/chatwoot', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao carregar integracao');
      const nextIntegration = (body?.integration ?? null) as ChatwootIntegration | null;
      setIntegration(nextIntegration);
      setForm(formFromIntegration(nextIntegration));
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar integracao Chatwoot', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    void loadIntegration();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || 'Chatwoot',
        baseUrl: form.baseUrl.trim(),
        accountId: Number(form.accountId),
        apiToken: form.apiToken.trim() || undefined,
        active: form.active,
        summaryEnabled: form.summaryEnabled,
        defaultBoardId: form.defaultBoardId || null,
        allowedInboxIds: form.allowedInboxIds
          .split(',')
          .map(value => Number(value.trim()))
          .filter(Number.isFinite),
      };

      const response = await fetch('/api/settings/integrations/chatwoot', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao salvar integracao');

      setIntegration(body.integration ?? null);
      setForm(formFromIntegration(body.integration ?? null));
      addToast('Integracao Chatwoot salva.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao salvar integracao', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runHealthcheck = async () => {
    setHealthchecking(true);
    try {
      const response = await fetch('/api/settings/integrations/chatwoot/health', {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha no healthcheck');
      addToast(`Healthcheck OK. ${body.inboxCount ?? 0} inbox(es) detectadas.`, 'success');
      await loadIntegration();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha no healthcheck', 'error');
    } finally {
      setHealthchecking(false);
    }
  };

  const processSummaries = async () => {
    setProcessingSummaries(true);
    try {
      const response = await fetch('/api/integrations/chatwoot/process-summaries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || body?.error || 'Falha ao processar resumos');
      addToast(`Resumos processados: ${body.completedCount ?? 0} concluido(s), ${body.failedCount ?? 0} falha(s).`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao processar resumos', 'error');
    } finally {
      setProcessingSummaries(false);
    }
  };

  return (
    <SettingsSection title="Chatwoot" icon={Bot}>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nome interno</label>
              <input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Chatwoot"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Base URL</label>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm((current) => ({ ...current, baseUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="https://app.chatwoot.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Account ID</label>
              <input
                value={form.accountId}
                onChange={(e) => setForm((current) => ({ ...current, accountId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Token administrativo</label>
              <input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm((current) => ({ ...current, apiToken: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder={integration?.hasApiToken ? 'Token salvo. Preencha apenas para trocar.' : 'Cole o token do Chatwoot'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Board padrao</label>
              <select
                value={form.defaultBoardId}
                onChange={(e) => setForm((current) => ({ ...current, defaultBoardId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">Sem board padrao</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Inbox IDs permitidos</label>
              <input
                value={form.allowedInboxIds}
                onChange={(e) => setForm((current) => ({ ...current, allowedInboxIds: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="1, 2, 5"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))}
              />
              Integracao ativa
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.summaryEnabled}
                onChange={(e) => setForm((current) => ({ ...current, summaryEnabled: e.target.checked }))}
              />
              Resumo automatico por IA
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar integracao
            </button>
            <button
              type="button"
              onClick={runHealthcheck}
              disabled={healthchecking || loading || !integration}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {healthchecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Testar conexao
            </button>
            <button
              type="button"
              onClick={processSummaries}
              disabled={processingSummaries || loading || !integration}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {processingSummaries ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Processar resumos pendentes
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Status</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {loading ? 'Carregando...' : integration ? (integration.active ? 'Ativa' : 'Inativa') : 'Nao configurada'}
            </div>
            {integration?.lastHealthcheckStatus ? (
              <div className="mt-1 text-xs text-slate-500">
                Ultimo healthcheck: {integration.lastHealthcheckStatus} {integration.lastHealthcheckAt ? `em ${new Date(integration.lastHealthcheckAt).toLocaleString('pt-BR')}` : ''}
              </div>
            ) : null}
            {integration?.lastHealthcheckError ? (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {integration.lastHealthcheckError}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Webhook do CRM</div>
            <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200 break-all">
              {webhookUrl || 'Salve a integracao para gerar o webhook.'}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Credenciais</div>
            <div className="mt-2 text-xs text-slate-500">
              Token salvo: {integration?.hasApiToken ? 'sim' : 'nao'}
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
};
