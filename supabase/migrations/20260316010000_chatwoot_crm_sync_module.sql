-- Chatwoot CRM Sync Module
-- Purpose:
-- - Persist integration settings per organization
-- - Map Chatwoot labels to CRM actions
-- - Audit inbound events with idempotency
-- - Store conversation snapshots and AI summaries

CREATE TABLE IF NOT EXISTS public.chatwoot_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Chatwoot',
  base_url TEXT NOT NULL,
  account_id BIGINT NOT NULL,
  api_token_ciphertext TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  summary_enabled BOOLEAN NOT NULL DEFAULT true,
  default_board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  allowed_inbox_ids BIGINT[] NOT NULL DEFAULT '{}',
  last_healthcheck_at TIMESTAMPTZ,
  last_healthcheck_status TEXT,
  last_healthcheck_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id),
  UNIQUE (webhook_token)
);

ALTER TABLE public.chatwoot_integrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chatwoot_label_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.chatwoot_integrations(id) ON DELETE CASCADE,
  inbox_id BIGINT,
  label TEXT NOT NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.board_stages(id) ON DELETE SET NULL,
  mark_won BOOLEAN NOT NULL DEFAULT false,
  mark_lost BOOLEAN NOT NULL DEFAULT false,
  create_activity BOOLEAN NOT NULL DEFAULT false,
  activity_title_template TEXT,
  require_single_open_deal BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chatwoot_label_mappings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chatwoot_label_mappings_unique
  ON public.chatwoot_label_mappings (organization_id, integration_id, COALESCE(inbox_id, -1), lower(label));

CREATE TABLE IF NOT EXISTS public.chatwoot_contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.chatwoot_integrations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  chatwoot_contact_id BIGINT NOT NULL,
  chatwoot_source_id TEXT,
  phone_e164 TEXT,
  email_normalized TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, chatwoot_contact_id)
);

ALTER TABLE public.chatwoot_contact_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chatwoot_contact_links_contact
  ON public.chatwoot_contact_links (organization_id, contact_id);

CREATE TABLE IF NOT EXISTS public.chatwoot_conversation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.chatwoot_integrations(id) ON DELETE CASCADE,
  chatwoot_conversation_id BIGINT NOT NULL,
  chatwoot_inbox_id BIGINT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  assignee_external_id BIGINT,
  first_message_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  transcript_text TEXT NOT NULL,
  transcript_message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chatwoot_conversation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chatwoot_conversation_snapshots_contact
  ON public.chatwoot_conversation_snapshots (organization_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatwoot_conversation_snapshots_deal
  ON public.chatwoot_conversation_snapshots (organization_id, deal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chatwoot_snapshots_unique_resolution
  ON public.chatwoot_conversation_snapshots (
    organization_id,
    integration_id,
    chatwoot_conversation_id,
    COALESCE(resolved_at, to_timestamp(0))
  );

CREATE TABLE IF NOT EXISTS public.chatwoot_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES public.chatwoot_conversation_snapshots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  summary_text TEXT,
  key_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_intent TEXT,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.chatwoot_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chatwoot_conversation_summaries_snapshot
  ON public.chatwoot_conversation_summaries (snapshot_id);

CREATE TABLE IF NOT EXISTS public.chatwoot_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.chatwoot_integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_fingerprint TEXT NOT NULL,
  chatwoot_event_id TEXT,
  chatwoot_conversation_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'received',
  processing_error TEXT,
  applied_rule_id UUID REFERENCES public.chatwoot_label_mappings(id) ON DELETE SET NULL,
  created_snapshot_id UUID REFERENCES public.chatwoot_conversation_snapshots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (organization_id, integration_id, event_fingerprint)
);

ALTER TABLE public.chatwoot_event_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chatwoot_event_logs_created
  ON public.chatwoot_event_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatwoot_event_logs_conversation
  ON public.chatwoot_event_logs (organization_id, chatwoot_conversation_id, created_at DESC);

DROP POLICY IF EXISTS "Admins can manage chatwoot integrations" ON public.chatwoot_integrations;
CREATE POLICY "Admins can manage chatwoot integrations"
  ON public.chatwoot_integrations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_integrations.organization_id
        AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_integrations.organization_id
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage chatwoot label mappings" ON public.chatwoot_label_mappings;
CREATE POLICY "Admins can manage chatwoot label mappings"
  ON public.chatwoot_label_mappings
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_label_mappings.organization_id
        AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_label_mappings.organization_id
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Org members can view chatwoot contact links" ON public.chatwoot_contact_links;
CREATE POLICY "Org members can view chatwoot contact links"
  ON public.chatwoot_contact_links
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_contact_links.organization_id
    )
  );

DROP POLICY IF EXISTS "Org members can view chatwoot snapshots" ON public.chatwoot_conversation_snapshots;
CREATE POLICY "Org members can view chatwoot snapshots"
  ON public.chatwoot_conversation_snapshots
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_conversation_snapshots.organization_id
    )
  );

DROP POLICY IF EXISTS "Org members can view chatwoot summaries" ON public.chatwoot_conversation_summaries;
CREATE POLICY "Org members can view chatwoot summaries"
  ON public.chatwoot_conversation_summaries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles p
      WHERE p.organization_id = chatwoot_conversation_summaries.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can view chatwoot event logs" ON public.chatwoot_event_logs;
CREATE POLICY "Admins can view chatwoot event logs"
  ON public.chatwoot_event_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = chatwoot_event_logs.organization_id
        AND role = 'admin'
    )
  );
