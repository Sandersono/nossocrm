import { generateObject } from 'ai';
import { z } from 'zod';
import { requireAITaskContext, AITaskHttpError } from '@/lib/ai/tasks/server';
import { getResolvedPrompt } from '@/lib/ai/prompts/server';
import { renderPromptTemplate } from '@/lib/ai/prompts/render';
import { isAIFeatureEnabled } from '@/lib/ai/features/server';
import {
  completeChatwootSummary,
  failChatwootSummary,
  listPendingChatwootSummaries,
  markChatwootSummaryProcessing,
} from '@/lib/integrations/chatwoot/service';

export const maxDuration = 60;

const SummaryResultSchema = z.object({
  summaryText: z.string().trim().min(1).max(2000),
  keyTopics: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
  customerIntent: z.string().trim().max(300).nullable().optional(),
  nextSteps: z.array(z.string().trim().min(1).max(200)).max(5).default([]),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAITaskContext(req);

    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('role')
      .eq('id', ctx.userId)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, 404);
    }
    if (profile.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403);
    }

    const enabled = await isAIFeatureEnabled(ctx.supabase as any, ctx.organizationId, 'ai_chatwoot_summary');
    if (!enabled) {
      return json({ error: { code: 'AI_FEATURE_DISABLED', message: 'Resumo Chatwoot por IA esta desativado.' } }, 403);
    }

    const raw = await req.json().catch(() => null);
    const limit = typeof raw?.limit === 'number' ? raw.limit : 5;
    const items = await listPendingChatwootSummaries(ctx.organizationId, Math.min(Math.max(limit, 1), 20));

    const resolvedPrompt = await getResolvedPrompt(ctx.supabase as any, ctx.organizationId, 'task_chatwoot_conversation_summary');
    if (!resolvedPrompt?.content) {
      return json({ error: 'Prompt task_chatwoot_conversation_summary not configured' }, 500);
    }

    const processed: Array<{ summaryId: string; status: 'completed' | 'failed'; reason?: string | null }> = [];

    for (const item of items) {
      if (!item.summary || !item.snapshot) continue;

      try {
        await markChatwootSummaryProcessing(ctx.organizationId, item.summary.id);

        let contactName = '';
        if (item.snapshot.contactId) {
          const contactResult = await ctx.supabase
            .from('contacts')
            .select('name')
            .eq('id', item.snapshot.contactId)
            .maybeSingle();
          contactName = contactResult.data?.name ?? '';
        }

        let dealTitle = '';
        if (item.snapshot.dealId) {
          const dealResult = await ctx.supabase
            .from('deals')
            .select('title')
            .eq('id', item.snapshot.dealId)
            .maybeSingle();
          dealTitle = dealResult.data?.title ?? '';
        }

        const prompt = renderPromptTemplate(resolvedPrompt.content, {
          contactName,
          dealTitle,
          labels: item.snapshot.labels.join(', '),
          status: item.snapshot.status,
          transcript: item.snapshot.transcriptText,
        });

        const result = await generateObject({
          model: ctx.model,
          maxRetries: 2,
          schema: SummaryResultSchema,
          prompt,
        });

        await completeChatwootSummary(ctx.organizationId, item.summary.id, result.object);
        processed.push({ summaryId: item.summary.id, status: 'completed' });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Failed to summarize conversation';
        await failChatwootSummary(ctx.organizationId, item.summary.id, reason);
        processed.push({ summaryId: item.summary.id, status: 'failed', reason });
      }
    }

    return json({
      ok: true,
      processedCount: processed.length,
      completedCount: processed.filter(item => item.status === 'completed').length,
      failedCount: processed.filter(item => item.status === 'failed').length,
      processed,
    });
  } catch (error) {
    if (error instanceof AITaskHttpError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return json({ error: 'Invalid payload' }, 400);
    }

    const message = error instanceof Error ? error.message : 'Failed to process Chatwoot summaries';
    return json({ error: message }, 500);
  }
}
