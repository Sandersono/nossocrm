import { isAdminRole } from '@/lib/auth/roles';
import { requireOrganizationUser } from '@/lib/integrations/clinicorp/auth';
import { healthcheckClinicorpIntegration } from '@/lib/integrations/clinicorp/service';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';

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
  if (!isAdminRole(auth.profile.role)) return json({ error: 'Forbidden' }, 403);

  try {
    const result = await healthcheckClinicorpIntegration(auth.profile.organizationId);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clinicorp healthcheck failed';
    return json({ error: message }, 500);
  }
}
