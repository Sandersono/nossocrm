import { createClient } from '@/lib/supabase/server';

export async function requireOrganizationUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, body: { error: 'Unauthorized' } };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single();

  if (error || !profile?.organization_id) {
    return { ok: false as const, status: 404, body: { error: 'Profile not found' } };
  }

  return {
    ok: true as const,
    profile: {
      id: String(profile.id),
      organizationId: String(profile.organization_id),
      role: String(profile.role),
    },
  };
}
