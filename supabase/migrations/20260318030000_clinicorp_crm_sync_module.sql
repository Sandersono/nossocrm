-- Clinicorp CRM Sync Module
-- Purpose:
-- - Persist Clinicorp integration settings per organization
-- - Sync operational data snapshots into the CRM
-- - Audit outbound actions like lead push and purchase orders

CREATE TABLE IF NOT EXISTS public.clinicorp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Clinicorp',
  base_url TEXT NOT NULL DEFAULT 'https://api.clinicorp.com/rest/v1',
  api_username TEXT NOT NULL,
  api_token_ciphertext TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sync_businesses BOOLEAN NOT NULL DEFAULT true,
  sync_professionals BOOLEAN NOT NULL DEFAULT true,
  sync_patients BOOLEAN NOT NULL DEFAULT false,
  sync_appointments BOOLEAN NOT NULL DEFAULT true,
  sync_estimates BOOLEAN NOT NULL DEFAULT true,
  sync_financial_summary BOOLEAN NOT NULL DEFAULT true,
  enable_purchase_orders BOOLEAN NOT NULL DEFAULT false,
  last_healthcheck_at TIMESTAMPTZ,
  last_healthcheck_status TEXT,
  last_healthcheck_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id)
);

ALTER TABLE public.clinicorp_integrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.clinicorp_business_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  clinicorp_business_id TEXT NOT NULL,
  clinicorp_subscriber_id TEXT,
  name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, clinicorp_business_id)
);

ALTER TABLE public.clinicorp_business_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.clinicorp_professional_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  clinicorp_professional_id TEXT NOT NULL,
  name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, clinicorp_professional_id)
);

ALTER TABLE public.clinicorp_professional_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.clinicorp_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  clinicorp_patient_id TEXT NOT NULL,
  matched_by TEXT,
  email_normalized TEXT,
  phone_normalized TEXT,
  document_normalized TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, clinicorp_patient_id)
);

ALTER TABLE public.clinicorp_patient_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinicorp_patient_links_contact
  ON public.clinicorp_patient_links (organization_id, contact_id);

CREATE TABLE IF NOT EXISTS public.clinicorp_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_from DATE,
  date_to DATE,
  business_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clinicorp_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinicorp_sync_runs_created
  ON public.clinicorp_sync_runs (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clinicorp_data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  snapshot_key TEXT NOT NULL,
  external_entity_id TEXT,
  business_id TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  reference_from DATE,
  reference_to DATE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, data_type, snapshot_key)
);

ALTER TABLE public.clinicorp_data_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinicorp_data_snapshots_lookup
  ON public.clinicorp_data_snapshots (organization_id, data_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clinicorp_outbound_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.clinicorp_integrations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  related_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  related_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, integration_id, action_type, dedupe_key)
);

ALTER TABLE public.clinicorp_outbound_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinicorp_outbound_logs_created
  ON public.clinicorp_outbound_logs (organization_id, created_at DESC);

DROP POLICY IF EXISTS "Admins can manage clinicorp integrations" ON public.clinicorp_integrations;
CREATE POLICY "Admins can manage clinicorp integrations"
  ON public.clinicorp_integrations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_integrations.organization_id
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_integrations.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Org members can view clinicorp business links" ON public.clinicorp_business_links;
CREATE POLICY "Org members can view clinicorp business links"
  ON public.clinicorp_business_links
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_business_links.organization_id
    )
  );

DROP POLICY IF EXISTS "Org members can view clinicorp professionals" ON public.clinicorp_professional_snapshots;
CREATE POLICY "Org members can view clinicorp professionals"
  ON public.clinicorp_professional_snapshots
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_professional_snapshots.organization_id
    )
  );

DROP POLICY IF EXISTS "Org members can view clinicorp patient links" ON public.clinicorp_patient_links;
CREATE POLICY "Org members can view clinicorp patient links"
  ON public.clinicorp_patient_links
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_patient_links.organization_id
    )
  );

DROP POLICY IF EXISTS "Org members can view clinicorp snapshots" ON public.clinicorp_data_snapshots;
CREATE POLICY "Org members can view clinicorp snapshots"
  ON public.clinicorp_data_snapshots
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_data_snapshots.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can view clinicorp sync runs" ON public.clinicorp_sync_runs;
CREATE POLICY "Admins can view clinicorp sync runs"
  ON public.clinicorp_sync_runs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_sync_runs.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can view clinicorp outbound logs" ON public.clinicorp_outbound_logs;
CREATE POLICY "Admins can view clinicorp outbound logs"
  ON public.clinicorp_outbound_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = clinicorp_outbound_logs.organization_id
        AND role IN ('admin', 'superadmin')
    )
  );
