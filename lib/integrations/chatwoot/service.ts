import { randomBytes } from 'node:crypto';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { normalizeEmail, normalizePhone, normalizeText } from '@/lib/public-api/sanitize';
import { buildChatwootEventFingerprint, isResolutionLikeStatus, normalizeChatwootWebhookPayload } from './events';
import { fetchChatwootConversationMessages, runChatwootHealthcheck } from './client';
import { decryptSecret, encryptSecret } from './secrets';
import type {
  ChatwootIntegrationUpsertInput,
  ChatwootLabelMappingInput,
  ChatwootWebhookNormalized,
} from './schemas';

function nowIso() {
  return new Date().toISOString();
}

function generateWebhookToken() {
  return randomBytes(24).toString('hex');
}

function mapIntegration(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    baseUrl: row.base_url,
    accountId: Number(row.account_id),
    active: Boolean(row.active),
    summaryEnabled: Boolean(row.summary_enabled),
    defaultBoardId: row.default_board_id ?? null,
    allowedInboxIds: Array.isArray(row.allowed_inbox_ids) ? row.allowed_inbox_ids.map((value: any) => Number(value)).filter(Number.isFinite) : [],
    hasApiToken: Boolean(row.api_token_ciphertext),
    webhookToken: row.webhook_token,
    lastHealthcheckAt: row.last_healthcheck_at ?? null,
    lastHealthcheckStatus: row.last_healthcheck_status ?? null,
    lastHealthcheckError: row.last_healthcheck_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLabelMapping(row: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    integrationId: row.integration_id,
    inboxId: row.inbox_id == null ? null : Number(row.inbox_id),
    label: row.label,
    boardId: row.board_id ?? null,
    stageId: row.stage_id ?? null,
    markWon: Boolean(row.mark_won),
    markLost: Boolean(row.mark_lost),
    createActivity: Boolean(row.create_activity),
    activityTitleTemplate: row.activity_title_template ?? null,
    requireSingleOpenDeal: Boolean(row.require_single_open_deal),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshot(row: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    integrationId: row.integration_id,
    chatwootConversationId: Number(row.chatwoot_conversation_id),
    chatwootInboxId: row.chatwoot_inbox_id == null ? null : Number(row.chatwoot_inbox_id),
    contactId: row.contact_id ?? null,
    dealId: row.deal_id ?? null,
    status: row.status,
    labels: Array.isArray(row.labels) ? row.labels.filter((value: unknown) => typeof value === 'string') : [],
    assigneeExternalId: row.assignee_external_id == null ? null : Number(row.assignee_external_id),
    firstMessageAt: row.first_message_at ?? null,
    resolvedAt: row.resolved_at ?? null,
    transcriptText: row.transcript_text ?? '',
    transcriptMessageCount: Number(row.transcript_message_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSummary(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    snapshotId: row.snapshot_id,
    status: row.status,
    summaryText: row.summary_text ?? null,
    keyTopics: Array.isArray(row.key_topics) ? row.key_topics.filter((value: unknown) => typeof value === 'string') : [],
    customerIntent: row.customer_intent ?? null,
    nextSteps: Array.isArray(row.next_steps) ? row.next_steps.filter((value: unknown) => typeof value === 'string') : [],
    sentiment: row.sentiment ?? null,
    failureReason: row.failure_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at ?? null,
  };
}

function mapEventLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    integrationId: row.integration_id,
    eventType: row.event_type,
    eventFingerprint: row.event_fingerprint,
    chatwootEventId: row.chatwoot_event_id ?? null,
    chatwootConversationId: row.chatwoot_conversation_id == null ? null : Number(row.chatwoot_conversation_id),
    processingStatus: row.processing_status,
    processingError: row.processing_error ?? null,
    appliedRuleId: row.applied_rule_id ?? null,
    createdSnapshotId: row.created_snapshot_id ?? null,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
  };
}

export async function getChatwootIntegrationForOrg(organizationId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return mapIntegration(data);
}

export async function upsertChatwootIntegration(organizationId: string, input: ChatwootIntegrationUpsertInput) {
  const admin = createStaticAdminClient();
  const existing = await getChatwootIntegrationForOrg(organizationId);
  const updates: Record<string, unknown> = {
    organization_id: organizationId,
    name: input.name,
    base_url: input.baseUrl.replace(/\/+$/, ''),
    account_id: input.accountId,
    active: input.active,
    summary_enabled: input.summaryEnabled,
    default_board_id: input.defaultBoardId ?? null,
    allowed_inbox_ids: input.allowedInboxIds,
    updated_at: nowIso(),
  };

  if (!existing) {
    if (!input.apiToken) {
      throw new Error('apiToken is required to create a Chatwoot integration');
    }
    updates.api_token_ciphertext = encryptSecret(input.apiToken);
    updates.webhook_token = generateWebhookToken();
    updates.created_at = nowIso();
  } else if (input.apiToken) {
    updates.api_token_ciphertext = encryptSecret(input.apiToken);
  }

  const { data, error } = await admin
    .from('chatwoot_integrations')
    .upsert(updates, { onConflict: 'organization_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapIntegration(data);
}

export async function healthcheckChatwootIntegration(organizationId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Chatwoot integration not configured');

  try {
    const result = await runChatwootHealthcheck({
      baseUrl: data.base_url,
      accountId: Number(data.account_id),
      apiToken: decryptSecret(String(data.api_token_ciphertext)),
    });
    await admin
      .from('chatwoot_integrations')
      .update({
        last_healthcheck_at: nowIso(),
        last_healthcheck_status: 'ok',
        last_healthcheck_error: null,
        updated_at: nowIso(),
      })
      .eq('id', data.id);

    return { ok: true as const, inboxCount: result.inboxCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Chatwoot error';
    const status = /401|403|unauthorized/i.test(message) ? 'unauthorized' : 'failed';
    await admin
      .from('chatwoot_integrations')
      .update({
        last_healthcheck_at: nowIso(),
        last_healthcheck_status: status,
        last_healthcheck_error: message,
        updated_at: nowIso(),
      })
      .eq('id', data.id);

    throw err;
  }
}

export async function listChatwootLabelMappings(organizationId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_label_mappings')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapLabelMapping);
}

export async function upsertChatwootLabelMapping(organizationId: string, input: ChatwootLabelMappingInput) {
  const admin = createStaticAdminClient();
  const payload = {
    id: input.id,
    organization_id: organizationId,
    integration_id: input.integrationId,
    inbox_id: input.inboxId ?? null,
    label: input.label.trim(),
    board_id: input.boardId ?? null,
    stage_id: input.stageId ?? null,
    mark_won: input.markWon,
    mark_lost: input.markLost,
    create_activity: input.createActivity,
    activity_title_template: input.activityTitleTemplate ?? null,
    require_single_open_deal: input.requireSingleOpenDeal,
    active: input.active,
    updated_at: nowIso(),
    created_at: nowIso(),
  };

  const { data, error } = await admin
    .from('chatwoot_label_mappings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapLabelMapping(data);
}

export async function deleteChatwootLabelMapping(organizationId: string, mappingId: string) {
  const admin = createStaticAdminClient();
  const { error } = await admin
    .from('chatwoot_label_mappings')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', mappingId);

  if (error) throw error;
}

export async function listChatwootEventLogs(organizationId: string, limit = 50) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_event_logs')
    .select(
      'id,event_type,event_fingerprint,chatwoot_event_id,chatwoot_conversation_id,processing_status,processing_error,created_at,processed_at,integration_id,organization_id,applied_rule_id,created_snapshot_id'
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapEventLog);
}

export async function listChatwootConversationHistory(
  organizationId: string,
  filters: { contactId?: string; dealId?: string; limit?: number }
) {
  const admin = createStaticAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  let query = admin
    .from('chatwoot_conversation_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('resolved_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.contactId) query = query.eq('contact_id', filters.contactId);
  if (filters.dealId) query = query.eq('deal_id', filters.dealId);

  const { data, error } = await query;
  if (error) throw error;

  const snapshots = (data || []).map(mapSnapshot);
  if (snapshots.length === 0) return [];

  const snapshotIds = snapshots.map(snapshot => snapshot.id);
  const { data: summaries, error: summariesError } = await admin
    .from('chatwoot_conversation_summaries')
    .select('*')
    .eq('organization_id', organizationId)
    .in('snapshot_id', snapshotIds);

  if (summariesError) throw summariesError;

  const summariesBySnapshotId = new Map(
    (summaries || []).map(row => [String(row.snapshot_id), mapSummary(row)])
  );

  return snapshots.map(snapshot => ({
    snapshot,
    summary: summariesBySnapshotId.get(snapshot.id) ?? null,
  }));
}

export async function listPendingChatwootSummaries(organizationId: string, limit = 10) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_conversation_summaries')
    .select('*, snapshot:chatwoot_conversation_snapshots(*)')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'failed'])
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    summary: mapSummary(row),
    snapshot: row.snapshot ? mapSnapshot(row.snapshot) : null,
  }));
}

export async function markChatwootSummaryProcessing(organizationId: string, summaryId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_conversation_summaries')
    .update({
      status: 'processing',
      failure_reason: null,
      updated_at: nowIso(),
    })
    .eq('organization_id', organizationId)
    .eq('id', summaryId)
    .select('*')
    .single();

  if (error) throw error;
  return mapSummary(data);
}

export async function completeChatwootSummary(
  organizationId: string,
  summaryId: string,
  payload: {
    summaryText: string;
    keyTopics: string[];
    customerIntent?: string | null;
    nextSteps: string[];
    sentiment?: string | null;
  }
) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_conversation_summaries')
    .update({
      status: 'completed',
      summary_text: payload.summaryText,
      key_topics: payload.keyTopics,
      customer_intent: payload.customerIntent ?? null,
      next_steps: payload.nextSteps,
      sentiment: payload.sentiment ?? null,
      failure_reason: null,
      processed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('organization_id', organizationId)
    .eq('id', summaryId)
    .select('*')
    .single();

  if (error) throw error;
  return mapSummary(data);
}

export async function failChatwootSummary(organizationId: string, summaryId: string, reason: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_conversation_summaries')
    .update({
      status: 'failed',
      failure_reason: reason,
      updated_at: nowIso(),
    })
    .eq('organization_id', organizationId)
    .eq('id', summaryId)
    .select('*')
    .single();

  if (error) throw error;
  return mapSummary(data);
}

async function findContactByExternalOrIdentity(
  organizationId: string,
  integrationId: string,
  normalized: ChatwootWebhookNormalized
) {
  const admin = createStaticAdminClient();
  if (normalized.chatwootContactId) {
    const linked = await admin
      .from('chatwoot_contact_links')
      .select('contact_id')
      .eq('organization_id', organizationId)
      .eq('integration_id', integrationId)
      .eq('chatwoot_contact_id', normalized.chatwootContactId)
      .maybeSingle();
    if (linked.error) throw linked.error;
    if (linked.data?.contact_id) {
      return String(linked.data.contact_id);
    }
  }

  let query = admin
    .from('contacts')
    .select('id,email,phone')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  const email = normalizeEmail(normalized.email ?? null);
  const phone = normalizePhone(normalized.phone ?? null);
  if (email && phone) query = query.or(`email.eq.${email},phone.eq.${phone}`);
  else if (email) query = query.eq('email', email);
  else if (phone) query = query.eq('phone', phone);
  else return null;

  const result = await query.limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data?.id ? String(result.data.id) : null;
}

async function createContactFromWebhook(organizationId: string, normalized: ChatwootWebhookNormalized) {
  const admin = createStaticAdminClient();
  const payload = {
    organization_id: organizationId,
    name: normalized.contactName || normalized.phone || normalized.email || 'Contato Chatwoot',
    email: normalizeEmail(normalized.email ?? null),
    phone: normalizePhone(normalized.phone ?? null),
    source: 'chatwoot',
    status: 'ACTIVE',
    stage: 'LEAD',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { data, error } = await admin.from('contacts').insert(payload).select('id').single();
  if (error) throw error;
  return String(data.id);
}

async function ensureContactLink(
  organizationId: string,
  integrationId: string,
  contactId: string,
  normalized: ChatwootWebhookNormalized
) {
  if (!normalized.chatwootContactId) return;
  const admin = createStaticAdminClient();
  const { error } = await admin
    .from('chatwoot_contact_links')
    .upsert({
      organization_id: organizationId,
      integration_id: integrationId,
      contact_id: contactId,
      chatwoot_contact_id: normalized.chatwootContactId,
      chatwoot_source_id: normalized.sourceId ?? null,
      phone_e164: normalizePhone(normalized.phone ?? null),
      email_normalized: normalizeEmail(normalized.email ?? null),
      updated_at: nowIso(),
      created_at: nowIso(),
    }, { onConflict: 'organization_id,integration_id,chatwoot_contact_id' });
  if (error) throw error;
}

async function findMatchingRule(organizationId: string, integrationId: string, normalized: ChatwootWebhookNormalized) {
  const admin = createStaticAdminClient();
  if (normalized.labels.length === 0) return null;

  const normalizedLabels = normalized.labels.map(label => label.trim().toLowerCase()).filter(Boolean);
  const { data, error } = await admin
    .from('chatwoot_label_mappings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('integration_id', integrationId)
    .eq('active', true);

  if (error) throw error;
  const rules = ((data || []) as any[]).filter(rule =>
    normalizedLabels.includes(String(rule.label ?? '').trim().toLowerCase())
  );
  if (rules.length === 0) return null;

  const exactInbox = rules.find(rule => normalized.inboxId != null && Number(rule.inbox_id) === normalized.inboxId);
  const generic = rules.find(rule => rule.inbox_id == null);
  return exactInbox ?? generic ?? rules[0];
}

async function resolveCandidateDeal(
  organizationId: string,
  contactId: string,
  boardId: string | null,
  requireSingleOpenDeal: boolean
) {
  const admin = createStaticAdminClient();
  let query = admin
    .from('deals')
    .select('id,title,board_id')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .eq('is_won', false)
    .eq('is_lost', false)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(requireSingleOpenDeal ? 2 : 5);

  if (boardId) query = query.eq('board_id', boardId);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return { status: 'none' as const };
  if (data.length > 1 && requireSingleOpenDeal) return { status: 'ambiguous' as const };
  return { status: 'single' as const, dealId: String(data[0].id), dealTitle: String(data[0].title) };
}

async function applyRuleToDeal(organizationId: string, rule: any, dealId: string) {
  const admin = createStaticAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: nowIso(),
  };
  if (rule.stage_id) {
    updates.stage_id = rule.stage_id;
    updates.last_stage_change_date = nowIso();
  }
  if (rule.mark_won) {
    updates.is_won = true;
    updates.is_lost = false;
    updates.closed_at = nowIso();
    updates.loss_reason = null;
  }
  if (rule.mark_lost) {
    updates.is_lost = true;
    updates.is_won = false;
    updates.closed_at = nowIso();
  }
  const { error } = await admin
    .from('deals')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('id', dealId);
  if (error) throw error;
}

function renderActivityTitle(rule: any, normalized: ChatwootWebhookNormalized) {
  const template = normalizeText(rule.activity_title_template);
  if (!template) {
    return `Chatwoot: ${normalized.labels.join(', ') || normalized.eventType}`;
  }

  return template
    .replaceAll('{{labels}}', normalized.labels.join(', '))
    .replaceAll('{{status}}', normalized.status ?? '')
    .replaceAll('{{contactName}}', normalized.contactName ?? '')
    .replaceAll('{{eventType}}', normalized.eventType);
}

async function maybeCreateActivity(
  organizationId: string,
  rule: any,
  dealId: string | null,
  dealTitle: string | null,
  contactId: string | null,
  normalized: ChatwootWebhookNormalized
) {
  if (!rule.create_activity) return;
  const admin = createStaticAdminClient();
  const title = renderActivityTitle(rule, normalized);
  const { error } = await admin
    .from('activities')
    .insert({
      organization_id: organizationId,
      title,
      description: `Evento Chatwoot acionado por labels: ${normalized.labels.join(', ') || 'sem labels'}`,
      type: 'TASK',
      date: nowIso(),
      deal_id: dealId,
      contact_id: contactId,
      deal_title: dealTitle ?? '',
      completed: false,
    });
  if (error) throw error;
}

async function ensureSummaryRow(organizationId: string, snapshotId: string) {
  const admin = createStaticAdminClient();
  const existing = await admin
    .from('chatwoot_conversation_summaries')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('snapshot_id', snapshotId)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return String(existing.data.id);

  const { data, error } = await admin
    .from('chatwoot_conversation_summaries')
    .insert({
      organization_id: organizationId,
      snapshot_id: snapshotId,
      status: 'pending',
      updated_at: nowIso(),
      created_at: nowIso(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return String(data.id);
}

async function findExistingSnapshot(
  organizationId: string,
  integrationId: string,
  conversationId: number,
  resolvedAt: string | null
) {
  const admin = createStaticAdminClient();
  let query = admin
    .from('chatwoot_conversation_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('integration_id', integrationId)
    .eq('chatwoot_conversation_id', conversationId);

  if (resolvedAt) query = query.eq('resolved_at', resolvedAt);
  else query = query.is('resolved_at', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapSnapshot(data) : null;
}

async function createSnapshot(
  organizationId: string,
  integration: any,
  normalized: ChatwootWebhookNormalized,
  contactId: string | null,
  dealId: string | null
) {
  if (!normalized.conversationId || !isResolutionLikeStatus(normalized.status)) {
    return null;
  }

  const existing = await findExistingSnapshot(
    organizationId,
    String(integration.id),
    normalized.conversationId,
    normalized.resolvedAt ?? null
  );
  if (existing) {
    if (integration.summary_enabled) {
      await ensureSummaryRow(organizationId, existing.id);
    }
    return existing.id;
  }

  let transcriptText = normalized.transcriptText;
  let transcriptMessageCount = normalized.transcriptMessageCount;
  if (!transcriptText) {
    try {
      const messages = await fetchChatwootConversationMessages({
        baseUrl: integration.base_url,
        accountId: Number(integration.account_id),
        apiToken: decryptSecret(String(integration.api_token_ciphertext)),
        conversationId: normalized.conversationId,
      });
      const visibleMessages = (messages || [])
        .filter((message: any) => !message?.private)
        .map((message: any) => {
          const sender = normalizeText(message?.sender?.name) || normalizeText(message?.sender?.available_name) || 'Participante';
          const content = normalizeText(message?.content) || '[sem texto]';
          return `${sender}: ${content}`;
        });
      transcriptText = visibleMessages.join('\n');
      transcriptMessageCount = visibleMessages.length;
    } catch {
      transcriptText = '';
      transcriptMessageCount = 0;
    }
  }

  if (!transcriptText.trim()) {
    return null;
  }

  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_conversation_snapshots')
    .insert({
      organization_id: organizationId,
      integration_id: integration.id,
      chatwoot_conversation_id: normalized.conversationId,
      chatwoot_inbox_id: normalized.inboxId ?? null,
      contact_id: contactId,
      deal_id: dealId,
      status: normalized.status || 'resolved',
      labels: normalized.labels,
      assignee_external_id: normalized.assigneeId ?? null,
      first_message_at: normalized.firstMessageAt ?? null,
      resolved_at: normalized.resolvedAt ?? nowIso(),
      transcript_text: transcriptText,
      transcript_message_count: transcriptMessageCount,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('id')
    .single();

  if (error) {
    if (String(error.message).toLowerCase().includes('duplicate')) {
      const duplicate = await findExistingSnapshot(
        organizationId,
        String(integration.id),
        normalized.conversationId,
        normalized.resolvedAt ?? null
      );
      if (duplicate) {
        if (integration.summary_enabled) {
          await ensureSummaryRow(organizationId, duplicate.id);
        }
        return duplicate.id;
      }
    }
    throw error;
  }

  if (integration.summary_enabled) {
    await ensureSummaryRow(organizationId, String(data.id));
  }

  return String(data.id);
}

async function updateEventLog(
  eventLogId: string,
  payload: {
    processingStatus: 'processed' | 'ignored' | 'failed' | 'reprocessed';
    processingError?: string | null;
    appliedRuleId?: string | null;
    createdSnapshotId?: string | null;
  }
) {
  const admin = createStaticAdminClient();
  const { error } = await admin
    .from('chatwoot_event_logs')
    .update({
      processing_status: payload.processingStatus,
      processing_error: payload.processingError ?? null,
      applied_rule_id: payload.appliedRuleId ?? null,
      created_snapshot_id: payload.createdSnapshotId ?? null,
      processed_at: nowIso(),
    })
    .eq('id', eventLogId);

  if (error) throw error;
}

async function runEventProcessing(
  integration: any,
  normalized: ChatwootWebhookNormalized,
  eventLogId: string,
  options?: { isReplay?: boolean }
) {
  const organizationId = String(integration.organization_id);
  const integrationId = String(integration.id);
  const isReplay = options?.isReplay === true;
  const allowedInboxIds = Array.isArray(integration.allowed_inbox_ids)
    ? integration.allowed_inbox_ids.map((value: any) => Number(value)).filter(Number.isFinite)
    : [];

  if (allowedInboxIds.length > 0 && normalized.inboxId != null && !allowedInboxIds.includes(normalized.inboxId)) {
    await updateEventLog(eventLogId, {
      processingStatus: 'ignored',
      processingError: `Inbox ${normalized.inboxId} not allowed`,
    });
    return {
      processingStatus: 'ignored' as const,
      appliedRuleId: null,
      createdSnapshotId: null,
    };
  }

  let contactId = await findContactByExternalOrIdentity(organizationId, integrationId, normalized);
  if (!contactId && (normalized.contactName || normalized.email || normalized.phone)) {
    contactId = await createContactFromWebhook(organizationId, normalized);
  }
  if (contactId) {
    await ensureContactLink(organizationId, integrationId, contactId, normalized);
  }

  const rule = await findMatchingRule(organizationId, integrationId, normalized);
  let appliedRuleId: string | null = null;
  let dealId: string | null = null;
  let dealTitle: string | null = null;
  let processingStatus: 'processed' | 'ignored' | 'failed' | 'reprocessed' = 'ignored';
  let processingError: string | null = null;

  if (rule) {
    if (!contactId) {
      processingStatus = 'failed';
      processingError = 'Contact not found for mapped Chatwoot rule';
    } else {
      const boardId = rule.board_id
        ? String(rule.board_id)
        : integration.default_board_id
          ? String(integration.default_board_id)
          : null;
      const selection = await resolveCandidateDeal(
        organizationId,
        contactId,
        boardId,
        Boolean(rule.require_single_open_deal)
      );

      if (selection.status === 'single' && selection.dealId) {
        dealId = selection.dealId;
        dealTitle = selection.dealTitle ?? null;
        await applyRuleToDeal(organizationId, rule, dealId);
        await maybeCreateActivity(organizationId, rule, dealId, dealTitle, contactId, normalized);
        appliedRuleId = String(rule.id);
        processingStatus = isReplay ? 'reprocessed' : 'processed';
      } else if (selection.status === 'ambiguous') {
        processingStatus = 'failed';
        processingError = 'Ambiguous open deal match';
      } else {
        processingStatus = 'failed';
        processingError = 'No eligible open deal found';
      }
    }
  }

  const createdSnapshotId = await createSnapshot(organizationId, integration, normalized, contactId, dealId);
  if (createdSnapshotId && processingStatus === 'ignored') {
    processingStatus = isReplay ? 'reprocessed' : 'processed';
  }

  await updateEventLog(eventLogId, {
    processingStatus,
    processingError,
    appliedRuleId,
    createdSnapshotId,
  });

  return {
    processingStatus,
    processingError,
    appliedRuleId,
    createdSnapshotId,
  };
}

export async function getChatwootIntegrationByWebhookToken(token: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_integrations')
    .select('*')
    .eq('webhook_token', token)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function processChatwootWebhook(token: string, rawPayload: unknown) {
  const integration = await getChatwootIntegrationByWebhookToken(token);
  if (!integration) {
    return { ok: false as const, status: 401, body: { ok: false, error: 'Invalid webhook token' } };
  }

  const normalized = normalizeChatwootWebhookPayload(rawPayload);
  const admin = createStaticAdminClient();
  const eventFingerprint = buildChatwootEventFingerprint(String(integration.id), normalized);

  const insertResult = await admin
    .from('chatwoot_event_logs')
    .insert({
      organization_id: integration.organization_id,
      integration_id: integration.id,
      event_type: normalized.eventType,
      event_fingerprint: eventFingerprint,
      chatwoot_event_id: normalized.eventId ?? null,
      chatwoot_conversation_id: normalized.conversationId ?? null,
      payload: normalized.rawPayload,
      processing_status: 'received',
      created_at: nowIso(),
    })
    .select('id')
    .single();

  if (insertResult.error) {
    if (String(insertResult.error.message).toLowerCase().includes('duplicate')) {
      const existing = await admin
        .from('chatwoot_event_logs')
        .select('id')
        .eq('organization_id', integration.organization_id)
        .eq('integration_id', integration.id)
        .eq('event_fingerprint', eventFingerprint)
        .maybeSingle();
      return {
        ok: true as const,
        status: 200,
        body: { ok: true, status: 'duplicate', eventLogId: existing.data?.id ?? null },
      };
    }
    throw insertResult.error;
  }

  const eventLogId = String(insertResult.data.id);
  try {
    const result = await runEventProcessing(integration, normalized, eventLogId);

    return {
      ok: true as const,
      status: 202,
      body: {
        ok: true,
        status: 'accepted',
        eventLogId,
        eventType: normalized.eventType,
        appliedRuleId: result.appliedRuleId,
        createdSnapshotId: result.createdSnapshotId,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
    await updateEventLog(eventLogId, {
      processingStatus: 'failed',
      processingError: message,
    });

    return {
      ok: true as const,
      status: 202,
      body: {
        ok: true,
        status: 'accepted',
        eventLogId,
        eventType: normalized.eventType,
        warning: message,
      },
    };
  }
}

export async function replayChatwootEvent(organizationId: string, eventLogId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('chatwoot_event_logs')
    .select('*, integration:chatwoot_integrations(*)')
    .eq('organization_id', organizationId)
    .eq('id', eventLogId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Event log not found');
  if (!data.integration) throw new Error('Integration not found for event log');
  if (data.processing_status === 'processed' || data.processing_status === 'reprocessed') {
    throw new Error('Only failed or ignored events can be replayed safely');
  }

  const normalized = normalizeChatwootWebhookPayload(data.payload);
  const { error: resetError } = await admin
    .from('chatwoot_event_logs')
    .update({
      processing_status: 'received',
      processing_error: null,
      processed_at: null,
    })
    .eq('id', eventLogId);

  if (resetError) throw resetError;

  const result = await runEventProcessing(data.integration, normalized, eventLogId, { isReplay: true });
  return {
    eventLogId,
    processingStatus: result.processingStatus,
    appliedRuleId: result.appliedRuleId,
    createdSnapshotId: result.createdSnapshotId,
  };
}
