import { requireOrganizationUser } from '@/lib/integrations/chatwoot/auth';
import { listChatwootConversationHistory } from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request) {
  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);

  const url = new URL(request.url);
  const contactId = url.searchParams.get('contactId')?.trim() || undefined;
  const dealId = url.searchParams.get('dealId')?.trim() || undefined;
  const limit = Number(url.searchParams.get('limit') || '20');

  if (!contactId && !dealId) {
    return json({ error: 'contactId or dealId is required' }, 400);
  }

  try {
    const history = await listChatwootConversationHistory(auth.profile.organizationId, {
      contactId,
      dealId,
      limit: Number.isFinite(limit) ? limit : 20,
    });
    return json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Chatwoot history';
    return json({ error: message }, 500);
  }
}
