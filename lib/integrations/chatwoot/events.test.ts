import { describe, expect, it } from 'vitest';
import {
  buildChatwootEventFingerprint,
  isResolutionLikeStatus,
  normalizeChatwootWebhookPayload,
} from './events';

describe('chatwoot event normalization', () => {
  it('normalizes contact, labels and conversation metadata', () => {
    const normalized = normalizeChatwootWebhookPayload({
      event: 'conversation_updated',
      id: 'evt_1',
      conversation: {
        id: 123,
        inbox_id: 7,
        status: 'resolved',
        assignee_id: 44,
        labels: ['qualificado', 'proposta'],
        meta: {
          sender: {
            id: 999,
            name: 'Ana',
            email: 'ANA@EXEMPLO.COM',
            phone_number: '+55 11 99999-1111',
            source_id: 'whatsapp:+5511999991111',
          },
        },
        created_at: '2026-03-15T10:00:00.000Z',
      },
    });

    expect(normalized.eventType).toBe('conversation_updated');
    expect(normalized.conversationId).toBe(123);
    expect(normalized.inboxId).toBe(7);
    expect(normalized.chatwootContactId).toBe(999);
    expect(normalized.contactName).toBe('Ana');
    expect(normalized.email).toBe('ana@exemplo.com');
    expect(normalized.phone).toBe('+5511999991111');
    expect(normalized.labels).toEqual(['qualificado', 'proposta']);
    expect(normalized.status).toBe('resolved');
    expect(normalized.assigneeId).toBe(44);
  });

  it('builds stable fingerprints for the same normalized payload', () => {
    const normalized = normalizeChatwootWebhookPayload({
      event: 'conversation_updated',
      id: 'evt_2',
      conversation_id: 456,
      status: 'resolved',
      labels: ['followup'],
      transcript_text: 'Atendente: oi\nCliente: quero proposta',
      resolved_at: '2026-03-15T12:00:00.000Z',
    });

    const first = buildChatwootEventFingerprint('integration_1', normalized);
    const second = buildChatwootEventFingerprint('integration_1', normalized);

    expect(first).toBe(second);
  });

  it('treats resolved-like statuses correctly', () => {
    expect(isResolutionLikeStatus('resolved')).toBe(true);
    expect(isResolutionLikeStatus('closed')).toBe(true);
    expect(isResolutionLikeStatus('snoozed')).toBe(true);
    expect(isResolutionLikeStatus('open')).toBe(false);
  });
});
