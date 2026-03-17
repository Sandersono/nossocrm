export type ChatwootIntegrationStatus = 'ok' | 'failed' | 'unauthorized' | 'unknown';

export interface ChatwootIntegration {
  id: string;
  organizationId: string;
  name: string;
  baseUrl: string;
  accountId: number;
  active: boolean;
  summaryEnabled: boolean;
  defaultBoardId?: string | null;
  allowedInboxIds: number[];
  hasApiToken: boolean;
  webhookToken?: string;
  lastHealthcheckAt?: string | null;
  lastHealthcheckStatus?: ChatwootIntegrationStatus | null;
  lastHealthcheckError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatwootLabelMapping {
  id: string;
  organizationId: string;
  integrationId: string;
  inboxId?: number | null;
  label: string;
  boardId?: string | null;
  stageId?: string | null;
  markWon: boolean;
  markLost: boolean;
  createActivity: boolean;
  activityTitleTemplate?: string | null;
  requireSingleOpenDeal: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatwootEventLog {
  id: string;
  organizationId: string;
  integrationId: string;
  eventType: string;
  eventFingerprint: string;
  chatwootEventId?: string | null;
  chatwootConversationId?: number | null;
  processingStatus: 'received' | 'processed' | 'ignored' | 'failed' | 'reprocessed';
  processingError?: string | null;
  appliedRuleId?: string | null;
  createdSnapshotId?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface ChatwootConversationSnapshot {
  id: string;
  organizationId: string;
  integrationId: string;
  chatwootConversationId: number;
  chatwootInboxId?: number | null;
  contactId?: string | null;
  dealId?: string | null;
  status: string;
  labels: string[];
  assigneeExternalId?: number | null;
  firstMessageAt?: string | null;
  resolvedAt?: string | null;
  transcriptText: string;
  transcriptMessageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatwootConversationSummary {
  id: string;
  organizationId: string;
  snapshotId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summaryText?: string | null;
  keyTopics: string[];
  customerIntent?: string | null;
  nextSteps: string[];
  sentiment?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface ChatwootConversationHistoryItem {
  snapshot: ChatwootConversationSnapshot;
  summary?: ChatwootConversationSummary | null;
}
