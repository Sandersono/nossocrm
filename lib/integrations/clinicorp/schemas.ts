import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const ClinicorpIntegrationUpsertSchema = z.object({
  name: z.string().trim().min(1).max(120).default('Clinicorp'),
  baseUrl: z.string().trim().url().default('https://api.clinicorp.com/rest/v1'),
  apiUsername: z.string().trim().min(1).max(200),
  apiToken: z.string().trim().min(1).max(5000).optional(),
  subscriberId: z.string().trim().min(1).max(120),
  active: z.boolean().default(true),
  syncBusinesses: z.boolean().default(true),
  syncProfessionals: z.boolean().default(true),
  syncPatients: z.boolean().default(false),
  syncAppointments: z.boolean().default(true),
  syncEstimates: z.boolean().default(true),
  syncFinancialSummary: z.boolean().default(true),
  enablePurchaseOrders: z.boolean().default(false),
}).strict();

export const ClinicorpSyncRequestSchema = z.object({
  syncTypes: z.array(z.enum([
    'full',
    'businesses',
    'professionals',
    'patients',
    'appointments',
    'estimates',
    'financial_summary',
  ])).min(1),
  dateFrom: isoDateSchema.nullable().optional(),
  dateTo: isoDateSchema.nullable().optional(),
  businessId: z.string().trim().min(1).max(120).nullable().optional(),
  contactIds: z.array(z.string().uuid()).max(200).default([]),
  includeCanceled: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  const needsWindow = value.syncTypes.some((type) => ['appointments', 'estimates', 'financial_summary', 'full'].includes(type));
  if (needsWindow && (!value.dateFrom || !value.dateTo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dateFrom and dateTo are required for dated sync operations' });
  }
  const needsBusinessId = value.syncTypes.some((type) => ['appointments', 'full'].includes(type));
  if (needsBusinessId && !value.businessId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'businessId is required for appointment sync' });
  }
});

export const ClinicorpLeadPushSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(40),
  boardName: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
}).strict();

export const ClinicorpPurchaseOrderSchema = z.object({
  clinic: z.string().trim().min(1).max(32),
  orderCode: z.string().trim().min(1).max(120),
  orderDate: isoDateSchema,
  products: z.array(z.object({
    code: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).nullable().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unitOfMeasurement: z.enum(['UN', 'CT', 'CX', 'PT', 'RL', 'ML', 'SR', 'DS', 'UI', 'FA', 'G', 'AP', 'US', 'F']),
    expirationDate: isoDateSchema.nullable().optional(),
    lot: z.string().trim().max(120).nullable().optional(),
    brand: z.string().trim().max(160).nullable().optional(),
    supplier: z.string().trim().max(160).nullable().optional(),
    storageLocation: z.string().trim().max(160).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })).min(1).max(200),
  contactId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
}).strict();

export type ClinicorpIntegrationUpsertInput = z.infer<typeof ClinicorpIntegrationUpsertSchema>;
export type ClinicorpSyncRequestInput = z.infer<typeof ClinicorpSyncRequestSchema>;
export type ClinicorpLeadPushInput = z.infer<typeof ClinicorpLeadPushSchema>;
export type ClinicorpPurchaseOrderInput = z.infer<typeof ClinicorpPurchaseOrderSchema>;
