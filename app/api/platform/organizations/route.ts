import { z } from 'zod';
import { createClient, createStaticAdminClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { isSuperAdminRole } from '@/lib/auth/roles';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const CreateOrganizationSchema = z
  .object({
    companyName: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    email: z.string().email(),
    password: z.string().min(6),
  })
  .strict();

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: json({ error: 'Unauthorized' }, 401) };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .single();

  if (error || !profile?.organization_id) {
    return { ok: false as const, response: json({ error: 'Profile not found' }, 404) };
  }

  if (!isSuperAdminRole(profile.role)) {
    return { ok: false as const, response: json({ error: 'Forbidden' }, 403) };
  }

  return { ok: true as const, profile };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const admin = createStaticAdminClient();

  const { data: organizations, error: organizationsError } = await admin
    .from('organizations')
    .select('id, name, created_at, deleted_at')
    .order('created_at', { ascending: true });

  if (organizationsError) {
    return json({ error: organizationsError.message }, 500);
  }

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('organization_id, role');

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  const usersByOrganization = new Map<string, { users: number; admins: number }>();

  for (const profile of profiles || []) {
    const orgId = String(profile.organization_id || '');
    if (!orgId) continue;
    const current = usersByOrganization.get(orgId) || { users: 0, admins: 0 };
    current.users += 1;
    if (profile.role === 'admin' || profile.role === 'superadmin') {
      current.admins += 1;
    }
    usersByOrganization.set(orgId, current);
  }

  const rows = (organizations || []).map((organization) => {
    const stats = usersByOrganization.get(String(organization.id)) || { users: 0, admins: 0 };
    return {
      id: String(organization.id),
      name: String(organization.name),
      createdAt: String(organization.created_at),
      deletedAt: organization.deleted_at ? String(organization.deleted_at) : null,
      userCount: stats.users,
      adminCount: stats.admins,
    };
  });

  return json({ organizations: rows });
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = CreateOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const { companyName, name, email, password } = parsed.data;
  const admin = createStaticAdminClient();

  const { data: organization, error: orgError } = await admin
    .from('organizations')
    .insert({ name: companyName })
    .select('id, name, created_at')
    .single();

  if (orgError) return json({ error: orgError.message }, 500);

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: 'admin',
      organization_id: organization.id,
    },
  });

  if (userError) {
    await admin.from('organizations').delete().eq('id', organization.id);
    return json({ error: userError.message }, 400);
  }

  const userId = userData.user.id;
  const nowIso = new Date().toISOString();

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      first_name: name,
      organization_id: organization.id,
      role: 'admin',
      updated_at: nowIso,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from('organizations').delete().eq('id', organization.id);
    return json({ error: profileError.message }, 400);
  }

  return json({
    ok: true,
    organization: {
      id: String(organization.id),
      name: String(organization.name),
      createdAt: String(organization.created_at),
      userCount: 1,
      adminCount: 1,
    },
    user: { id: userId, email },
  }, 201);
}
