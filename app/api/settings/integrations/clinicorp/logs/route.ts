import { isAdminRole } from '@/lib/auth/roles';
import { requireOrganizationUser } from '@/lib/integrations/clinicorp/auth';
import { listClinicorpDiagnostics } from '@/lib/integrations/clinicorp/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request) {
  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (!isAdminRole(auth.profile.role)) return json({ error: 'Forbidden' }, 403);

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || '40');

  try {
    const items = await listClinicorpDiagnostics(
      auth.profile.organizationId,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 40
    );
    return json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Clinicorp logs';
    return json({ error: message }, 500);
  }
}
