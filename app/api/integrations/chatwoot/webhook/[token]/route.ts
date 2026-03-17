import { processChatwootWebhook } from '@/lib/integrations/chatwoot/service';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const raw = await req.json().catch(() => null);
  if (!raw) return json({ ok: false, error: 'Invalid JSON payload' }, 400);

  try {
    const result = await processChatwootWebhook(token, raw);
    return json(result.body, result.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return json({ ok: false, error: message }, 500);
  }
}
