import { z } from 'zod';

export const ChatwootIntegrationUpsertSchema = z.object({
  name: z.string().trim().min(1).max(120).default('Chatwoot'),
  baseUrl: z.string().trim().url(),
  accountId: z.coerce.number().int().positive(),
  apiToken: z.string().trim().min(1).max(5000).optional(),
  active: z.boolean().default(true),
  summaryEnabled: z.boolean().default(true),
  defaultBoardId: z.string().uuid().nullable().optional(),
  allowedInboxIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
}).strict();

export const ChatwootLabelMappingSchema = z.object({
  id: z.string().uuid().optional(),
  integrationId: z.string().uuid(),
  inboxId: z.coerce.number().int().positive().nullable().optional(),
  label: z.string().trim().min(1).max(120),
  boardId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
  markWon: z.boolean().default(false),
  markLost: z.boolean().default(false),
  createActivity: z.boolean().default(false),
  activityTitleTemplate: z.string().trim().max(200).nullable().optional(),
  requireSingleOpenDeal: z.boolean().default(true),
  active: z.boolean().default(true),
}).strict().superRefine((value, ctx) => {
  if (value.markWon && value.markLost) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'markWon and markLost cannot both be true' });
  }
  if (!value.boardId && !value.stageId && !value.markWon && !value.markLost && !value.createActivity) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one action must be configured' });
  }
});

export const ChatwootWebhookNormalizedSchema = z.object({
  eventType: z.string().trim().min(1),
  eventId: z.string().trim().nullable().optional(),
  conversationId: z.coerce.number().int().positive().nullable().optional(),
  inboxId: z.coerce.number().int().positive().nullable().optional(),
  chatwootContactId: z.coerce.number().int().positive().nullable().optional(),
  sourceId: z.string().trim().nullable().optional(),
  contactName: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  labels: z.array(z.string().trim().min(1)).default([]),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
  transcriptText: z.string().default(''),
  transcriptMessageCount: z.number().int().nonnegative().default(0),
  firstMessageAt: z.string().trim().nullable().optional(),
  resolvedAt: z.string().trim().nullable().optional(),
  rawPayload: z.record(z.string(), z.unknown()),
}).strict();

export type ChatwootIntegrationUpsertInput = z.infer<typeof ChatwootIntegrationUpsertSchema>;
export type ChatwootLabelMappingInput = z.infer<typeof ChatwootLabelMappingSchema>;
export type ChatwootWebhookNormalized = z.infer<typeof ChatwootWebhookNormalizedSchema>;
