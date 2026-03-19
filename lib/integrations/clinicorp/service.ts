import { createHash } from 'node:crypto';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { normalizeEmail, normalizePhone, normalizeText } from '@/lib/public-api/sanitize';
import { decryptSecret, encryptSecret } from '@/lib/integrations/secrets';
import {
  createClinicorpPurchaseOrder,
  fetchClinicorpAppointments,
  fetchClinicorpBusinesses,
  fetchClinicorpEstimates,
  fetchClinicorpFinancialSummary,
  fetchClinicorpPatients,
  fetchClinicorpProfessionals,
  pushClinicorpLead,
  runClinicorpHealthcheck,
} from './client';
import type {
  ClinicorpIntegrationUpsertInput,
  ClinicorpLeadPushInput,
  ClinicorpPurchaseOrderInput,
  ClinicorpSyncRequestInput,
} from './schemas';
import type { ClinicorpDiagnosticItem, ClinicorpSyncType } from '@/types';

function nowIso() {
  return new Date().toISOString();
}

function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function toArray<T = Record<string, unknown>>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    for (const key of ['data', 'items', 'result', 'results', 'appointments', 'estimates', 'businesses', 'professionals', 'patients']) {
      if (Array.isArray(candidate[key])) return candidate[key] as T[];
    }
  }
  return [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function mapIntegration(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    baseUrl: row.base_url,
    apiUsername: row.api_username,
    subscriberId: row.subscriber_id,
    active: Boolean(row.active),
    syncBusinesses: Boolean(row.sync_businesses),
    syncProfessionals: Boolean(row.sync_professionals),
    syncPatients: Boolean(row.sync_patients),
    syncAppointments: Boolean(row.sync_appointments),
    syncEstimates: Boolean(row.sync_estimates),
    syncFinancialSummary: Boolean(row.sync_financial_summary),
    enablePurchaseOrders: Boolean(row.enable_purchase_orders),
    hasApiToken: Boolean(row.api_token_ciphertext),
    lastHealthcheckAt: row.last_healthcheck_at ?? null,
    lastHealthcheckStatus: row.last_healthcheck_status ?? null,
    lastHealthcheckError: row.last_healthcheck_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSyncRun(row: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    integrationId: row.integration_id,
    syncType: row.sync_type,
    status: row.status,
    requestedBy: row.requested_by ?? null,
    dateFrom: row.date_from ?? null,
    dateTo: row.date_to ?? null,
    businessId: row.business_id ?? null,
    payload: toRecord(row.payload),
    resultSummary: toRecord(row.result_summary),
    errorMessage: row.error_message ?? null,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutboundLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    integrationId: row.integration_id,
    actionType: row.action_type,
    dedupeKey: row.dedupe_key,
    status: row.status,
    relatedContactId: row.related_contact_id ?? null,
    relatedDealId: row.related_deal_id ?? null,
    requestedBy: row.requested_by ?? null,
    requestPayload: toRecord(row.request_payload),
    responsePayload: toRecord(row.response_payload),
    errorMessage: row.error_message ?? null,
    processedAt: row.processed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getIntegrationRow(organizationId: string) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('clinicorp_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getIntegrationCredentials(organizationId: string) {
  const row = await getIntegrationRow(organizationId);
  if (!row) throw new Error('Clinicorp integration not configured');
  return {
    row,
    credentials: {
      baseUrl: String(row.base_url),
      apiUsername: String(row.api_username),
      apiToken: decryptSecret(String(row.api_token_ciphertext)),
      subscriberId: String(row.subscriber_id),
    },
  };
}

async function insertSyncRun(
  organizationId: string,
  integrationId: string,
  requestedBy: string,
  input: ClinicorpSyncRequestInput,
  syncType: ClinicorpSyncType
) {
  const admin = createStaticAdminClient();
  const { data, error } = await admin
    .from('clinicorp_sync_runs')
    .insert({
      organization_id: organizationId,
      integration_id: integrationId,
      sync_type: syncType,
      status: 'processing',
      requested_by: requestedBy,
      date_from: input.dateFrom ?? null,
      date_to: input.dateTo ?? null,
      business_id: input.businessId ?? null,
      payload: {
        syncTypes: input.syncTypes,
        contactIds: input.contactIds,
        includeCanceled: input.includeCanceled,
      },
      started_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function completeSyncRun(syncRunId: string, status: 'completed' | 'failed', resultSummary: Record<string, unknown>, errorMessage?: string) {
  const admin = createStaticAdminClient();
  const { error } = await admin
    .from('clinicorp_sync_runs')
    .update({
      status,
      result_summary: resultSummary,
      error_message: errorMessage ?? null,
      finished_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', syncRunId);

  if (error) throw error;
}

async function persistBusinessSnapshots(organizationId: string, integrationId: string, subscriberId: string, payload: unknown[]) {
  const admin = createStaticAdminClient();
  if (!payload.length) return 0;

  const rows = payload.map((item) => {
    const record = toRecord(item);
    return {
      organization_id: organizationId,
      integration_id: integrationId,
      clinicorp_business_id: firstString(record, ['id', 'Id', 'businessId', 'BusinessId', 'clinicId', 'ClinicId']) ?? stableHash(record),
      clinicorp_subscriber_id: firstString(record, ['subscriber_id', 'subscriberId']) ?? subscriberId,
      name: firstString(record, ['name', 'Name', 'businessName', 'BusinessName', 'fantasyName']) ?? null,
      payload: record,
      updated_at: nowIso(),
      created_at: nowIso(),
    };
  });

  const { error } = await admin
    .from('clinicorp_business_links')
    .upsert(rows, { onConflict: 'organization_id,integration_id,clinicorp_business_id' });

  if (error) throw error;
  return rows.length;
}

async function persistProfessionalSnapshots(organizationId: string, integrationId: string, payload: unknown[]) {
  const admin = createStaticAdminClient();
  if (!payload.length) return 0;

  const rows = payload.map((item) => {
    const record = toRecord(item);
    return {
      organization_id: organizationId,
      integration_id: integrationId,
      clinicorp_professional_id: firstString(record, ['id', 'Id', 'professionalId', 'ProfessionalId', 'userId']) ?? stableHash(record),
      name: firstString(record, ['name', 'Name', 'professionalName', 'ProfessionalName']) ?? null,
      payload: record,
      updated_at: nowIso(),
      created_at: nowIso(),
    };
  });

  const { error } = await admin
    .from('clinicorp_professional_snapshots')
    .upsert(rows, { onConflict: 'organization_id,integration_id,clinicorp_professional_id' });

  if (error) throw error;
  return rows.length;
}

async function persistDataSnapshots(args: {
  organizationId: string;
  integrationId: string;
  dataType: 'appointments' | 'estimates' | 'financial_summary';
  items: unknown[];
  dateFrom?: string | null;
  dateTo?: string | null;
  businessId?: string | null;
}) {
  const admin = createStaticAdminClient();
  if (!args.items.length) return 0;

  const rows = args.items.map((item, index) => {
    const record = toRecord(item);
    const externalEntityId = firstString(record, ['id', 'Id', 'appointmentId', 'AppointmentId', 'estimateId', 'EstimateId']);
    const snapshotKey = externalEntityId
      ? externalEntityId
      : `${args.dataType}:${args.dateFrom ?? 'na'}:${args.dateTo ?? 'na'}:${args.businessId ?? 'all'}:${index}:${stableHash(record)}`;

    return {
      organization_id: args.organizationId,
      integration_id: args.integrationId,
      data_type: args.dataType,
      snapshot_key: snapshotKey,
      external_entity_id: externalEntityId ?? null,
      business_id: args.businessId ?? null,
      reference_from: args.dateFrom ?? null,
      reference_to: args.dateTo ?? null,
      payload: record,
      captured_at: nowIso(),
      updated_at: nowIso(),
      created_at: nowIso(),
    };
  });

  const { error } = await admin
    .from('clinicorp_data_snapshots')
    .upsert(rows, { onConflict: 'organization_id,integration_id,data_type,snapshot_key' });

  if (error) throw error;
  return rows.length;
}

async function syncTargetedPatients(
  organizationId: string,
  integrationId: string,
  credentials: { baseUrl: string; apiUsername: string; apiToken: string; subscriberId: string },
  contactIds: string[]
) {
  if (!contactIds.length) return { requested: 0, matched: 0 };

  const admin = createStaticAdminClient();
  const { data: contacts, error } = await admin
    .from('contacts')
    .select('id,email,phone')
    .eq('organization_id', organizationId)
    .in('id', contactIds);

  if (error) throw error;

  let matched = 0;
  for (const contact of contacts ?? []) {
    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone);
    if (!email && !phone) continue;

    const payload = await fetchClinicorpPatients({
      ...credentials,
      email: email ?? undefined,
      phone: phone ?? undefined,
    });

    const matches = toArray(payload);
    if (!matches.length) continue;

    const record = toRecord(matches[0]);
    const patientId = firstString(record, ['id', 'Id', 'patientId', 'PatientId']);
    if (!patientId) continue;

    const { error: upsertError } = await admin
      .from('clinicorp_patient_links')
      .upsert({
        organization_id: organizationId,
        integration_id: integrationId,
        contact_id: contact.id,
        clinicorp_patient_id: patientId,
        matched_by: email ? 'email' : 'phone',
        email_normalized: email,
        phone_normalized: phone,
        document_normalized: firstString(record, ['cpf', 'CPF', 'OtherDocumentId']) ?? null,
        payload: record,
        updated_at: nowIso(),
        created_at: nowIso(),
      }, { onConflict: 'organization_id,integration_id,clinicorp_patient_id' });

    if (upsertError) throw upsertError;
    matched += 1;
  }

  return {
    requested: (contacts ?? []).length,
    matched,
  };
}

async function insertOutboundLog(args: {
  organizationId: string;
  integrationId: string;
  requestedBy: string;
  actionType: 'push_lead' | 'purchase_order';
  dedupeKey: string;
  relatedContactId?: string | null;
  relatedDealId?: string | null;
  requestPayload: Record<string, unknown>;
}) {
  const admin = createStaticAdminClient();
  const existing = await admin
    .from('clinicorp_outbound_logs')
    .select('*')
    .eq('organization_id', args.organizationId)
    .eq('integration_id', args.integrationId)
    .eq('action_type', args.actionType)
    .eq('dedupe_key', args.dedupeKey)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data, error } = await admin
    .from('clinicorp_outbound_logs')
    .insert({
      organization_id: args.organizationId,
      integration_id: args.integrationId,
      action_type: args.actionType,
      dedupe_key: args.dedupeKey,
      status: 'processing',
      related_contact_id: args.relatedContactId ?? null,
      related_deal_id: args.relatedDealId ?? null,
      requested_by: args.requestedBy,
      request_payload: args.requestPayload,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function completeOutboundLog(id: string, status: 'completed' | 'failed', responsePayload: Record<string, unknown>, errorMessage?: string) {
  const admin = createStaticAdminClient();
  const { error } = await admin
    .from('clinicorp_outbound_logs')
    .update({
      status,
      response_payload: responsePayload,
      error_message: errorMessage ?? null,
      processed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getClinicorpIntegrationForOrg(organizationId: string) {
  const row = await getIntegrationRow(organizationId);
  return mapIntegration(row);
}

export async function upsertClinicorpIntegration(organizationId: string, input: ClinicorpIntegrationUpsertInput) {
  const admin = createStaticAdminClient();
  const existing = await getIntegrationRow(organizationId);
  const updates: Record<string, unknown> = {
    organization_id: organizationId,
    name: input.name,
    base_url: input.baseUrl.replace(/\/+$/, ''),
    api_username: input.apiUsername.trim(),
    subscriber_id: input.subscriberId.trim(),
    active: input.active,
    sync_businesses: input.syncBusinesses,
    sync_professionals: input.syncProfessionals,
    sync_patients: input.syncPatients,
    sync_appointments: input.syncAppointments,
    sync_estimates: input.syncEstimates,
    sync_financial_summary: input.syncFinancialSummary,
    enable_purchase_orders: input.enablePurchaseOrders,
    updated_at: nowIso(),
  };

  if (!existing) {
    if (!input.apiToken) {
      throw new Error('apiToken is required to create a Clinicorp integration');
    }
    updates.api_token_ciphertext = encryptSecret(input.apiToken);
    updates.created_at = nowIso();
  } else if (input.apiToken) {
    updates.api_token_ciphertext = encryptSecret(input.apiToken);
  }

  const { data, error } = await admin
    .from('clinicorp_integrations')
    .upsert(updates, { onConflict: 'organization_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapIntegration(data);
}

export async function healthcheckClinicorpIntegration(organizationId: string) {
  const admin = createStaticAdminClient();
  const { row, credentials } = await getIntegrationCredentials(organizationId);

  try {
    const result = await runClinicorpHealthcheck(credentials);
    await admin
      .from('clinicorp_integrations')
      .update({
        last_healthcheck_at: nowIso(),
        last_healthcheck_status: 'ok',
        last_healthcheck_error: null,
        updated_at: nowIso(),
      })
      .eq('id', row.id);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Clinicorp error';
    const status = /401|403|unauthorized|forbidden/i.test(message) ? 'unauthorized' : 'failed';
    await admin
      .from('clinicorp_integrations')
      .update({
        last_healthcheck_at: nowIso(),
        last_healthcheck_status: status,
        last_healthcheck_error: message,
        updated_at: nowIso(),
      })
      .eq('id', row.id);

    throw error;
  }
}

export async function runClinicorpSyncForOrg(organizationId: string, requestedBy: string, input: ClinicorpSyncRequestInput) {
  const { row, credentials } = await getIntegrationCredentials(organizationId);
  const syncType: ClinicorpSyncType = input.syncTypes.includes('full') ? 'full' : input.syncTypes[0];
  const syncRun = await insertSyncRun(organizationId, String(row.id), requestedBy, input, syncType);
  const summary: Record<string, unknown> = {};

  try {
    if (input.syncTypes.includes('full') || input.syncTypes.includes('businesses')) {
      const businesses = toArray(await fetchClinicorpBusinesses(credentials));
      summary.businesses = await persistBusinessSnapshots(organizationId, String(row.id), credentials.subscriberId, businesses);
    }

    if (input.syncTypes.includes('full') || input.syncTypes.includes('professionals')) {
      const professionals = toArray(await fetchClinicorpProfessionals(credentials));
      summary.professionals = await persistProfessionalSnapshots(organizationId, String(row.id), professionals);
    }

    if (input.syncTypes.includes('patients') || (input.syncTypes.includes('full') && input.contactIds.length > 0)) {
      summary.patients = await syncTargetedPatients(organizationId, String(row.id), credentials, input.contactIds);
    }

    if ((input.syncTypes.includes('full') || input.syncTypes.includes('appointments')) && input.dateFrom && input.dateTo && input.businessId) {
      const appointments = toArray(await fetchClinicorpAppointments({
        ...credentials,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        businessId: input.businessId,
        includeCanceled: input.includeCanceled,
      }));
      summary.appointments = await persistDataSnapshots({
        organizationId,
        integrationId: String(row.id),
        dataType: 'appointments',
        items: appointments,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        businessId: input.businessId,
      });
    }

    if ((input.syncTypes.includes('full') || input.syncTypes.includes('estimates')) && input.dateFrom && input.dateTo) {
      const estimates = toArray(await fetchClinicorpEstimates({
        ...credentials,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        clinicId: input.businessId ?? undefined,
      }));
      summary.estimates = await persistDataSnapshots({
        organizationId,
        integrationId: String(row.id),
        dataType: 'estimates',
        items: estimates,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        businessId: input.businessId ?? null,
      });
    }

    if ((input.syncTypes.includes('full') || input.syncTypes.includes('financial_summary')) && input.dateFrom && input.dateTo) {
      const financialSummary = await fetchClinicorpFinancialSummary({
        ...credentials,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        businessId: input.businessId ?? undefined,
      });
      summary.financialSummary = await persistDataSnapshots({
        organizationId,
        integrationId: String(row.id),
        dataType: 'financial_summary',
        items: [toRecord(financialSummary)],
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        businessId: input.businessId ?? null,
      });
    }

    await completeSyncRun(String(syncRun.id), 'completed', summary);
    return { ok: true as const, syncRun: mapSyncRun(syncRun), summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clinicorp sync failed';
    await completeSyncRun(String(syncRun.id), 'failed', summary, message);
    throw error;
  }
}

export async function pushLeadToClinicorp(organizationId: string, requestedBy: string, input: ClinicorpLeadPushInput) {
  const { row, credentials } = await getIntegrationCredentials(organizationId);
  const requestPayload = {
    subscriber_id: credentials.subscriberId,
    Name: input.name,
    Email: input.email,
    Phone: input.phone,
    BoardName: input.boardName ?? null,
    Notes: input.notes ?? '',
  };
  const dedupeKey = stableHash(requestPayload);
  const outbound = await insertOutboundLog({
    organizationId,
    integrationId: String(row.id),
    requestedBy,
    actionType: 'push_lead',
    dedupeKey,
    relatedContactId: input.contactId ?? null,
    relatedDealId: input.dealId ?? null,
    requestPayload,
  });

  if (outbound.status === 'completed') {
    return { ok: true as const, reused: true, log: mapOutboundLog(outbound) };
  }

  try {
    const responsePayload = toRecord(await pushClinicorpLead({
      ...credentials,
      name: input.name,
      email: input.email,
      phone: input.phone,
      boardName: input.boardName,
      notes: input.notes,
    }));
    await completeOutboundLog(String(outbound.id), 'completed', responsePayload);
    return { ok: true as const, reused: false, responsePayload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to push lead to Clinicorp';
    await completeOutboundLog(String(outbound.id), 'failed', {}, message);
    throw error;
  }
}

export async function createClinicorpPurchaseOrderForOrg(organizationId: string, requestedBy: string, input: ClinicorpPurchaseOrderInput) {
  const { row, credentials } = await getIntegrationCredentials(organizationId);
  const requestPayload = {
    clinic: input.clinic,
    orderCode: input.orderCode,
    orderDate: input.orderDate,
    products: input.products,
  };
  const dedupeKey = stableHash(requestPayload);
  const outbound = await insertOutboundLog({
    organizationId,
    integrationId: String(row.id),
    requestedBy,
    actionType: 'purchase_order',
    dedupeKey,
    relatedContactId: input.contactId ?? null,
    relatedDealId: input.dealId ?? null,
    requestPayload,
  });

  if (outbound.status === 'completed') {
    return { ok: true as const, reused: true, log: mapOutboundLog(outbound) };
  }

  try {
    const responsePayload = toRecord(await createClinicorpPurchaseOrder({
      ...credentials,
      clinic: input.clinic,
      orderCode: input.orderCode,
      orderDate: input.orderDate,
      products: input.products,
    }));
    await completeOutboundLog(String(outbound.id), 'completed', responsePayload);
    return { ok: true as const, reused: false, responsePayload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Clinicorp purchase order';
    await completeOutboundLog(String(outbound.id), 'failed', {}, message);
    throw error;
  }
}

export async function listClinicorpDiagnostics(organizationId: string, limit = 50): Promise<ClinicorpDiagnosticItem[]> {
  const admin = createStaticAdminClient();
  const [syncRuns, outboundLogs] = await Promise.all([
    admin
      .from('clinicorp_sync_runs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('clinicorp_outbound_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (syncRuns.error) throw syncRuns.error;
  if (outboundLogs.error) throw outboundLogs.error;

  return [
    ...(syncRuns.data ?? []).map((row) => ({ kind: 'sync' as const, ...mapSyncRun(row) })),
    ...(outboundLogs.data ?? []).map((row) => ({ kind: 'outbound' as const, ...mapOutboundLog(row) })),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
}
