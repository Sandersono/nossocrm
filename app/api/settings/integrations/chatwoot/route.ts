import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { requireOrganizationUser } from '@/lib/integrations/chatwoot/auth';
import { ChatwootIntegrationUpsertSchema } from '@/lib/integrations/chatwoot/schemas';
import { getChatwootIntegrationForOrg, upsertChatwootIntegration } from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET() {
  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (auth.profile.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const integration = await getChatwootIntegrationForOrg(auth.profile.organizationId);
  return json({ integration });
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (auth.profile.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const raw = await req.json().catch(() => null);
  const parsed = ChatwootIntegrationUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  try {
    const integration = await upsertChatwootIntegration(auth.profile.organizationId, parsed.data);
    return json({ ok: true, integration });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save Chatwoot integration';
    return json({ error: message }, 500);
  }
}
