import { createHash } from 'node:crypto';
import { normalizeEmail, normalizePhone } from '@/lib/public-api/sanitize';
import { ChatwootWebhookNormalizedSchema, type ChatwootWebhookNormalized } from './schemas';

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getLabels(payload: Record<string, unknown>, conversation: Record<string, unknown> | null): string[] {
  const candidates = [conversation?.labels, payload.labels];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate
      .map(item => getString(item))
      .filter((item): item is string => Boolean(item));
  }
  return [];
}

function extractContact(payload: Record<string, unknown>, conversation: Record<string, unknown> | null) {
  const meta = getRecord(conversation?.meta);
  const sender = getRecord(meta?.sender) || getRecord(payload.contact) || getRecord(payload.sender);
  return {
    chatwootContactId: getNumber(sender?.id) ?? getNumber(payload.contact_id),
    sourceId: getString(sender?.source_id) ?? getString(payload.source_id),
    contactName: getString(sender?.name) ?? getString(payload.contact_name),
    phone: normalizePhone(getString(sender?.phone_number) ?? getString(sender?.phone) ?? getString(payload.phone)),
    email: normalizeEmail(getString(sender?.email) ?? getString(payload.email)),
  };
}

function normalizeStatus(payload: Record<string, unknown>, conversation: Record<string, unknown> | null): string | null {
  return getString(conversation?.status) ?? getString(payload.status);
}

export function normalizeChatwootWebhookPayload(rawPayload: unknown): ChatwootWebhookNormalized {
  const payload = getRecord(rawPayload);
  if (!payload) {
    throw new Error('Payload must be an object');
  }

  const conversation =
    getRecord(payload.conversation) ||
    getRecord(payload.conversation_id ? payload : null) ||
    getRecord(payload.data);

  const eventType =
    getString(payload.event) ||
    getString(payload.event_type) ||
    getString(payload.event_name) ||
    getString(payload.type) ||
    'unknown';

  const conversationId =
    getNumber(conversation?.id) ??
    getNumber(payload.conversation_id) ??
    getNumber(getRecord(payload.data)?.id);

  const inboxId =
    getNumber(conversation?.inbox_id) ??
    getNumber(getRecord(getRecord(conversation?.meta)?.inbox)?.id) ??
    getNumber(payload.inbox_id);

  const contact = extractContact(payload, conversation);
  const labels = getLabels(payload, conversation);
  const transcriptText = getString(payload.transcript_text) ?? '';
  const transcriptMessageCount = getNumber(payload.transcript_message_count) ?? 0;
  const normalized = ChatwootWebhookNormalizedSchema.parse({
    eventType,
    eventId: getString(payload.id) ?? getString(payload.event_id) ?? null,
    conversationId,
    inboxId,
    chatwootContactId: contact.chatwootContactId ?? null,
    sourceId: contact.sourceId ?? null,
    contactName: contact.contactName ?? null,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
    status: normalizeStatus(payload, conversation),
    labels,
    assigneeId: getNumber(conversation?.assignee_id) ?? getNumber(payload.assignee_id) ?? null,
    transcriptText,
    transcriptMessageCount,
    firstMessageAt: getString(payload.first_message_at) ?? getString(conversation?.created_at) ?? null,
    resolvedAt: getString(payload.resolved_at) ?? null,
    rawPayload: payload,
  });

  return normalized;
}

export function buildChatwootEventFingerprint(
  integrationId: string,
  normalized: Pick<ChatwootWebhookNormalized, 'eventType' | 'eventId' | 'conversationId' | 'status' | 'labels' | 'resolvedAt' | 'transcriptText'>
): string {
  const source = [
    integrationId,
    normalized.eventType,
    normalized.eventId ?? '',
    normalized.conversationId ?? '',
    normalized.status ?? '',
    normalized.resolvedAt ?? '',
    normalized.labels.join('|'),
    normalized.transcriptText.slice(0, 500),
  ].join('::');

  return createHash('sha256').update(source).digest('hex');
}

export function isResolutionLikeStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? '').trim().toLowerCase();
  return normalized === 'resolved' || normalized === 'closed' || normalized === 'snoozed';
}
