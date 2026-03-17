import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { requireOrganizationUser } from '@/lib/integrations/chatwoot/auth';
import { healthcheckChatwootIntegration } from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (auth.profile.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  try {
    const result = await healthcheckChatwootIntegration(auth.profile.organizationId);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chatwoot healthcheck failed';
    return json({ error: message }, 500);
  }
}
