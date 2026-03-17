import { safeFetchJson } from '@/lib/fetch/safeFetch';

type ChatwootRequestOptions = {
  baseUrl: string;
  accountId: number;
  apiToken: string;
};

function buildBaseHeaders(apiToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    api_access_token: apiToken,
  };
}

function joinUrl(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${pathname}`;
}

export async function fetchChatwootInboxes(options: ChatwootRequestOptions): Promise<unknown[]> {
  const url = joinUrl(options.baseUrl, `/api/v1/accounts/${options.accountId}/inboxes`);
  return await safeFetchJson<unknown[]>(url, {
    headers: buildBaseHeaders(options.apiToken),
    timeout: 15000,
  });
}

export async function fetchChatwootConversationMessages(options: ChatwootRequestOptions & { conversationId: number }): Promise<any[]> {
  const url = joinUrl(
    options.baseUrl,
    `/api/v1/accounts/${options.accountId}/conversations/${options.conversationId}/messages`
  );
  return await safeFetchJson<any[]>(url, {
    headers: buildBaseHeaders(options.apiToken),
    timeout: 20000,
  });
}

export async function runChatwootHealthcheck(options: ChatwootRequestOptions): Promise<{ ok: true; inboxCount: number }> {
  const inboxes = await fetchChatwootInboxes(options);
  return { ok: true, inboxCount: Array.isArray(inboxes) ? inboxes.length : 0 };
}
