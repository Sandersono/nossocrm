import { z } from 'zod';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const RegisterOrganizationSchema = z
  .object({
    companyName: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    email: z.string().email(),
    password: z.string().min(6),
  })
  .strict();

const REGISTER_RATE_LIMIT_WINDOW_MINUTES = 30;
const REGISTER_RATE_LIMIT_MAX_ATTEMPTS = 5;

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  const realIp = req.headers.get('x-real-ip') || '';
  const cfIp = req.headers.get('cf-connecting-ip') || '';
  return (cfIp || forwardedFor.split(',')[0] || realIp || 'unknown').trim();
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const raw = await req.json().catch(() => null);
  const parsed = RegisterOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const { companyName, name, email, password } = parsed.data;
  const admin = createStaticAdminClient();
  const clientIp = getClientIp(req);

  const { count: recentAttemptCount, error: rateLimitError } = await admin
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', 'tenant-register')
    .eq('identifier', clientIp)
    .gte(
      'created_at',
      new Date(Date.now() - REGISTER_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
    );

  if (rateLimitError) return json({ error: rateLimitError.message }, 500);
  if ((recentAttemptCount ?? 0) >= REGISTER_RATE_LIMIT_MAX_ATTEMPTS) {
    return json({ error: 'Too many attempts. Try again later.' }, 429);
  }

  await admin.from('rate_limits').insert({
    identifier: clientIp,
    endpoint: 'tenant-register',
  });

  const { data: isInitialized, error: initError } = await admin.rpc('is_instance_initialized');
  if (initError) return json({ error: initError.message }, 500);
  if (!isInitialized) {
    return json({ error: 'Platform not initialized yet. Use /setup for the first organization.' }, 409);
  }

  const { data: organization, error: orgError } = await admin
    .from('organizations')
    .insert({ name: companyName })
    .select('id, name')
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

  return json({ ok: true, organization, user: { id: userId, email } }, 201);
}
