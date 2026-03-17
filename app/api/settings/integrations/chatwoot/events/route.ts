import { requireOrganizationUser } from '@/lib/integrations/chatwoot/auth';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { listChatwootEventLogs, replayChatwootEvent } from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request) {
  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (auth.profile.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || '50');

  try {
    const events = await listChatwootEventLogs(auth.profile.organizationId, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50);
    return json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load events';
    return json({ error: message }, 500);
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (auth.profile.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const raw = await req.json().catch(() => null);
  const eventLogId = typeof raw?.eventLogId === 'string' ? raw.eventLogId.trim() : '';
  if (!eventLogId) return json({ error: 'eventLogId is required' }, 400);

  try {
    const result = await replayChatwootEvent(auth.profile.organizationId, eventLogId);
    return json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to replay event';
    return json({ error: message }, 500);
  }
}
