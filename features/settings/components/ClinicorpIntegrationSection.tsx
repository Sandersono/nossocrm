'use client';

import React, { useEffect, useState } from 'react';
import { Plug, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useOptionalToast } from '@/context/ToastContext';
import type { ClinicorpIntegration } from '@/types';
import { SettingsSection } from './SettingsSection';

type IntegrationForm = {
  name: string;
  baseUrl: string;
  apiUsername: string;
  apiToken: string;
  subscriberId: string;
  active: boolean;
  syncBusinesses: boolean;
  syncProfessionals: boolean;
  syncPatients: boolean;
  syncAppointments: boolean;
  syncEstimates: boolean;
  syncFinancialSummary: boolean;
  enablePurchaseOrders: boolean;
};

function emptyForm(): IntegrationForm {
  return {
    name: 'Clinicorp',
    baseUrl: 'https://api.clinicorp.com/rest/v1',
    apiUsername: '',
    apiToken: '',
    subscriberId: '',
    active: true,
    syncBusinesses: true,
    syncProfessionals: true,
    syncPatients: false,
    syncAppointments: true,
    syncEstimates: true,
    syncFinancialSummary: true,
    enablePurchaseOrders: false,
  };
}

function formFromIntegration(integration: ClinicorpIntegration | null): IntegrationForm {
  if (!integration) return emptyForm();
  return {
    name: integration.name || 'Clinicorp',
    baseUrl: integration.baseUrl || 'https://api.clinicorp.com/rest/v1',
    apiUsername: integration.apiUsername || '',
    apiToken: '',
    subscriberId: integration.subscriberId || '',
    active: integration.active,
    syncBusinesses: integration.syncBusinesses,
    syncProfessionals: integration.syncProfessionals,
    syncPatients: integration.syncPatients,
    syncAppointments: integration.syncAppointments,
    syncEstimates: integration.syncEstimates,
    syncFinancialSummary: integration.syncFinancialSummary,
    enablePurchaseOrders: integration.enablePurchaseOrders,
  };
}

export const ClinicorpIntegrationSection: React.FC = () => {
  const { addToast } = useOptionalToast();
  const [integration, setIntegration] = useState<ClinicorpIntegration | null>(null);
  const [form, setForm] = useState<IntegrationForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthchecking, setHealthchecking] = useState(false);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/clinicorp', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao carregar integracao');
      const nextIntegration = (body?.integration ?? null) as ClinicorpIntegration | null;
      setIntegration(nextIntegration);
      setForm(formFromIntegration(nextIntegration));
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar integracao Clinicorp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIntegration();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim() || 'Clinicorp',
        baseUrl: form.baseUrl.trim() || 'https://api.clinicorp.com/rest/v1',
        apiUsername: form.apiUsername.trim(),
        apiToken: form.apiToken.trim() || undefined,
        subscriberId: form.subscriberId.trim(),
      };

      const response = await fetch('/api/settings/integrations/clinicorp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao salvar integracao');

      setIntegration(body.integration ?? null);
      setForm(formFromIntegration(body.integration ?? null));
      addToast('Integracao Clinicorp salva.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao salvar integracao Clinicorp', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runHealthcheck = async () => {
    setHealthchecking(true);
    try {
      const response = await fetch('/api/settings/integrations/clinicorp/health', {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha no healthcheck');
      addToast(`Healthcheck OK. ${body.businessCount ?? 0} clinica(s) acessiveis.`, 'success');
      await loadIntegration();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha no healthcheck Clinicorp', 'error');
    } finally {
      setHealthchecking(false);
    }
  };

  return (
    <SettingsSection title="Clinicorp" icon={Plug}>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nome interno</label>
              <input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Clinicorp"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Base URL</label>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm((current) => ({ ...current, baseUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="https://api.clinicorp.com/rest/v1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">ID de acesso</label>
              <input
                value={form.apiUsername}
                onChange={(e) => setForm((current) => ({ ...current, apiUsername: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Seu username da API"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Token da API</label>
              <input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm((current) => ({ ...current, apiToken: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder={integration?.hasApiToken ? 'Token salvo. Preencha apenas para trocar.' : 'Cole o token da API'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Subscriber ID</label>
              <input
                value={form.subscriberId}
                onChange={(e) => setForm((current) => ({ ...current, subscriberId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="ID do assinante"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Escopo inicial do modulo</div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['active', 'Integracao ativa'],
                ['syncBusinesses', 'Sincronizar clinicas'],
                ['syncProfessionals', 'Sincronizar profissionais'],
                ['syncPatients', 'Sincronizar pacientes vinculados'],
                ['syncAppointments', 'Sincronizar agendamentos'],
                ['syncEstimates', 'Sincronizar orcamentos'],
                ['syncFinancialSummary', 'Sincronizar resumo financeiro'],
                ['enablePurchaseOrders', 'Habilitar ordens de compra'],
              ].map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof IntegrationForm])}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
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
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Status</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {loading ? 'Carregando...' : integration ? (integration.active ? 'Ativa' : 'Inativa') : 'Nao configurada'}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Ultimo healthcheck</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {integration?.lastHealthcheckAt ? new Date(integration.lastHealthcheckAt).toLocaleString('pt-BR') : 'Ainda nao executado'}
            </div>
            {integration?.lastHealthcheckStatus ? (
              <div className="mt-1 text-xs text-slate-500">Status: {integration.lastHealthcheckStatus}</div>
            ) : null}
            {integration?.lastHealthcheckError ? (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {integration.lastHealthcheckError}
              </div>
            ) : null}
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
