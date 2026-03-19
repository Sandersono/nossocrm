import { isAdminRole } from '@/lib/auth/roles';
import { requireOrganizationUser } from '@/lib/integrations/clinicorp/auth';
import { ClinicorpPurchaseOrderSchema } from '@/lib/integrations/clinicorp/schemas';
import { createClinicorpPurchaseOrderForOrg } from '@/lib/integrations/clinicorp/service';
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

  const raw = await req.json().catch(() => null);
  const parsed = ClinicorpPurchaseOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await createClinicorpPurchaseOrderForOrg(auth.profile.organizationId, auth.profile.id, parsed.data);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Clinicorp purchase order';
    return json({ error: message }, 500);
  }
}
