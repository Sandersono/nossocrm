'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useBoards } from '@/context/boards/BoardsContext';
import { useOptionalToast } from '@/context/ToastContext';
import type { ChatwootIntegration, ChatwootLabelMapping } from '@/types';
import { SettingsSection } from './SettingsSection';

type MappingForm = {
  id?: string;
  label: string;
  inboxId: string;
  boardId: string;
  stageId: string;
  markWon: boolean;
  markLost: boolean;
  createActivity: boolean;
  activityTitleTemplate: string;
  requireSingleOpenDeal: boolean;
  active: boolean;
};

function emptyForm(): MappingForm {
  return {
    label: '',
    inboxId: '',
    boardId: '',
    stageId: '',
    markWon: false,
    markLost: false,
    createActivity: false,
    activityTitleTemplate: '',
    requireSingleOpenDeal: true,
    active: true,
  };
}

function formFromMapping(mapping: ChatwootLabelMapping): MappingForm {
  return {
    id: mapping.id,
    label: mapping.label,
    inboxId: mapping.inboxId == null ? '' : String(mapping.inboxId),
    boardId: mapping.boardId ?? '',
    stageId: mapping.stageId ?? '',
    markWon: mapping.markWon,
    markLost: mapping.markLost,
    createActivity: mapping.createActivity,
    activityTitleTemplate: mapping.activityTitleTemplate ?? '',
    requireSingleOpenDeal: mapping.requireSingleOpenDeal,
    active: mapping.active,
  };
}

export const ChatwootLabelMappingsSection: React.FC = () => {
  const { boards } = useBoards();
  const { addToast } = useOptionalToast();
  const [integration, setIntegration] = useState<ChatwootIntegration | null>(null);
  const [mappings, setMappings] = useState<ChatwootLabelMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<MappingForm>(emptyForm());

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === form.boardId) ?? null,
    [boards, form.boardId]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [integrationResponse, mappingsResponse] = await Promise.all([
        fetch('/api/settings/integrations/chatwoot', { credentials: 'include' }),
        fetch('/api/settings/integrations/chatwoot/mappings', { credentials: 'include' }),
      ]);

      const integrationBody = await integrationResponse.json().catch(() => ({}));
      const mappingsBody = await mappingsResponse.json().catch(() => ({}));

      if (!integrationResponse.ok) throw new Error(integrationBody?.error || 'Falha ao carregar integracao Chatwoot');
      if (!mappingsResponse.ok) throw new Error(mappingsBody?.error || 'Falha ao carregar mappings');

      setIntegration((integrationBody.integration ?? null) as ChatwootIntegration | null);
      setMappings(Array.isArray(mappingsBody.mappings) ? mappingsBody.mappings : []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao carregar mappings do Chatwoot', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!integration?.id) {
      addToast('Salve a integracao do Chatwoot antes de criar regras.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/integrations/chatwoot/mappings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          integrationId: integration.id,
          inboxId: form.inboxId ? Number(form.inboxId) : null,
          label: form.label,
          boardId: form.boardId || null,
          stageId: form.stageId || null,
          markWon: form.markWon,
          markLost: form.markLost,
          createActivity: form.createActivity,
          activityTitleTemplate: form.activityTitleTemplate || null,
          requireSingleOpenDeal: form.requireSingleOpenDeal,
          active: form.active,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao salvar mapping');

      addToast('Regra de label salva.', 'success');
      setForm(emptyForm());
      await load();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao salvar mapping', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (mappingId: string) => {
    setDeletingId(mappingId);
    try {
      const response = await fetch(`/api/settings/integrations/chatwoot/mappings?id=${encodeURIComponent(mappingId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Falha ao excluir mapping');
      addToast('Regra removida.', 'success');
      await load();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Falha ao excluir mapping', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SettingsSection title="Regras de Labels" icon={ArrowRightLeft}>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {form.id ? 'Editar regra' : 'Nova regra'}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Label do Chatwoot</label>
            <input
              value={form.label}
              onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="qualificado"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Inbox ID opcional</label>
            <input
              value={form.inboxId}
              onChange={(e) => setForm((current) => ({ ...current, inboxId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="1"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Board</label>
            <select
              value={form.boardId}
              onChange={(e) => setForm((current) => ({ ...current, boardId: e.target.value, stageId: '' }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">Sem board especifico</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Stage</label>
            <select
              value={form.stageId}
              onChange={(e) => setForm((current) => ({ ...current, stageId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">Sem mudanca de etapa</option>
              {(selectedBoard?.stages || []).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Titulo da activity</label>
            <input
              value={form.activityTitleTemplate}
              onChange={(e) => setForm((current) => ({ ...current, activityTitleTemplate: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="Chatwoot: {{labels}}"
            />
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/10">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.markWon}
                onChange={(e) => setForm((current) => ({ ...current, markWon: e.target.checked, markLost: e.target.checked ? false : current.markLost }))}
              />
              Marcar deal como ganho
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.markLost}
                onChange={(e) => setForm((current) => ({ ...current, markLost: e.target.checked, markWon: e.target.checked ? false : current.markWon }))}
              />
              Marcar deal como perdido
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.createActivity}
                onChange={(e) => setForm((current) => ({ ...current, createActivity: e.target.checked }))}
              />
              Criar activity operacional
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.requireSingleOpenDeal}
                onChange={(e) => setForm((current) => ({ ...current, requireSingleOpenDeal: e.target.checked }))}
              />
              Exigir deal unico em aberto
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))}
              />
              Regra ativa
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {form.id ? 'Salvar alteracoes' : 'Criar regra'}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(emptyForm())}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Regras cadastradas</div>
              <div className="text-xs text-slate-500">Cada label pode movimentar o pipeline e registrar contexto.</div>
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

          {!integration ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
              Salve a integracao Chatwoot antes de criar regras.
            </div>
          ) : mappings.length === 0 && !loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              Nenhuma regra cadastrada ainda.
            </div>
          ) : (
            mappings.map((mapping) => (
              <article
                key={mapping.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{mapping.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Inbox: {mapping.inboxId ?? 'qualquer'} · Board: {boards.find((board) => board.id === mapping.boardId)?.name || 'padrao/nao definido'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(formFromMapping(mapping))}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      title="Editar regra"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void remove(mapping.id);
                      }}
                      disabled={deletingId === mapping.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                      title="Excluir regra"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {mapping.stageId ? (
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200">
                      Move stage
                    </span>
                  ) : null}
                  {mapping.markWon ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Mark won
                    </span>
                  ) : null}
                  {mapping.markLost ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                      Mark lost
                    </span>
                  ) : null}
                  {mapping.createActivity ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                      Activity
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {mapping.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </SettingsSection>
  );
};
