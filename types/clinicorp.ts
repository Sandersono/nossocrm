export type ClinicorpIntegrationStatus = 'ok' | 'failed' | 'unauthorized' | 'unknown';

export type ClinicorpSyncType =
  | 'full'
  | 'businesses'
  | 'professionals'
  | 'patients'
  | 'appointments'
  | 'estimates'
  | 'financial_summary';

export interface ClinicorpIntegration {
  id: string;
  organizationId: string;
  name: string;
  baseUrl: string;
  apiUsername: string;
  subscriberId: string;
  active: boolean;
  syncBusinesses: boolean;
  syncProfessionals: boolean;
  syncPatients: boolean;
  syncAppointments: boolean;
  syncEstimates: boolean;
  syncFinancialSummary: boolean;
  enablePurchaseOrders: boolean;
  hasApiToken: boolean;
  lastHealthcheckAt?: string | null;
  lastHealthcheckStatus?: ClinicorpIntegrationStatus | null;
  lastHealthcheckError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicorpSyncRun {
  id: string;
  organizationId: string;
  integrationId: string;
  syncType: ClinicorpSyncType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reprocessed';
  requestedBy?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  businessId?: string | null;
  payload: Record<string, unknown>;
  resultSummary: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicorpOutboundLog {
  id: string;
  organizationId: string;
  integrationId: string;
  actionType: 'push_lead' | 'purchase_order';
  dedupeKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reprocessed';
  relatedContactId?: string | null;
  relatedDealId?: string | null;
  requestedBy?: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  errorMessage?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClinicorpDiagnosticItem =
  | ({ kind: 'sync' } & ClinicorpSyncRun)
  | ({ kind: 'outbound' } & ClinicorpOutboundLog);
