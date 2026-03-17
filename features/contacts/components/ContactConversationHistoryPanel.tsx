'use client';

import React, { useEffect, useState } from 'react';
import { ChatwootHistoryList } from '@/components/integrations/ChatwootHistoryList';
import type { ChatwootConversationHistoryItem } from '@/types';

async function fetchHistory(contactId: string): Promise<ChatwootConversationHistoryItem[]> {
  const response = await fetch(`/api/integrations/chatwoot/history?contactId=${encodeURIComponent(contactId)}&limit=10`, {
    credentials: 'include',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || 'Falha ao carregar historico do Chatwoot');
  }

  return Array.isArray(body.history) ? body.history : [];
}

export function ContactConversationHistoryPanel({
  contactId,
  variant = 'light',
}: {
  contactId: string;
  variant?: 'light' | 'dark';
}) {
  const [history, setHistory] = useState<ChatwootConversationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchHistory(contactId);
      setHistory(next);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar historico do Chatwoot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [contactId]);

  return (
    <ChatwootHistoryList
      history={history}
      loading={loading}
      error={error}
      onRefresh={() => {
        void load();
      }}
      variant={variant}
      emptyMessage="Este contato ainda nao recebeu snapshots resolvidos do Chatwoot."
    />
  );
}
