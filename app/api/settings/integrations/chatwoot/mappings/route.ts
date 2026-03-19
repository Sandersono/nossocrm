import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { isAdminRole } from '@/lib/auth/roles';
import { requireOrganizationUser } from '@/lib/integrations/chatwoot/auth';
import { ChatwootLabelMappingSchema } from '@/lib/integrations/chatwoot/schemas';
import {
  deleteChatwootLabelMapping,
  listChatwootLabelMappings,
  upsertChatwootLabelMapping,
} from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET() {
  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (!isAdminRole(auth.profile.role)) return json({ error: 'Forbidden' }, 403);

  try {
    const mappings = await listChatwootLabelMappings(auth.profile.organizationId);
    return json({ mappings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load mappings';
    return json({ error: message }, 500);
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (!isAdminRole(auth.profile.role)) return json({ error: 'Forbidden' }, 403);

  const raw = await req.json().catch(() => null);
  const parsed = ChatwootLabelMappingSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  try {
    const mapping = await upsertChatwootLabelMapping(auth.profile.organizationId, parsed.data);
    return json({ ok: true, mapping });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save mapping';
    return json({ error: message }, 500);
  }
}

export async function DELETE(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireOrganizationUser();
  if (!auth.ok) return json(auth.body, auth.status);
  if (!isAdminRole(auth.profile.role)) return json({ error: 'Forbidden' }, 403);

  const url = new URL(req.url);
  const mappingId = url.searchParams.get('id');
  if (!mappingId) return json({ error: 'Mapping id is required' }, 400);

  try {
    await deleteChatwootLabelMapping(auth.profile.organizationId, mappingId);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete mapping';
    return json({ error: message }, 500);
  }
}
