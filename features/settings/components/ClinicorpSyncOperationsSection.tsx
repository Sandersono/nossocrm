'use client';

import React, { useEffect, useState } from 'react';
import { Play, RefreshCw, Send, ShoppingCart } from 'lucide-react';
import { useOptionalToast } from '@/context/ToastContext';
import type { ClinicorpIntegration } from '@/types';
import { SettingsSection } from './SettingsSection';

const defaultProductsJson = JSON.stringify([
  {
    code: 'PROD001',
    name: 'Produto de exemplo',
    quantity: 1,
    unitPrice: 100,
    unitOfMeasurement: 'UN',
  },
], null, 2);

export const ClinicorpSyncOperationsSection: React.FC = () => {
  const { addToast } = useOptionalToast();
  const [integration, setIntegration] = useState<ClinicorpIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushingLead, setPushingLead] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [syncTypes, setSyncTypes] = useState<string[]>(['businesses', 'professionals']);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [contactIds, setContactIds] = useState('');
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    boardName: '',
    notes: '',
  });
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    clinic: '',
    orderCode: '',
    orderDate: '',
    productsJson: defaultProductsJson,
  });

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/clinicorp', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao carregar integracao Clinicorp');
      setIntegration((body?.integration ?? null) as ClinicorpIntegration | null);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar integracao Clinicorp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIntegration();
  }, []);

  const toggleSyncType = (value: string) => {
    setSyncTypes((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/clinicorp/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          syncTypes,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          businessId: businessId || null,
          contactIds: contactIds.split(',').map((value) => value.trim()).filter(Boolean),
          includeCanceled: false,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao executar sync');
      addToast(`Sync concluido. Resultado: ${JSON.stringify(body.summary ?? {})}`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao executar sync Clinicorp', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const pushLead = async () => {
    setPushingLead(true);
    try {
      const response = await fetch('/api/integrations/clinicorp/push-lead', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...leadForm,
          boardName: leadForm.boardName || null,
          notes: leadForm.notes || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao enviar lead');
      addToast('Lead enviado ao Clinicorp.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao enviar lead ao Clinicorp', 'error');
    } finally {
      setPushingLead(false);
    }
  };

  const createPurchaseOrder = async () => {
    setCreatingOrder(true);
    try {
      const products = JSON.parse(purchaseOrderForm.productsJson);
      const response = await fetch('/api/integrations/clinicorp/purchase-orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clinic: purchaseOrderForm.clinic,
          orderCode: purchaseOrderForm.orderCode,
          orderDate: purchaseOrderForm.orderDate,
          products,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao criar ordem de compra');
      addToast('Ordem de compra enviada ao Clinicorp.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao criar ordem de compra', 'error');
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <SettingsSection title="Operacoes Clinicorp" icon={Play}>
      <div className="mt-5 space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {loading ? 'Carregando integracao...' : integration ? 'Integracao pronta para operacoes manuais.' : 'Configure a integracao antes de usar as operacoes.'}
          </div>
          <button
            type="button"
            onClick={() => { void loadIntegration(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Atualizar
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Sync manual</div>
            <div className="mt-1 text-xs text-slate-500">Use para puxar dados operacionais do Clinicorp para o CRM.</div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                {[
                  ['businesses', 'Clinicas'],
                  ['professionals', 'Profissionais'],
                  ['patients', 'Pacientes vinculados'],
                  ['appointments', 'Agendamentos'],
                  ['estimates', 'Orcamentos'],
                  ['financial_summary', 'Resumo financeiro'],
                ].map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={syncTypes.includes(value)} onChange={() => toggleSyncType(value)} />
                    {label}
                  </label>
                ))}
              </div>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Business/clinic ID"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <textarea
                value={contactIds}
                onChange={(e) => setContactIds(e.target.value)}
                placeholder="UUIDs de contatos separados por virgula para sync de pacientes"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <button
                type="button"
                onClick={runSync}
                disabled={!integration || syncing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Rodar sync
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Push de lead</div>
            <div className="mt-1 text-xs text-slate-500">Envia um lead do CRM para campanhas do Clinicorp.</div>
            <div className="mt-4 grid gap-3">
              <input value={leadForm.name} onChange={(e) => setLeadForm((current) => ({ ...current, name: e.target.value }))} placeholder="Nome" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <input value={leadForm.email} onChange={(e) => setLeadForm((current) => ({ ...current, email: e.target.value }))} placeholder="E-mail" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <input value={leadForm.phone} onChange={(e) => setLeadForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <input value={leadForm.boardName} onChange={(e) => setLeadForm((current) => ({ ...current, boardName: e.target.value }))} placeholder="Campanha/Board" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <textarea value={leadForm.notes} onChange={(e) => setLeadForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Observacoes" rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <button
                type="button"
                onClick={pushLead}
                disabled={!integration || pushingLead}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {pushingLead ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar lead
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Ordem de compra</div>
            <div className="mt-1 text-xs text-slate-500">Trilha operacional opcional para `products/orders`.</div>
            <div className="mt-4 grid gap-3">
              <input value={purchaseOrderForm.clinic} onChange={(e) => setPurchaseOrderForm((current) => ({ ...current, clinic: e.target.value }))} placeholder="CNPJ da clinica" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <input value={purchaseOrderForm.orderCode} onChange={(e) => setPurchaseOrderForm((current) => ({ ...current, orderCode: e.target.value }))} placeholder="Codigo da ordem" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <input type="date" value={purchaseOrderForm.orderDate} onChange={(e) => setPurchaseOrderForm((current) => ({ ...current, orderDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <textarea value={purchaseOrderForm.productsJson} onChange={(e) => setPurchaseOrderForm((current) => ({ ...current, productsJson: e.target.value }))} rows={8} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
              <button
                type="button"
                onClick={createPurchaseOrder}
                disabled={!integration || creatingOrder || !integration?.enablePurchaseOrders}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {creatingOrder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Criar ordem
              </button>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
};
